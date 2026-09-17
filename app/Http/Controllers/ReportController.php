<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Policies\ReportingPolicy;
use App\Scopes\TenantScope;
use App\Services\ReportingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        protected ReportingService $reportingService,
        protected ReportingPolicy $policy
    ) {}

    /**
     * Resolve the current tenant securely.
     */
    protected function currentTenant(Request $request): Tenant
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($tenantId, 403, 'Tenant context not set.');

        return Tenant::findOrFail($tenantId);
    }

    /**
     * Resolve common filter metadata (practitioners, locations, services).
     */
    protected function filterOptions(Tenant $tenant): array
    {
        $practitioners = StaffMembership::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('role', [StaffMembership::ROLE_PRACTITIONER, StaffMembership::ROLE_CLINIC_OWNER])
            ->with('user:id,name,email')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->user?->name ?? 'Practitioner',
                'role' => $m->role,
            ])
            ->values()
            ->all();

        $locations = Location::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->toArray();

        return [
            'practitioners' => $practitioners,
            'locations' => $locations,
        ];
    }

    /**
     * Landing / Overview redirect.
     */
    public function index(): RedirectResponse
    {
        return redirect()->route('app.reports.appointments');
    }

    /**
     * 1. APPOINTMENTS REPORT
     */
    public function appointments(Request $request): Response
    {
        abort_unless($this->policy->viewAny($request->user()), 403);

        $tenant = $this->currentTenant($request);
        $filters = $request->only(['start_date', 'end_date', 'practitioner_id', 'location_id', 'service_name']);

        $report = $this->reportingService->getAppointmentsReport($tenant, $filters);
        $options = $this->filterOptions($tenant);

        return Inertia::render('Reports/Appointments', [
            'report' => $report,
            'filters' => $filters,
            'options' => $options,
            'canViewFinancial' => $this->policy->viewFinancial($request->user()),
            'currentTab' => 'appointments',
        ]);
    }

    public function exportAppointments(Request $request): StreamedResponse
    {
        abort_unless($this->policy->export($request->user()), 403);

        $tenant = $this->currentTenant($request);
        $filters = $request->only(['start_date', 'end_date', 'practitioner_id', 'location_id', 'service_name']);

        return $this->reportingService->exportAppointmentsCsv($tenant, $filters);
    }

    /**
     * 2. REVENUE REPORT (STRICTLY OWNER-ONLY)
     */
    public function revenue(Request $request): Response
    {
        abort_unless($this->policy->viewFinancial($request->user()), 403, 'Financial reports are restricted to clinic owners.');

        $tenant = $this->currentTenant($request);
        $filters = $request->only(['start_date', 'end_date', 'practitioner_id', 'location_id', 'method']);

        $report = $this->reportingService->getRevenueReport($tenant, $filters);
        $options = $this->filterOptions($tenant);

        return Inertia::render('Reports/Revenue', [
            'report' => $report,
            'filters' => $filters,
            'options' => $options,
            'canViewFinancial' => true,
            'currentTab' => 'revenue',
        ]);
    }

    public function exportRevenue(Request $request): StreamedResponse
    {
        abort_unless($this->policy->exportFinancial($request->user()), 403, 'Financial reports export is restricted to clinic owners.');

        $tenant = $this->currentTenant($request);
        $filters = $request->only(['start_date', 'end_date', 'practitioner_id', 'location_id', 'method']);

        return $this->reportingService->exportRevenueCsv($tenant, $filters);
    }

    /**
     * 3. RETENTION REPORT
     */
    public function retention(Request $request): Response
    {
        abort_unless($this->policy->viewAny($request->user()), 403);

        $tenant = $this->currentTenant($request);
        $filters = $request->only(['start_date', 'end_date', 'practitioner_id', 'location_id']);

        $report = $this->reportingService->getRetentionReport($tenant, $filters);
        $options = $this->filterOptions($tenant);

        return Inertia::render('Reports/Retention', [
            'report' => $report,
            'filters' => $filters,
            'options' => $options,
            'canViewFinancial' => $this->policy->viewFinancial($request->user()),
            'currentTab' => 'retention',
        ]);
    }

    public function exportRetention(Request $request): StreamedResponse
    {
        abort_unless($this->policy->export($request->user()), 403);

        $tenant = $this->currentTenant($request);
        $filters = $request->only(['start_date', 'end_date', 'practitioner_id', 'location_id']);

        return $this->reportingService->exportRetentionCsv($tenant, $filters);
    }

    /**
     * 4. CAPACITY UTILIZATION REPORT
     */
    public function utilization(Request $request): Response
    {
        abort_unless($this->policy->viewAny($request->user()), 403);

        $tenant = $this->currentTenant($request);
        $filters = $request->only(['start_date', 'end_date', 'practitioner_id', 'location_id']);

        $report = $this->reportingService->getUtilizationReport($tenant, $filters);
        $options = $this->filterOptions($tenant);

        return Inertia::render('Reports/Utilization', [
            'report' => $report,
            'filters' => $filters,
            'options' => $options,
            'canViewFinancial' => $this->policy->viewFinancial($request->user()),
            'currentTab' => 'utilization',
        ]);
    }

    public function exportUtilization(Request $request): StreamedResponse
    {
        abort_unless($this->policy->export($request->user()), 403);

        $tenant = $this->currentTenant($request);
        $filters = $request->only(['start_date', 'end_date', 'practitioner_id', 'location_id']);

        return $this->reportingService->exportUtilizationCsv($tenant, $filters);
    }
}
