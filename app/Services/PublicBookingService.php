<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\ClientIntake;
use App\Models\ClinicService;
use App\Models\IntakeFormTemplate;
use App\Models\Location;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Notifications\PublicBookingNotification;
use App\Notifications\StaffBookingAlertNotification;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PublicBookingService
{
    public function __construct(private readonly PublicBookingAvailabilityService $availability) {}

    /**
     * Book an appointment from the public /book flow with transaction-scoped
     * locking, buffered conflict checks, non-overwriting client matching,
     * optional intake link generation, and staff/patient notifications.
     *
     * @param  array{
     *   service_id: string,
     *   location_id: ?string,
     *   staff_membership_id: ?string,
     *   starts_at: string,
     *   first_name: string,
     *   last_name: string,
     *   email: string,
     *   phone: string,
     *   notes?: ?string,
     * } $data
     * @return array{appointment: Appointment, manage_token: string, intake_token: ?string}
     */
    public function bookPublic(Tenant $tenant, array $data): array
    {
        $settings = $tenant->bookingSettings();
        if (! $settings['enabled']) {
            abort(404);
        }

        $service = ClinicService::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->where('bookable_online', true)
            ->findOrFail($data['service_id']);

        $locationId = $data['location_id'] ?? null;
        if ($locationId) {
            $validLoc = Location::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->whereKey($locationId)
                ->exists();
            if (! $validLoc) {
                throw ValidationException::withMessages(['location_id' => 'Selected location is not available.']);
            }
        }

        $tz = $tenant->timezone ?: 'UTC';
        $localStart = CarbonImmutable::createFromFormat('Y-m-d H:i', $data['starts_at'], $tz);
        if (! $localStart) {
            throw ValidationException::withMessages(['starts_at' => 'Please choose a valid date and time.']);
        }

        $duration = max(5, (int) $service->duration_minutes);
        $buffer = $service->buffer_minutes !== null ? (int) $service->buffer_minutes : $settings['buffer_minutes'];
        $startUtc = $localStart->utc();
        $endUtc = $startUtc->addMinutes($duration);

        $candidates = $this->availability->bookablePractitioners($tenant, $data['staff_membership_id'] ?? null);
        if ($candidates->isEmpty()) {
            throw ValidationException::withMessages(['staff_membership_id' => 'No practitioner is available for online booking.']);
        }

        $rawManageToken = bin2hex(random_bytes(32));
        $manageTokenHash = hash('sha256', $rawManageToken);

        $appointment = DB::transaction(function () use (
            $tenant,
            $service,
            $locationId,
            $candidates,
            $data,
            $settings,
            $localStart,
            $startUtc,
            $endUtc,
            $buffer,
            $manageTokenHash
        ) {
            $chosenMembership = null;
            $chosenRoomId = null;
            $firstReason = null;

            foreach ($candidates as $candidate) {
                $reason = $this->availability->isPractitionerAvailableForSlot(
                    $tenant,
                    $candidate,
                    $service,
                    $localStart,
                    $startUtc,
                    $endUtc
                );

                if ($reason !== null) {
                    $firstReason ??= $reason;
                    continue;
                }

                $this->lockResource('practitioner:'.$candidate->id);

                $conflict = Appointment::withoutGlobalScopes()
                    ->where('tenant_id', $tenant->id)
                    ->where('staff_membership_id', $candidate->id)
                    ->whereIn('status', BookingService::ACTIVE_STATUSES)
                    ->where('starts_at', '<', $endUtc->addMinutes($buffer))
                    ->where('ends_at', '>', $startUtc->subMinutes($buffer))
                    ->exists();

                if ($conflict) {
                    $firstReason ??= 'That time was just booked, please choose another.';
                    continue;
                }

                if ($this->availability->locationHasRooms($tenant, $locationId)) {
                    $roomId = $this->availability->findFreeRoomForWindow($tenant, $locationId, $startUtc, $endUtc, $buffer);
                    if (! $roomId) {
                        $firstReason ??= 'That time was just booked, please choose another.';
                        continue;
                    }
                    $this->lockResource('room:'.$roomId);
                    $chosenRoomId = $roomId;
                }

                $chosenMembership = $candidate;
                break;
            }

            if (! $chosenMembership) {
                throw ValidationException::withMessages([
                    'starts_at' => $firstReason ?: 'That time was just booked, please choose another.',
                ]);
            }

            [$client, $contactDiff] = $this->resolveOrCreateClient($tenant, $data);

            $status = $settings['mode'] === 'auto_confirm'
                ? Appointment::STATUS_CONFIRMED
                : Appointment::STATUS_REQUESTED;

            try {
                return Appointment::create([
                    'tenant_id' => $tenant->id,
                    'client_id' => $client->id,
                    'staff_membership_id' => $chosenMembership->id,
                    'location_id' => $locationId,
                    'room_id' => $chosenRoomId,
                    'clinic_service_id' => $service->id,
                    'service_name' => $service->name,
                    'starts_at' => $startUtc,
                    'ends_at' => $endUtc,
                    'status' => $status,
                    'booking_source' => 'public',
                    'notes' => $data['notes'] ?? null,
                    'public_manage_token_hash' => $manageTokenHash,
                    'client_contact_diff' => $contactDiff ?: null,
                ]);
            } catch (QueryException $e) {
                if (($e->errorInfo[0] ?? null) === '23P01') {
                    throw ValidationException::withMessages([
                        'starts_at' => 'That time was just booked, please choose another.',
                    ]);
                }

                throw $e;
            }
        });

        $intakeToken = null;
        if ($settings['require_intake']) {
            $intakeToken = $this->ensurePendingIntake($tenant, $appointment, $service->discipline);
        }

        $this->notifyPatient(
            $appointment,
            $appointment->status === Appointment::STATUS_CONFIRMED ? 'confirmation' : 'request_received',
            $rawManageToken,
            $intakeToken
        );

        $this->notifyStaff($tenant, $appointment);

        return [
            'appointment' => $appointment->load(['client', 'staffMembership.user', 'location', 'room']),
            'manage_token' => $rawManageToken,
            'intake_token' => $intakeToken,
        ];
    }

    public function approveRequest(Appointment $appointment): Appointment
    {
        if ($appointment->status !== Appointment::STATUS_REQUESTED) {
            return $appointment;
        }

        $appointment->update(['status' => Appointment::STATUS_CONFIRMED]);
        $this->notifyPatient($appointment, 'approved');

        return $appointment;
    }

    public function declineRequest(Appointment $appointment, ?string $reason = null): Appointment
    {
        if ($appointment->status !== Appointment::STATUS_REQUESTED) {
            return $appointment;
        }

        $appointment->update([
            'status' => Appointment::STATUS_DECLINED,
            'declined_reason' => $reason,
        ]);

        $this->notifyPatient($appointment, 'declined', null, null, $reason);

        return $appointment;
    }

    public function cancelByPatient(Appointment $appointment, ?string $reason = null): Appointment
    {
        $tenant = $appointment->tenant;
        $settings = $tenant->bookingSettings();

        if (! $settings['allow_patient_cancellation']) {
            throw ValidationException::withMessages([
                'appointment' => 'Online cancellation is disabled for this clinic. Please call the clinic directly.',
            ]);
        }

        $cutoff = $appointment->starts_at->subHours($settings['cancellation_notice_hours']);
        if (now()->gt($cutoff)) {
            throw ValidationException::withMessages([
                'appointment' => "Online cancellation is only allowed at least {$settings['cancellation_notice_hours']} hours before your appointment.",
            ]);
        }

        $appointment->update([
            'status' => Appointment::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancellation_reason' => $reason ?: 'Cancelled online by patient',
        ]);

        $this->notifyPatient($appointment, 'cancelled_by_patient', null, null, $reason);

        return $appointment;
    }

    /**
     * Match existing client by lowercase email within the tenant without ever
     * overwriting saved fields. Differences are returned for staff review.
     *
     * @return array{0: Client, 1: array<string, array{saved: ?string, submitted: ?string}>}
     */
    private function resolveOrCreateClient(Tenant $tenant, array $data): array
    {
        $email = mb_strtolower(trim($data['email']));

        $existing = Client::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (! $existing) {
            $created = Client::create([
                'tenant_id' => $tenant->id,
                'first_name' => trim($data['first_name']),
                'last_name' => trim($data['last_name']),
                'email' => $email,
                'phone' => trim($data['phone']),
                'is_active' => true,
            ]);

            return [$created, []];
        }

        $diff = [];
        $checks = [
            'first_name' => trim($data['first_name']),
            'last_name' => trim($data['last_name']),
            'phone' => trim($data['phone']),
        ];

        foreach ($checks as $field => $submitted) {
            $saved = trim((string) ($existing->{$field} ?? ''));
            if ($submitted !== '' && strcasecmp($saved, $submitted) !== 0) {
                $diff[$field] = ['saved' => $saved, 'submitted' => $submitted];
            }
        }

        return [$existing, $diff];
    }

    private function ensurePendingIntake(Tenant $tenant, Appointment $appointment, ?string $discipline): ?string
    {
        $hasCompleted = ClientIntake::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('client_id', $appointment->client_id)
            ->where('status', ClientIntake::STATUS_COMPLETED)
            ->exists();

        if ($hasCompleted) {
            return null;
        }

        $template = IntakeFormTemplate::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->when($discipline, fn ($q) => $q->where('discipline', $discipline))
            ->first()
            ?? IntakeFormTemplate::withoutGlobalScopes()->where('tenant_id', $tenant->id)->first();

        if (! $template) {
            return null;
        }

        $token = Str::random(48);

        ClientIntake::create([
            'tenant_id' => $tenant->id,
            'client_id' => $appointment->client_id,
            'appointment_id' => $appointment->id,
            'intake_form_template_id' => $template->id,
            'discipline' => $template->discipline,
            'template_name' => $template->name,
            'schema_snapshot' => $template->fields ?? [],
            'status' => ClientIntake::STATUS_PENDING,
            'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
            'token' => $token,
            'expires_at' => now()->addDays(14),
        ]);

        return $token;
    }

    private function notifyPatient(
        Appointment $appointment,
        string $kind,
        ?string $rawManageToken = null,
        ?string $intakeToken = null,
        ?string $reason = null
    ): void {
        $email = $appointment->client?->email;
        if (! $email) {
            return;
        }

        Notification::route('mail', $email)
            ->notify(new PublicBookingNotification($appointment, $kind, $rawManageToken, $intakeToken, $reason));
    }

    private function notifyStaff(Tenant $tenant, Appointment $appointment): void
    {
        $recipients = StaffMembership::with('user')
            ->where('tenant_id', $tenant->id)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->where(function ($q) use ($appointment) {
                $q->whereKey($appointment->staff_membership_id)
                    ->orWhereIn('role', [StaffMembership::ROLE_RECEPTIONIST, StaffMembership::ROLE_CLINIC_OWNER]);
            })
            ->get()
            ->pluck('user')
            ->filter()
            ->unique('id');

        foreach ($recipients as $user) {
            $user->notify(new StaffBookingAlertNotification($appointment));
        }
    }

    private function lockResource(string $key): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [$key]);
    }
}
