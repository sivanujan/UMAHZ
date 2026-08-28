<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\Location;
use App\Models\StaffMembership;
use App\Scopes\TenantScope;
use App\Services\BookingService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff-internal appointment calendar for the current clinic. Every query and
 * mutation is tenant-scoped: the Appointment model's BelongsToTenant global
 * scope confines reads and route-model binding, and BookingService enforces the
 * tenant boundary on every referenced entity. Reachable by any active workspace
 * role (owner, practitioner, receptionist) via the /app staff.role gate.
 */
class AppointmentController extends Controller
{
    /** Statuses a staff member can set directly (cancellation has its own path). */
    private const SETTABLE_STATUSES = [
        Appointment::STATUS_SCHEDULED,
        Appointment::STATUS_CONFIRMED,
        Appointment::STATUS_CHECKED_IN,
        Appointment::STATUS_COMPLETED,
        Appointment::STATUS_NO_SHOW,
    ];

    public function __construct(private readonly BookingService $booking)
    {
    }

    public function index(Request $request): Response
    {
        $tenant = $this->tenant($request);
        $tz = $tenant->timezone ?: 'UTC';

        $view = $request->string('view')->toString() === 'day' ? 'day' : 'week';
        $anchor = $this->anchorDate($request->string('date')->toString(), $tz);

        [$rangeStart, $rangeEnd] = $view === 'day'
            ? [$anchor, $anchor->addDay()]
            : [$anchor->startOfWeek(CarbonImmutable::MONDAY), $anchor->startOfWeek(CarbonImmutable::MONDAY)->addWeek()];

        $rangeStartUtc = $rangeStart->utc();
        $rangeEndUtc = $rangeEnd->utc();

        $query = Appointment::query()
            ->with(['client', 'staffMembership.user', 'room'])
            // Any appointment overlapping the visible window.
            ->where('starts_at', '<', $rangeEndUtc)
            ->where('ends_at', '>', $rangeStartUtc)
            ->when($request->filled('staff_membership_id'), fn ($q) => $q->where('staff_membership_id', $request->string('staff_membership_id')))
            ->when($request->filled('location_id'), fn ($q) => $q->where('location_id', $request->string('location_id')))
            ->when($request->filled('room_id'), fn ($q) => $q->where('room_id', $request->string('room_id')))
            ->orderBy('starts_at');

        $appointments = $query->get()->map(fn (Appointment $a) => $this->present($a));

        return Inertia::render('Calendar/Index', [
            'view' => $view,
            'anchorDate' => $rangeStart->format('Y-m-d'),
            'rangeStart' => $rangeStart->format('Y-m-d'),
            'timezone' => $tz,
            'appointments' => $appointments,
            'practitioners' => $this->practitioners($tenant->id),
            'clients' => $this->clients(),
            'locations' => $this->locations(),
            'businessHours' => $tenant->business_hours ?: null,
            'statuses' => [
                Appointment::STATUS_SCHEDULED,
                Appointment::STATUS_CONFIRMED,
                Appointment::STATUS_CHECKED_IN,
                Appointment::STATUS_COMPLETED,
                Appointment::STATUS_NO_SHOW,
                Appointment::STATUS_CANCELLED,
            ],
            'filters' => [
                'staff_membership_id' => $request->string('staff_membership_id')->toString() ?: null,
                'location_id' => $request->string('location_id')->toString() ?: null,
                'room_id' => $request->string('room_id')->toString() ?: null,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateBooking($request);

        $appointment = $this->booking->book([
            'client_id' => $data['client_id'],
            'staff_membership_id' => $data['staff_membership_id'],
            'location_id' => $data['location_id'] ?? null,
            'room_id' => $data['room_id'] ?? null,
            'service_name' => $data['service_name'],
            'starts_at' => $data['date'].' '.$data['start_time'],
            'duration_minutes' => (int) $data['duration_minutes'],
            'notes' => $data['notes'] ?? null,
        ]);

        $this->audit($request, 'appointment.created', $appointment);

        return back()->with('success', 'Appointment booked.');
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        $this->authorizeAppointment($appointment);
        $data = $this->validateBooking($request);

        $this->booking->reschedule($appointment, [
            'client_id' => $data['client_id'],
            'staff_membership_id' => $data['staff_membership_id'],
            'location_id' => $data['location_id'] ?? null,
            'room_id' => $data['room_id'] ?? null,
            'service_name' => $data['service_name'],
            'starts_at' => $data['date'].' '.$data['start_time'],
            'duration_minutes' => (int) $data['duration_minutes'],
            'notes' => $data['notes'] ?? null,
        ]);

        $this->audit($request, 'appointment.updated', $appointment);

        return back()->with('success', 'Appointment updated.');
    }

    public function status(Request $request, Appointment $appointment): RedirectResponse
    {
        $this->authorizeAppointment($appointment);
        $data = $request->validate([
            'status' => ['required', Rule::in(self::SETTABLE_STATUSES)],
        ]);

        $appointment->update([
            'status' => $data['status'],
            // Re-opening a previously cancelled appointment clears the marker.
            'cancelled_at' => null,
            'cancellation_reason' => null,
        ]);

        $this->audit($request, 'appointment.status_changed', $appointment);

        return back()->with('success', 'Appointment status updated.');
    }

    public function cancel(Request $request, Appointment $appointment): RedirectResponse
    {
        $this->authorizeAppointment($appointment);
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $this->booking->cancel($appointment, $data['reason'] ?? null);
        $this->audit($request, 'appointment.cancelled', $appointment);

        return back()->with('success', 'Appointment cancelled.');
    }

    /**
     * Shared validation for booking and rescheduling. References are constrained
     * to the current tenant at the validation layer for clean errors; the
     * service enforces the same boundary as defence in depth.
     */
    private function validateBooking(Request $request): array
    {
        $tenantId = TenantScope::getTenantId();
        $scoped = fn (string $table) => Rule::exists($table, 'id')->where('tenant_id', $tenantId);

        return $request->validate([
            'client_id' => ['required', $scoped('clients')],
            'staff_membership_id' => ['required', $scoped('staff_memberships')],
            'location_id' => ['nullable', $scoped('locations')],
            'room_id' => ['nullable', $scoped('rooms')],
            'service_name' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    /**
     * Hard tenant boundary for a route-bound appointment. Implicit binding
     * resolves before the tenant context is established, so the global scope
     * cannot filter it at bind time; by the time a controller action runs the
     * tenant IS resolved, so we reject (404, never 403 — no cross-tenant
     * existence disclosure) anything that isn't this clinic's.
     */
    private function authorizeAppointment(Appointment $appointment): void
    {
        abort_unless($appointment->tenant_id === TenantScope::getTenantId(), 404);
    }

    private function present(Appointment $a): array
    {
        return [
            'id' => $a->id,
            'client_id' => $a->client_id,
            'client_name' => $a->client ? trim($a->client->first_name.' '.$a->client->last_name) : '—',
            'staff_membership_id' => $a->staff_membership_id,
            'practitioner_name' => $a->staffMembership?->user?->name ?? '—',
            'location_id' => $a->location_id,
            'room_id' => $a->room_id,
            'room_name' => $a->room?->name,
            'service_name' => $a->service_name,
            'starts_at' => $a->starts_at->utc()->toIso8601String(),
            'ends_at' => $a->ends_at->utc()->toIso8601String(),
            'duration_minutes' => (int) $a->starts_at->diffInMinutes($a->ends_at),
            'status' => $a->status,
            'notes' => $a->notes,
        ];
    }

    /** Active staff who can hold appointments (owners and practitioners). */
    private function practitioners(string $tenantId): array
    {
        return StaffMembership::query()
            ->where('tenant_id', $tenantId)
            ->active()
            ->whereIn('role', [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_PRACTITIONER])
            ->with(['user', 'practitionerProfile'])
            ->get()
            ->map(fn (StaffMembership $m) => [
                'id' => $m->id,
                'name' => $m->user?->name ?? '—',
                'color' => $m->practitionerProfile?->calendar_color ?? '#2563EB',
            ])
            ->values()
            ->all();
    }

    private function clients(): array
    {
        return Client::query()
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name'])
            ->map(fn (Client $c) => [
                'id' => $c->id,
                'name' => trim($c->first_name.' '.$c->last_name),
            ])
            ->all();
    }

    private function locations(): array
    {
        return Location::query()
            ->where('is_active', true)
            ->with(['rooms' => fn ($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('name')
            ->get()
            ->map(fn (Location $l) => [
                'id' => $l->id,
                'name' => $l->name,
                'rooms' => $l->rooms->map(fn ($r) => ['id' => $r->id, 'name' => $r->name])->all(),
            ])
            ->all();
    }

    private function anchorDate(string $date, string $tz): CarbonImmutable
    {
        try {
            return CarbonImmutable::createFromFormat('Y-m-d', $date, $tz)->startOfDay();
        } catch (\Throwable) {
            return CarbonImmutable::now($tz)->startOfDay();
        }
    }

    private function tenant($request)
    {
        return $request->attributes->get('staffMembership')?->tenant
            ?? \App\Models\Tenant::findOrFail(TenantScope::getTenantId());
    }

    private function audit(Request $request, string $action, Appointment $appointment): void
    {
        AuditEvent::create([
            'tenant_id' => TenantScope::getTenantId(),
            'user_id' => $request->user()->id,
            'action' => $action,
            'resource_type' => Appointment::class,
            'resource_id' => $appointment->id,
            'ip_address' => $request->ip(),
        ]);
    }
}
