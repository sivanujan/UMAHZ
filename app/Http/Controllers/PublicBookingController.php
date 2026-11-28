<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\ClientIntake;
use App\Models\ClinicService;
use App\Models\Location;
use App\Models\Tenant;
use App\Services\PublicBookingAvailabilityService;
use App\Services\PublicBookingService;
use App\Support\Tenancy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class PublicBookingController extends Controller
{
    public function __construct(
        private readonly PublicBookingAvailabilityService $availability,
        private readonly PublicBookingService $bookingService,
    ) {}

    public function show(Request $request): Response|HttpResponse
    {
        $tenant = $this->resolveTenant($request);
        $settings = $tenant->bookingSettings();
        $enabled = $settings['enabled'] && $tenant->isApproved() && ! $tenant->is_manually_suspended;

        $locations = Location::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'address']);

        $services = ClinicService::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->where('bookable_online', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'discipline', 'duration_minutes', 'price_cents']);

        $practitioners = $this->availability->bookablePractitioners($tenant)
            ->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->user?->name ?? 'Practitioner',
                'profession' => $m->practitionerProfile?->professionLabel(),
                'credentials' => $m->practitionerProfile?->credentials,
            ])
            ->values();

        $response = Inertia::render('Clinic/PublicBook', [
            'clinic' => [
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'logo_url' => $tenant->logo_url,
                'brand_color' => $tenant->brand_color ?: '#6d28d9',
                'currency' => strtoupper($tenant->currency ?: 'CAD'),
                'timezone' => $tenant->timezone ?: 'UTC',
                'phone' => $tenant->phone,
            ],
            'bookingEnabled' => $enabled,
            'settings' => [
                'mode' => $settings['mode'],
                'min_notice_hours' => $settings['min_notice_hours'],
                'max_days_ahead' => $settings['max_days_ahead'],
                'allow_patient_cancellation' => $settings['allow_patient_cancellation'],
                'cancellation_notice_hours' => $settings['cancellation_notice_hours'],
                'require_intake' => $settings['require_intake'],
                'require_consent' => $settings['require_consent'],
            ],
            'locations' => $locations,
            'services' => $services,
            'practitioners' => $practitioners,
        ]);

        return $enabled
            ? $response
            : $response->toResponse($request)->setStatusCode(404);
    }

    public function slots(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);
        if (! $tenant->publicBookingEnabled() || ! $tenant->isApproved() || $tenant->is_manually_suspended) {
            return response()->json(['message' => 'Online booking is not available.'], 404);
        }

        $data = $request->validate([
            'service_id' => ['required', 'uuid'],
            'date' => ['required', 'date_format:Y-m-d'],
            'location_id' => ['nullable', 'uuid'],
            'staff_membership_id' => ['nullable', 'uuid'],
        ]);

        $service = ClinicService::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->where('bookable_online', true)
            ->findOrFail($data['service_id']);

        return response()->json(
            $this->availability->availableSlots(
                $tenant,
                $service,
                $data['location_id'] ?? null,
                $data['staff_membership_id'] ?? null,
                $data['date']
            )
        );
    }

    public function store(Request $request): RedirectResponse
    {
        $tenant = $this->resolveTenant($request);
        if (! $tenant->publicBookingEnabled() || ! $tenant->isApproved() || $tenant->is_manually_suspended) {
            abort(404);
        }

        // Honeypot field — bots fill hidden 'website' input.
        if (filled($request->input('website'))) {
            abort(422, 'Invalid submission.');
        }

        $data = $request->validate([
            'service_id' => ['required', 'uuid'],
            'location_id' => ['nullable', 'uuid'],
            'staff_membership_id' => ['nullable', 'uuid'],
            'starts_at' => ['required', 'date_format:Y-m-d H:i'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $result = $this->bookingService->bookPublic($tenant, $data);

        return redirect("/book/manage/{$result['manage_token']}?booked=1");
    }

    public function manage(Request $request): Response
    {
        $tenant = $this->resolveTenant($request);
        $token = (string) $request->route('token');
        $appointment = $this->resolveManageAppointment($tenant, $token);
        $settings = $tenant->bookingSettings();
        $tz = $tenant->timezone ?: 'UTC';

        $pendingIntake = ClientIntake::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('appointment_id', $appointment->id)
            ->where('status', ClientIntake::STATUS_PENDING)
            ->first(['token']);

        $canCancel = $settings['allow_patient_cancellation']
            && in_array($appointment->status, [Appointment::STATUS_CONFIRMED, Appointment::STATUS_SCHEDULED, Appointment::STATUS_REQUESTED], true)
            && now()->lte($appointment->starts_at->subHours($settings['cancellation_notice_hours']));

        return Inertia::render('Clinic/PublicBookingManage', [
            'clinic' => [
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'logo_url' => $tenant->logo_url,
                'brand_color' => $tenant->brand_color ?: '#6d28d9',
                'phone' => $tenant->phone,
            ],
            'booked' => $request->boolean('booked'),
            'statusMessage' => session('status'),
            'token' => $token,
            'appointment' => [
                'id' => $appointment->id,
                'service_name' => $appointment->service_name,
                'status' => $appointment->status,
                'starts_at_local' => $appointment->starts_at->setTimezone($tz)->format('l, F j, Y \a\t g:i A'),
                'ends_at_local' => $appointment->ends_at->setTimezone($tz)->format('g:i A'),
                'timezone' => $tz,
                'practitioner_name' => $appointment->staffMembership?->user?->name ?? 'Clinic Practitioner',
                'location_name' => $appointment->location?->name,
                'can_cancel' => $canCancel,
                'cancellation_notice_hours' => $settings['cancellation_notice_hours'],
                'ics_url' => "/book/manage/{$token}/ics",
                'intake_url' => $pendingIntake ? "/intake/{$pendingIntake->token}" : null,
            ],
        ]);
    }

    public function ics(Request $request): HttpResponse
    {
        $tenant = $this->resolveTenant($request);
        $token = (string) $request->route('token');
        $appointment = $this->resolveManageAppointment($tenant, $token);

        $uid = $appointment->id.'@'.Tenancy::centralDomain();
        $dtStart = $appointment->starts_at->utc()->format('Ymd\THis\Z');
        $dtEnd = $appointment->ends_at->utc()->format('Ymd\THis\Z');
        $summary = str_replace(["\r", "\n"], ' ', "{$appointment->service_name} at {$tenant->name}");
        $location = str_replace(["\r", "\n"], ' ', (string) ($appointment->location?->name ?? $tenant->name));

        $ics = implode("\r\n", [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//UMAHZ//Public Booking//EN',
            'BEGIN:VEVENT',
            "UID:{$uid}",
            "DTSTAMP:{$dtStart}",
            "DTSTART:{$dtStart}",
            "DTEND:{$dtEnd}",
            "SUMMARY:{$summary}",
            "LOCATION:{$location}",
            'END:VEVENT',
            'END:VCALENDAR',
            '',
        ]);

        return response($ics, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="appointment.ics"',
        ]);
    }

    public function cancel(Request $request): RedirectResponse
    {
        $tenant = $this->resolveTenant($request);
        $token = (string) $request->route('token');
        $appointment = $this->resolveManageAppointment($tenant, $token);

        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $this->bookingService->cancelByPatient($appointment, $data['reason'] ?? null);

        return back()->with('status', 'Your appointment has been cancelled.');
    }

    private function resolveTenant(Request $request): Tenant
    {
        $subdomain = Tenancy::normalize((string) $request->route('tenant'));

        return Tenant::withoutGlobalScopes()
            ->where('subdomain', $subdomain)
            ->firstOrFail();
    }

    private function resolveManageAppointment(Tenant $tenant, string $token): Appointment
    {
        return Appointment::withoutGlobalScopes()
            ->with(['staffMembership.user', 'location', 'tenant'])
            ->where('tenant_id', $tenant->id)
            ->where('public_manage_token_hash', hash('sha256', $token))
            ->firstOrFail();
    }
}
