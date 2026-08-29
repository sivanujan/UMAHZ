<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Server-side booking engine for staff-internal appointments.
 *
 * All appointment times are stored in UTC. Callers pass a clinic-local wall
 * time ('Y-m-d H:i') plus a duration; the service resolves the current
 * tenant's timezone to convert to UTC, so the stored instant is unambiguous
 * regardless of the operator's own timezone.
 */
class BookingService
{
    /**
     * Statuses that occupy a slot for conflict purposes. Cancelled and no-show
     * appointments free the slot.
     */
    public const ACTIVE_STATUSES = [
        Appointment::STATUS_SCHEDULED,
        Appointment::STATUS_CONFIRMED,
        Appointment::STATUS_CHECKED_IN,
        Appointment::STATUS_COMPLETED,
    ];

    /**
     * Create a new appointment after enforcing availability and conflict rules.
     *
     * @param  array{client_id:string,staff_membership_id:string,location_id:?string,room_id:?string,service_name:string,starts_at:string,duration_minutes:int,notes:?string}  $data
     */
    public function book(array $data): Appointment
    {
        $tenant = $this->currentTenant();
        $duration = (int) $data['duration_minutes'];
        [$startsAt, $endsAt, $localStart] = $this->resolveWindow($tenant, $data['starts_at'], $duration);

        $this->assertReferencesBelongToTenant($tenant, $data);
        $this->assertWithinBusinessHours($tenant, $localStart, $duration);

        return DB::transaction(function () use ($data, $startsAt, $endsAt) {
            $this->lockResources($data['staff_membership_id'], $data['room_id'] ?? null);
            $this->assertNoConflicts($data['staff_membership_id'], $data['room_id'] ?? null, $startsAt, $endsAt);

            return $this->persist([
                'client_id' => $data['client_id'],
                'staff_membership_id' => $data['staff_membership_id'],
                'location_id' => $data['location_id'] ?? null,
                'room_id' => $data['room_id'] ?? null,
                'service_name' => $data['service_name'],
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'status' => Appointment::STATUS_SCHEDULED,
                'notes' => $data['notes'] ?? null,
            ]);
        });
    }

    /**
     * Move an existing appointment to a new time (and optionally a new
     * practitioner, room, location, service or notes). The identical
     * availability and conflict checks are re-run, excluding the appointment
     * itself so it never clashes with its own current slot.
     *
     * @param  array{staff_membership_id?:string,client_id?:string,location_id?:?string,room_id?:?string,service_name?:string,starts_at:string,duration_minutes:int,notes?:?string}  $data
     */
    public function reschedule(Appointment $appointment, array $data): Appointment
    {
        $tenant = $this->currentTenant();
        $duration = (int) $data['duration_minutes'];
        [$startsAt, $endsAt, $localStart] = $this->resolveWindow($tenant, $data['starts_at'], $duration);

        // Fall back to the appointment's current values for anything not changed.
        $staffMembershipId = $data['staff_membership_id'] ?? $appointment->staff_membership_id;
        $roomId = array_key_exists('room_id', $data) ? $data['room_id'] : $appointment->room_id;
        $locationId = array_key_exists('location_id', $data) ? $data['location_id'] : $appointment->location_id;

        $this->assertReferencesBelongToTenant($tenant, [
            'staff_membership_id' => $staffMembershipId,
            'client_id' => $data['client_id'] ?? $appointment->client_id,
            'location_id' => $locationId,
            'room_id' => $roomId,
        ]);
        $this->assertWithinBusinessHours($tenant, $localStart, $duration);

        return DB::transaction(function () use ($appointment, $data, $staffMembershipId, $roomId, $locationId, $startsAt, $endsAt) {
            $this->lockResources($staffMembershipId, $roomId);
            $this->assertNoConflicts($staffMembershipId, $roomId, $startsAt, $endsAt, $appointment->id);

            return $this->guardConstraint(function () use ($appointment, $data, $staffMembershipId, $roomId, $locationId, $startsAt, $endsAt) {
                $appointment->update([
                    'staff_membership_id' => $staffMembershipId,
                    'client_id' => $data['client_id'] ?? $appointment->client_id,
                    'location_id' => $locationId,
                    'room_id' => $roomId,
                    'service_name' => $data['service_name'] ?? $appointment->service_name,
                    'starts_at' => $startsAt,
                    'ends_at' => $endsAt,
                    'notes' => array_key_exists('notes', $data) ? $data['notes'] : $appointment->notes,
                ]);

                return $appointment;
            });
        });
    }

