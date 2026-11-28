<?php

namespace App\Http\Controllers;

use App\Models\ClinicClosedDate;
use App\Models\ClinicService;
use App\Models\ConsentType;
use App\Models\PractitionerProfile;
use App\Models\PractitionerTimeOff;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OnlineBookingSettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $tenant = $this->currentTenant();

        $services = ClinicService::where('tenant_id', $tenant->id)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $practitioners = StaffMembership::with(['user', 'practitionerProfile'])
            ->where('tenant_id', $tenant->id)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->whereIn('role', [StaffMembership::ROLE_PRACTITIONER, StaffMembership::ROLE_CLINIC_OWNER])
            ->whereHas('practitionerProfile')
            ->get()
            ->map(fn ($m) => [
                'staff_membership_id' => $m->id,
                'name' => $m->user?->name ?? 'Practitioner',
                'profession' => $m->practitionerProfile?->professionLabel(),
                'accepts_online_booking' => (bool) ($m->practitionerProfile?->accepts_online_booking ?? true),
                'working_hours' => $m->practitionerProfile?->working_hours ?: $tenant->business_hours,
            ])
            ->values();

        $closedDates = ClinicClosedDate::where('tenant_id', $tenant->id)
            ->orderBy('date')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'date' => $d->date->format('Y-m-d'),
                'reason' => $d->reason,
            ]);

        $tz = $tenant->timezone ?: 'UTC';
        $timeOffs = PractitionerTimeOff::with('staffMembership.user')
            ->where('tenant_id', $tenant->id)
            ->orderBy('starts_at')
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'staff_membership_id' => $o->staff_membership_id,
                'practitioner_name' => $o->staffMembership?->user?->name ?? 'Practitioner',
                'starts_at_local' => $o->starts_at->setTimezone($tz)->format('Y-m-d H:i'),
                'ends_at_local' => $o->ends_at->setTimezone($tz)->format('Y-m-d H:i'),
                'reason' => $o->reason,
            ]);

        $consentTypes = ConsentType::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->get(['id', 'name']);

        return Inertia::render('Settings/OnlineBooking', [
            'bookingSettings' => $tenant->bookingSettings(),
            'businessHours' => $tenant->business_hours,
            'timezone' => $tz,
            'publicBookingUrl' => $tenant->appUrl('/book'),
            'services' => $services,
            'practitioners' => $practitioners,
            'closedDates' => $closedDates,
            'timeOffs' => $timeOffs,
            'consentTypes' => $consentTypes,
            'disciplines' => $tenant->disciplinesList(),
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant();

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'mode' => ['required', 'in:auto_confirm,request'],
            'min_notice_hours' => ['required', 'integer', 'min:0', 'max:168'],
            'max_days_ahead' => ['required', 'integer', 'min:1', 'max:365'],
            'buffer_minutes' => ['required', 'integer', 'min:0', 'max:120'],
            'allow_patient_cancellation' => ['required', 'boolean'],
            'cancellation_notice_hours' => ['required', 'integer', 'min:0', 'max:168'],
            'require_intake' => ['required', 'boolean'],
            'require_consent' => ['required', 'boolean'],
            'consent_type_id' => ['nullable', 'uuid'],
            'send_24h_reminder' => ['required', 'boolean'],
        ]);

        $tenant->update(['booking_settings' => $data]);

        return back()->with('success', 'Online booking settings updated.');
    }

    public function storeService(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'discipline' => ['nullable', 'string', 'max:100'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],
            'price_cents' => ['required', 'integer', 'min:0', 'max:10000000'],
            'buffer_minutes' => ['nullable', 'integer', 'min:0', 'max:120'],
            'bookable_online' => ['boolean'],
        ]);

        ClinicService::create([
            'tenant_id' => $tenant->id,
            'name' => $data['name'],
            'discipline' => $data['discipline'] ?? null,
            'duration_minutes' => (int) $data['duration_minutes'],
            'price_cents' => (int) $data['price_cents'],
            'buffer_minutes' => $data['buffer_minutes'] ?? null,
            'bookable_online' => (bool) ($data['bookable_online'] ?? true),
            'is_active' => true,
        ]);

        return back()->with('success', 'Service added.');
    }

    public function updateService(Request $request, ClinicService $service): RedirectResponse
    {
        $tenant = $this->currentTenant();
        abort_unless($service->tenant_id === $tenant->id, 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'discipline' => ['nullable', 'string', 'max:100'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],
            'price_cents' => ['required', 'integer', 'min:0', 'max:10000000'],
            'buffer_minutes' => ['nullable', 'integer', 'min:0', 'max:120'],
            'bookable_online' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
        ]);

        $service->update($data);

        return back()->with('success', 'Service updated.');
    }

    public function destroyService(ClinicService $service): RedirectResponse
    {
        $tenant = $this->currentTenant();
        abort_unless($service->tenant_id === $tenant->id, 404);

        $service->delete();

        return back()->with('success', 'Service removed.');
    }

    public function storeClosedDate(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant();

        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'reason' => ['nullable', 'string', 'max:200'],
        ]);

        ClinicClosedDate::updateOrCreate(
            ['tenant_id' => $tenant->id, 'date' => $data['date']],
            ['reason' => $data['reason'] ?? null]
        );

        return back()->with('success', 'Closed date saved.');
    }

    public function destroyClosedDate(ClinicClosedDate $closedDate): RedirectResponse
    {
        $tenant = $this->currentTenant();
        abort_unless($closedDate->tenant_id === $tenant->id, 404);

        $closedDate->delete();

        return back()->with('success', 'Closed date removed.');
    }

    public function storeTimeOff(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant();
        $tz = $tenant->timezone ?: 'UTC';

        $data = $request->validate([
            'staff_membership_id' => ['required', 'uuid'],
            'starts_at' => ['required', 'date_format:Y-m-d H:i'],
            'ends_at' => ['required', 'date_format:Y-m-d H:i'],
            'reason' => ['nullable', 'string', 'max:200'],
        ]);

        $membership = StaffMembership::where('tenant_id', $tenant->id)->findOrFail($data['staff_membership_id']);

        $startUtc = CarbonImmutable::createFromFormat('Y-m-d H:i', $data['starts_at'], $tz)->utc();
        $endUtc = CarbonImmutable::createFromFormat('Y-m-d H:i', $data['ends_at'], $tz)->utc();
        abort_if($endUtc->lte($startUtc), 422, 'End time must be after start time.');

        PractitionerTimeOff::create([
            'tenant_id' => $tenant->id,
            'staff_membership_id' => $membership->id,
            'starts_at' => $startUtc,
            'ends_at' => $endUtc,
            'reason' => $data['reason'] ?? null,
        ]);

        return back()->with('success', 'Time off added.');
    }

    public function destroyTimeOff(PractitionerTimeOff $timeOff): RedirectResponse
    {
        $tenant = $this->currentTenant();
        abort_unless($timeOff->tenant_id === $tenant->id, 404);

        $timeOff->delete();

        return back()->with('success', 'Time off removed.');
    }

    public function updatePractitionerSchedule(Request $request, StaffMembership $membership): RedirectResponse
    {
        $tenant = $this->currentTenant();
        abort_unless($membership->tenant_id === $tenant->id, 404);

        $data = $request->validate([
            'accepts_online_booking' => ['required', 'boolean'],
            'working_hours' => ['nullable', 'array'],
        ]);

        PractitionerProfile::where('staff_membership_id', $membership->id)->update([
            'accepts_online_booking' => (bool) $data['accepts_online_booking'],
            'working_hours' => $data['working_hours'] ?? null,
        ]);

        return back()->with('success', 'Practitioner schedule updated.');
    }

    private function currentTenant(): Tenant
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($tenantId, 403);

        return Tenant::findOrFail($tenantId);
    }
}
