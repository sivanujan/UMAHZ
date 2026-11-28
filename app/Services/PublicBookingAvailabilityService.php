<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\ClinicClosedDate;
use App\Models\ClinicService;
use App\Models\PractitionerTimeOff;
use App\Models\Room;
use App\Models\StaffMembership;
use App\Models\Tenant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class PublicBookingAvailabilityService
{
    public const SLOT_STEP_MINUTES = 15;

    /**
     * Compute bookable start times on a clinic-local date ('Y-m-d').
     *
     * @return array{
     *     date: string,
     *     timezone: string,
     *     closed_reason: ?string,
     *     slots: array<int, array{time: string, label: string, starts_at_local: string, practitioner_ids: array<int, string>}>
     * }
     */
    public function availableSlots(
        Tenant $tenant,
        ClinicService $service,
        ?string $locationId,
        ?string $staffMembershipId,
        string $localDate
    ): array {
        $tz = $tenant->timezone ?: 'UTC';
        $settings = $tenant->bookingSettings();
        $date = CarbonImmutable::createFromFormat('Y-m-d', $localDate, $tz)->startOfDay();
        $today = CarbonImmutable::now($tz)->startOfDay();
        $maxDate = $today->addDays($settings['max_days_ahead']);

        if ($date->lt($today) || $date->gt($maxDate)) {
            return ['date' => $localDate, 'timezone' => $tz, 'closed_reason' => null, 'slots' => []];
        }

        $closed = ClinicClosedDate::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereDate('date', $date->toDateString())
            ->first();

        if ($closed) {
            return [
                'date' => $localDate,
                'timezone' => $tz,
                'closed_reason' => $closed->reason ?: 'Clinic closed',
                'slots' => [],
            ];
        }

        $clinicWindow = $this->dayWindow($tenant->business_hours ?? [], $date);
        if (! $clinicWindow) {
            return ['date' => $localDate, 'timezone' => $tz, 'closed_reason' => null, 'slots' => []];
        }

        $practitioners = $this->bookablePractitioners($tenant, $staffMembershipId);
        if ($practitioners->isEmpty()) {
            return ['date' => $localDate, 'timezone' => $tz, 'closed_reason' => null, 'slots' => []];
        }

        $duration = max(5, (int) $service->duration_minutes);
        $buffer = $service->buffer_minutes !== null ? (int) $service->buffer_minutes : $settings['buffer_minutes'];
        $minStartUtc = CarbonImmutable::now('UTC')->addHours($settings['min_notice_hours']);

        $dayStartUtc = $date->utc();
        $dayEndUtc = $date->endOfDay()->utc();

        $appointments = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('status', BookingService::ACTIVE_STATUSES)
            ->where('starts_at', '<', $dayEndUtc->addMinutes($buffer + $duration))
            ->where('ends_at', '>', $dayStartUtc->subMinutes($buffer))
            ->get(['staff_membership_id', 'room_id', 'starts_at', 'ends_at']);

        $timeOffs = PractitionerTimeOff::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('staff_membership_id', $practitioners->pluck('id'))
            ->where('starts_at', '<', $dayEndUtc)
            ->where('ends_at', '>', $dayStartUtc)
            ->get(['staff_membership_id', 'starts_at', 'ends_at']);

        $rooms = $this->locationRooms($tenant, $locationId);

        $slotsByTime = [];

        foreach ($practitioners as $membership) {
            $pracHours = $membership->practitionerProfile?->working_hours;
            $pracWindow = ! empty($pracHours)
                ? $this->dayWindow($pracHours, $date)
                : $clinicWindow;

            if (! $pracWindow) {
                continue;
            }

            // Intersect clinic business hours and practitioner working hours.
            $open = $clinicWindow[0]->gt($pracWindow[0]) ? $clinicWindow[0] : $pracWindow[0];
            $close = $clinicWindow[1]->lt($pracWindow[1]) ? $clinicWindow[1] : $pracWindow[1];

            $pracAppts = $appointments->where('staff_membership_id', $membership->id);
            $pracOffs = $timeOffs->where('staff_membership_id', $membership->id);

            $cursor = $open;
            while ($cursor->addMinutes($duration)->lte($close)) {
                $slotStartUtc = $cursor->utc();
                $slotEndUtc = $slotStartUtc->addMinutes($duration);

                if ($slotStartUtc->lt($minStartUtc)) {
                    $cursor = $cursor->addMinutes(self::SLOT_STEP_MINUTES);
                    continue;
                }

                if ($this->hasTimeOff($pracOffs, $slotStartUtc, $slotEndUtc)) {
                    $cursor = $cursor->addMinutes(self::SLOT_STEP_MINUTES);
                    continue;
                }

                if ($this->hasBufferedOverlap($pracAppts, $slotStartUtc, $slotEndUtc, $buffer)) {
                    $cursor = $cursor->addMinutes(self::SLOT_STEP_MINUTES);
                    continue;
                }

                if ($rooms->isNotEmpty() && ! $this->findFreeRoomId($rooms, $appointments, $slotStartUtc, $slotEndUtc, $buffer)) {
                    $cursor = $cursor->addMinutes(self::SLOT_STEP_MINUTES);
                    continue;
                }

                $timeKey = $cursor->format('H:i');
                if (! isset($slotsByTime[$timeKey])) {
                    $slotsByTime[$timeKey] = [
                        'time' => $timeKey,
                        'label' => $cursor->format('g:i A'),
                        'starts_at_local' => $cursor->format('Y-m-d H:i'),
                        'practitioner_ids' => [],
                    ];
                }
                $slotsByTime[$timeKey]['practitioner_ids'][] = $membership->id;

                $cursor = $cursor->addMinutes(self::SLOT_STEP_MINUTES);
            }
        }

        ksort($slotsByTime);

        return [
            'date' => $localDate,
            'timezone' => $tz,
            'closed_reason' => null,
            'slots' => array_values($slotsByTime),
        ];
    }

    /**
     * Find a free active room for a specific UTC window (or null if location has no rooms).
     */
    public function findFreeRoomForWindow(
        Tenant $tenant,
        ?string $locationId,
        CarbonImmutable $startUtc,
        CarbonImmutable $endUtc,
        int $bufferMinutes
    ): ?string {
        $rooms = $this->locationRooms($tenant, $locationId);
        if ($rooms->isEmpty()) {
            return null;
        }

        $roomAppts = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('status', BookingService::ACTIVE_STATUSES)
            ->whereIn('room_id', $rooms->pluck('id'))
            ->where('starts_at', '<', $endUtc->addMinutes($bufferMinutes))
            ->where('ends_at', '>', $startUtc->subMinutes($bufferMinutes))
            ->get(['room_id', 'starts_at', 'ends_at']);

        return $this->findFreeRoomId($rooms, $roomAppts, $startUtc, $endUtc, $bufferMinutes);
    }

    public function locationHasRooms(Tenant $tenant, ?string $locationId): bool
    {
        return $this->locationRooms($tenant, $locationId)->isNotEmpty();
    }

    /**
     * Validate that a specific practitioner is available for [startUtc, endUtc]
     * against clinic hours, practitioner hours, closed dates, time off, buffer,
     * notice window, and max days ahead.
     */
    public function isPractitionerAvailableForSlot(
        Tenant $tenant,
        StaffMembership $membership,
        ClinicService $service,
        CarbonImmutable $localStart,
        CarbonImmutable $startUtc,
        CarbonImmutable $endUtc
    ): ?string {
        $settings = $tenant->bookingSettings();
        $tz = $tenant->timezone ?: 'UTC';
        $today = CarbonImmutable::now($tz)->startOfDay();

        if ($localStart->startOfDay()->lt($today) || $localStart->startOfDay()->gt($today->addDays($settings['max_days_ahead']))) {
            return 'This date is outside the clinic online booking window.';
        }

        if ($startUtc->lt(CarbonImmutable::now('UTC')->addHours($settings['min_notice_hours']))) {
            return 'Online bookings require at least '.$settings['min_notice_hours'].' hours notice.';
        }

        $closed = ClinicClosedDate::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereDate('date', $localStart->toDateString())
            ->exists();

        if ($closed) {
            return 'The clinic is closed on that date.';
        }

        $clinicWindow = $this->dayWindow($tenant->business_hours ?? [], $localStart);
        if (! $clinicWindow || $localStart->lt($clinicWindow[0]) || $localStart->addMinutes((int) $service->duration_minutes)->gt($clinicWindow[1])) {
            return 'That time is outside clinic business hours.';
        }

        $profile = $membership->practitionerProfile;
        if ($profile && ! $profile->accepts_online_booking) {
            return 'This practitioner is not accepting online bookings.';
        }

        $pracHours = $profile?->working_hours;
        if (! empty($pracHours)) {
            $pracWindow = $this->dayWindow($pracHours, $localStart);
            if (! $pracWindow || $localStart->lt($pracWindow[0]) || $localStart->addMinutes((int) $service->duration_minutes)->gt($pracWindow[1])) {
                return 'That time is outside the practitioner schedule.';
            }
        }

        $hasOff = PractitionerTimeOff::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('staff_membership_id', $membership->id)
            ->where('starts_at', '<', $endUtc)
            ->where('ends_at', '>', $startUtc)
            ->exists();

        if ($hasOff) {
            return 'The practitioner is unavailable at that time.';
        }

        return null;
    }

    /**
     * @return Collection<int, StaffMembership>
     */
    public function bookablePractitioners(Tenant $tenant, ?string $staffMembershipId = null): Collection
    {
        $query = StaffMembership::with('practitionerProfile', 'user')
            ->where('tenant_id', $tenant->id)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->whereIn('role', [StaffMembership::ROLE_PRACTITIONER, StaffMembership::ROLE_CLINIC_OWNER])
            ->whereHas('practitionerProfile', function ($q) {
                $q->where('accepts_online_booking', true);
            });

        if ($staffMembershipId) {
            $query->whereKey($staffMembershipId);
        }

        return $query->get();
    }

    /**
     * @return ?array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function dayWindow(array $hours, CarbonImmutable $date): ?array
    {
        if (empty($hours)) {
            // Default 9 AM - 5 PM Mon-Fri if clinic has not yet configured hours.
            if ($date->isWeekend()) {
                return null;
            }
            $open = $date->setTime(9, 0);
            $close = $date->setTime(17, 0);

            return [$open, $close];
        }

        $day = strtolower($date->englishDayOfWeek);
        $cfg = $hours[$day] ?? null;

        if (! is_array($cfg) || ($cfg['closed'] ?? false) || empty($cfg['open']) || empty($cfg['close'])) {
            return null;
        }

        $open = CarbonImmutable::createFromFormat('Y-m-d H:i', $date->format('Y-m-d').' '.$cfg['open'], $date->timezone);
        $close = CarbonImmutable::createFromFormat('Y-m-d H:i', $date->format('Y-m-d').' '.$cfg['close'], $date->timezone);

        if ($close->lte($open)) {
            return null;
        }

        return [$open, $close];
    }

    /**
     * @return Collection<int, Room>
     */
    private function locationRooms(Tenant $tenant, ?string $locationId): Collection
    {
        $query = Room::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true);

        if ($locationId) {
            $query->where('location_id', $locationId);
        }

        return $query->orderBy('name')->get(['id', 'location_id', 'name']);
    }

    private function hasTimeOff(Collection $timeOffs, CarbonImmutable $startUtc, CarbonImmutable $endUtc): bool
    {
        return $timeOffs->contains(
            fn ($off) => $off->starts_at->lt($endUtc) && $off->ends_at->gt($startUtc)
        );
    }

    private function hasBufferedOverlap(
        Collection $appointments,
        CarbonImmutable $startUtc,
        CarbonImmutable $endUtc,
        int $bufferMinutes
    ): bool {
        $checkStart = $startUtc->subMinutes($bufferMinutes);
        $checkEnd = $endUtc->addMinutes($bufferMinutes);

        return $appointments->contains(
            fn ($a) => $a->starts_at->lt($checkEnd) && $a->ends_at->gt($checkStart)
        );
    }

    private function findFreeRoomId(
        Collection $rooms,
        Collection $appointments,
        CarbonImmutable $startUtc,
        CarbonImmutable $endUtc,
        int $bufferMinutes
    ): ?string {
        $checkStart = $startUtc->subMinutes($bufferMinutes);
        $checkEnd = $endUtc->addMinutes($bufferMinutes);

        foreach ($rooms as $room) {
            $occupied = $appointments->contains(
                fn ($a) => $a->room_id === $room->id
                    && $a->starts_at->lt($checkEnd)
                    && $a->ends_at->gt($checkStart)
            );
            if (! $occupied) {
                return $room->id;
            }
        }

        return null;
    }
}
