<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Location;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Platform admin dashboard: tenants, subscriptions, support, config.
     * Scheduling/billing/appointment data below is illustrative sample data —
     * no such tables exist yet at this stage of the build.
     */
    public function admin(Request $request): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'totalTenants' => Tenant::count(),
                'activeTenants' => Tenant::whereNull('deleted_at')->count(),
                'totalStaff' => StaffMembership::where('status', StaffMembership::STATUS_ACTIVE)->count(),
                'totalClients' => Client::count(),
            ],
            'tenants' => Tenant::query()
                ->withCount(['staffMemberships', 'clients'])
                ->latest('created_at')
                ->limit(10)
                ->get(['id', 'name', 'slug', 'currency', 'created_at']),
        ]);
    }

    /**
     * /app dashboard: same route for clinic_owner, practitioner, and
     * receptionist, but the content is tailored to whichever role the
     * current staff membership holds.
     */
    public function app(Request $request): Response
    {
        $membership = $request->attributes->get('staffMembership');
        $tenantId = TenantScope::getTenantId();

        return match ($membership->role) {
            StaffMembership::ROLE_CLINIC_OWNER => $this->ownerDashboard($tenantId),
            StaffMembership::ROLE_RECEPTIONIST => $this->receptionistDashboard($tenantId),
            default => $this->practitionerDashboard($tenantId, $request->user()),
        };
    }

    protected function ownerDashboard(?string $tenantId): Response
    {
        $staff = StaffMembership::with('user', 'practitionerProfile')
            ->where('tenant_id', $tenantId)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->get()
            ->map(fn (StaffMembership $m) => [
                'name' => $m->user->name,
                'role' => $m->role,
                'availability' => ['Available', 'In Session', 'Off Today'][crc32($m->id) % 3],
            ]);

        return Inertia::render('Dashboard/Owner', [
            'stats' => [
                'todayAppointments' => 8,
                'totalClients' => Client::count(),
                'activeLocations' => Location::count(),
                'monthlyRevenue' => '$14,280',
            ],
            'outstandingInvoices' => [
                ['client' => 'Sophia Chen', 'amount' => '$120.00', 'due' => 'Due in 3 days'],
                ['client' => 'Marcus Aurelius', 'amount' => '$85.00', 'due' => 'Overdue by 2 days'],
            ],
            'staff' => $staff,
        ]);
    }

    protected function practitionerDashboard(?string $tenantId, $user): Response
    {
        return Inertia::render('Dashboard/Practitioner', [
            'appointments' => [
                ['id' => 101, 'client_name' => 'Sophia Chen', 'service' => 'Acupuncture Initial Assessment', 'time' => '10:00 AM - 11:00 AM', 'room' => 'Acupuncture Suite A', 'status' => 'Confirmed'],
                ['id' => 102, 'client_name' => 'Marcus Aurelius', 'service' => 'Herbal Consultation & Follow-up', 'time' => '02:30 PM - 03:15 PM', 'room' => 'Mindfulness Room B', 'status' => 'Scheduled'],
            ],
            'unsignedNotes' => [
                ['client_name' => 'Sophia Chen', 'service' => 'Acupuncture Session', 'date' => 'Yesterday'],
            ],
            'formAlerts' => [
                ['client_name' => 'Marcus Aurelius', 'form' => 'Updated Consent Form', 'status' => 'Awaiting client signature'],
            ],
        ]);
    }

    protected function receptionistDashboard(?string $tenantId): Response
    {
        // Deliberately excludes clinical data (notes, treatment plans, forms).
        return Inertia::render('Dashboard/Receptionist', [
            'checkInQueue' => [
                ['client_name' => 'Sophia Chen', 'time' => '10:00 AM', 'status' => 'Waiting'],
                ['client_name' => 'Marcus Aurelius', 'time' => '02:30 PM', 'status' => 'Not Arrived'],
            ],
            'todaysSchedule' => [
                ['client_name' => 'Sophia Chen', 'practitioner' => 'Julian Hayes, LAc', 'time' => '10:00 AM - 11:00 AM', 'room' => 'Acupuncture Suite A'],
                ['client_name' => 'Marcus Aurelius', 'practitioner' => 'Dr. Eleanor Vance', 'time' => '02:30 PM - 03:15 PM', 'room' => 'Mindfulness Room B'],
            ],
            'balancesDue' => [
                ['client_name' => 'Marcus Aurelius', 'amount' => '$85.00'],
            ],
        ]);
    }

    /**
     * Client portal dashboard.
     */
    public function portal(Request $request): Response
    {
        $client = $request->attributes->get('clientRecord');

        return Inertia::render('Portal/Dashboard', [
            'client' => [
                'first_name' => $client->first_name,
                'last_name' => $client->last_name,
            ],
            'upcomingAppointments' => [
                ['service' => 'Acupuncture Follow-up', 'practitioner' => 'Julian Hayes, LAc', 'time' => 'Tomorrow, 10:00 AM'],
            ],
            'formsDue' => [
                ['name' => 'Updated Intake & Consent Form', 'status' => 'Action needed'],
            ],
            'balances' => [
                ['description' => 'Acupuncture Session (Jul 28)', 'amount' => '$120.00'],
            ],
            'messages' => [
                ['from' => 'Downtown Sanctuary', 'preview' => 'Your appointment tomorrow has been confirmed.'],
            ],
        ]);
    }
}
