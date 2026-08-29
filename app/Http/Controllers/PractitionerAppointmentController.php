<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Practitioner-dedicated appointment schedule view and limited status updating.
 * Strictly queries ONLY the authenticated user's own assigned appointments
 * within the active clinic tenant.
 */
class PractitionerAppointmentController extends Controller
{
    private const SETTABLE_STATUSES = [
        Appointment::STATUS_SCHEDULED,
        Appointment::STATUS_CONFIRMED,
        Appointment::STATUS_CHECKED_IN,
        Appointment::STATUS_COMPLETED,
        Appointment::STATUS_NO_SHOW,
    ];

    public function index(Request $request): Response
    {
        $membership = $this->membership($request);
        $tenant = $this->tenant($request);
        $tz = $tenant->timezone ?: 'UTC';

        $view = $request->query('view', 'today');
        if (! in_array($view, ['today', 'week', 'upcoming'], true)) {
            $view = 'today';
        }

        $anchorDateStr = $request->query('date');
        $anchor = $this->anchorDate($anchorDateStr, $tz);
        $todayStr = CarbonImmutable::now($tz)->format('Y-m-d');

        // Query base: Strictly scoped to current tenant and current practitioner's staff membership
        $baseQuery = Appointment::query()
            ->where('tenant_id', $tenant->id)
            ->where('staff_membership_id', $membership->id)
            ->with(['client', 'location', 'room']);

        if ($view === 'today') {
            $dayStartLocal = CarbonImmutable::createFromFormat('Y-m-d', $todayStr, $tz)->startOfDay();
            $dayEndLocal = $dayStartLocal->endOfDay();

            $appointments = (clone $baseQuery)
                ->where('starts_at', '>=', $dayStartLocal->utc())
                ->where('starts_at', '<=', $dayEndLocal->utc())
                ->orderBy('starts_at')
                ->get()
                ->map(fn (Appointment $a) => $this->present($a));
        } elseif ($view === 'week') {
            $weekStartLocal = $anchor->startOfWeek(CarbonImmutable::MONDAY)->startOfDay();
            $weekEndLocal = $weekStartLocal->addWeek();

            $appointments = (clone $baseQuery)
                ->where('starts_at', '<', $weekEndLocal->utc())
                ->where('ends_at', '>', $weekStartLocal->utc())
                ->orderBy('starts_at')
                ->get()
                ->map(fn (Appointment $a) => $this->present($a));
        } else {
            // Upcoming view: all future or in-progress appointments
            $nowUtc = CarbonImmutable::now('UTC');

            $appointments = (clone $baseQuery)
                ->where('ends_at', '>=', $nowUtc)
                ->orderBy('starts_at')
                ->limit(60)
                ->get()
                ->map(fn (Appointment $a) => $this->present($a));
        }

        // Today metrics for the practitioner
        $todayStartUtc = CarbonImmutable::createFromFormat('Y-m-d', $todayStr, $tz)->startOfDay()->utc();
        $todayEndUtc = CarbonImmutable::createFromFormat('Y-m-d', $todayStr, $tz)->endOfDay()->utc();

        $todayAppointments = (clone $baseQuery)
            ->where('starts_at', '>=', $todayStartUtc)
            ->where('starts_at', '<=', $todayEndUtc)
            ->get();

        $todayCount = $todayAppointments->count();
        $completedToday = $todayAppointments->where('status', Appointment::STATUS_COMPLETED)->count();
        $checkedInToday = $todayAppointments->where('status', Appointment::STATUS_CHECKED_IN)->count();

        $weekStartStr = $anchor->startOfWeek(CarbonImmutable::MONDAY)->format('Y-m-d');

        return Inertia::render('Practitioner/Appointments', [
            'view' => $view,
            'anchorDate' => $anchor->format('Y-m-d'),
            'weekStart' => $weekStartStr,
            'todayDate' => $todayStr,
            'timezone' => $tz,
            'appointments' => $appointments,
            'stats' => [
                'todayCount' => $todayCount,
                'completedToday' => $completedToday,
                'checkedInToday' => $checkedInToday,
            ],
            'practitioner' => [
                'id' => $membership->id,
                'name' => $request->user()->name,
                'role' => $membership->role,
            ],
        ]);
    }

    /**
     * Update appointment status (Confirmed -> Checked-in -> Completed, or No-show).
     * Strictly authorized via AppointmentPolicy: practitioners can only update their own appointments.
     */
    public function updateStatus(Request $request, Appointment $appointment): RedirectResponse
    {
        Gate::authorize('updateStatus', $appointment);

        $data = $request->validate([
            'status' => ['required', Rule::in(self::SETTABLE_STATUSES)],
        ]);

        $appointment->update([
            'status' => $data['status'],
            'cancelled_at' => null,
            'cancellation_reason' => null,
        ]);

        $this->audit($request, 'appointment.status_changed', $appointment);

        return back()->with('success', 'Appointment status updated to '.ucwords(str_replace('_', ' ', $data['status'])).'.');
    }

    /**
     * Update or append clinical/session notes for this appointment.
     * Strictly authorized via AppointmentPolicy.
     */
    public function updateNotes(Request $request, Appointment $appointment): RedirectResponse
    {
        Gate::authorize('updateNotes', $appointment);

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $appointment->update([
            'notes' => $data['notes'],
        ]);

        $this->audit($request, 'appointment.notes_updated', $appointment);

        return back()->with('success', 'Appointment notes saved.');
    }

    private function present(Appointment $a): array
    {
        return [
            'id' => $a->id,
            'client_id' => $a->client_id,
            'client_name' => $a->client ? trim($a->client->first_name.' '.$a->client->last_name) : '—',
            'client_phone' => $a->client?->phone,
            'client_email' => $a->client?->email,
            'service_name' => $a->service_name,
            'starts_at' => $a->starts_at->utc()->toIso8601String(),
            'ends_at' => $a->ends_at->utc()->toIso8601String(),
            'duration_minutes' => (int) $a->starts_at->diffInMinutes($a->ends_at),
            'location_name' => $a->location?->name,
            'room_name' => $a->room?->name,
            'status' => $a->status,
            'notes' => $a->notes,
        ];
    }

    private function anchorDate(?string $date, string $tz): CarbonImmutable
    {
        try {
            return $date
                ? CarbonImmutable::createFromFormat('Y-m-d', $date, $tz)->startOfDay()
                : CarbonImmutable::now($tz)->startOfDay();
        } catch (\Throwable) {
            return CarbonImmutable::now($tz)->startOfDay();
        }
    }

    private function membership(Request $request): StaffMembership
    {
        return $request->attributes->get('staffMembership');
    }

    private function tenant(Request $request)
    {
        return $request->attributes->get('staffMembership')?->tenant
            ?? Tenant::findOrFail(TenantScope::getTenantId());
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