    /**
     * Cancel an appointment. The record is kept — status becomes "cancelled"
     * and the slot is freed for re-booking — never hard-deleted.
     */
    public function cancel(Appointment $appointment, ?string $reason = null): Appointment
    {
        $appointment->update([
            'status' => Appointment::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);

        return $appointment;
    }

    /**
     * Insert the appointment, translating a raced exclusion-constraint
     * violation into the same clean validation error the pre-check would raise.
     * A protected seam so book() can be exercised under a simulated race.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    protected function persist(array $attributes): Appointment
    {
        return $this->guardConstraint(fn () => Appointment::create($attributes));
    }

    /**
     * Run a write, converting a Postgres exclusion-constraint violation (23P01)
     * into a friendly ValidationException on the clashing resource.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    private function guardConstraint(callable $write): Appointment
    {
        try {
            return $write();
        } catch (QueryException $e) {
            if (($e->errorInfo[0] ?? null) === '23P01') {
                $key = str_contains($e->getMessage(), 'appointments_no_room_overlap') ? 'room_id' : 'staff_membership_id';

                throw ValidationException::withMessages([
                    $key => 'That slot was just taken. Please pick another time.',
                ]);
            }

            throw $e;
        }
    }

    /**
     * Serialize concurrent bookings for the same practitioner / room using
     * transaction-scoped advisory locks, so two requests for the same slot are
     * evaluated one after another rather than racing. Postgres only; other
     * drivers rely on the pre-check plus their own write serialization.
     */
    private function lockResources(string $staffMembershipId, ?string $roomId): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', ['practitioner:'.$staffMembershipId]);

        if ($roomId) {
            DB::statement('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', ['room:'.$roomId]);
        }
    }

    /**
     * Convert a clinic-local wall time + duration into UTC start/end plus the
     * original clinic-local start (needed for the business-hours comparison).
     *
     * @return array{0:CarbonImmutable,1:CarbonImmutable,2:CarbonImmutable} UTC start, UTC end, local start
     */
    private function resolveWindow(Tenant $tenant, string $localStart, int $durationMinutes): array
    {
        $tz = $tenant->timezone ?: 'UTC';
        $local = CarbonImmutable::createFromFormat('Y-m-d H:i', $localStart, $tz);

        $startUtc = $local->utc();
        $endUtc = $startUtc->addMinutes($durationMinutes);

        return [$startUtc, $endUtc, $local];
    }

    /**
     * Every entity an appointment references — practitioner, client, location,
     * room — must belong to the current clinic. StaffMembership is not
     * tenant-scoped by a global scope, and foreign keys alone don't confine a
     * row to one tenant, so this is checked explicitly as a hard tenant boundary.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    private function assertReferencesBelongToTenant(Tenant $tenant, array $data): void
    {
        $references = [
            'staff_membership_id' => \App\Models\StaffMembership::class,
            'client_id' => \App\Models\Client::class,
            'location_id' => \App\Models\Location::class,
            'room_id' => \App\Models\Room::class,
        ];

        foreach ($references as $key => $model) {
            $id = $data[$key] ?? null;

            if ($id === null) {
                continue;
            }

            $belongs = $model::withoutGlobalScopes()
                ->whereKey($id)
                ->where('tenant_id', $tenant->id)
                ->exists();

            if (! $belongs) {
                throw ValidationException::withMessages([
                    $key => 'That selection is not available for this clinic.',
                ]);
            }
        }
    }

    /**
     * Reject bookings that fall outside the clinic's configured business hours
     * for that weekday (compared in clinic-local wall time). If the clinic has
     * not configured hours at all, the check is skipped rather than blocking
     * every booking.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    private function assertWithinBusinessHours(Tenant $tenant, CarbonImmutable $localStart, int $durationMinutes): void
    {
        $hours = $tenant->business_hours;

        if (empty($hours)) {
            return; // Hours not configured — do not block.
        }

        $day = strtolower($localStart->englishDayOfWeek);
        $config = $hours[$day] ?? null;

        if ($config === null || ($config['closed'] ?? false) || empty($config['open']) || empty($config['close'])) {
            throw ValidationException::withMessages([
                'starts_at' => "The clinic is closed on {$localStart->format('l')}.",
            ]);
        }

        $open = $localStart->setTimeFromTimeString($config['open']);
        $close = $localStart->setTimeFromTimeString($config['close']);
        $localEnd = $localStart->addMinutes($durationMinutes);

        if ($localStart->lt($open) || $localEnd->gt($close)) {
            throw ValidationException::withMessages([
                'starts_at' => "That time is outside the clinic's hours ({$config['open']}–{$config['close']}) on {$localStart->format('l')}.",
            ]);
        }
    }

    /**
     * Reject the booking if the practitioner or the room is already occupied by
     * an active appointment overlapping [startsAt, endsAt). Two half-open ranges
     * overlap iff existing.start < new.end AND existing.end > new.start.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    private function assertNoConflicts(string $staffMembershipId, ?string $roomId, CarbonImmutable $startsAt, CarbonImmutable $endsAt, ?string $ignoreId = null): void
    {
        $overlapping = fn ($query) => $query
            ->whereIn('status', self::ACTIVE_STATUSES)
            ->where('starts_at', '<', $endsAt)
            ->where('ends_at', '>', $startsAt)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId));

        $practitionerClash = Appointment::query()
            ->where('staff_membership_id', $staffMembershipId)
            ->tap($overlapping)
            ->exists();

        if ($practitionerClash) {
            throw ValidationException::withMessages([
                'staff_membership_id' => 'This practitioner already has an appointment during that time.',
            ]);
        }

        if ($roomId) {
            $roomClash = Appointment::query()
                ->where('room_id', $roomId)
                ->tap($overlapping)
                ->exists();

            if ($roomClash) {
                throw ValidationException::withMessages([
                    'room_id' => 'This room is already booked during that time.',
                ]);
            }
        }
    }

    private function currentTenant(): Tenant
    {
        return Tenant::findOrFail(TenantScope::getTenantId());
    }
}
