<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\ClientForm;
use App\Models\ClinicalNote;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Payment;
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
     */
    public function admin(Request $request): Response
    {
        $tenants = Tenant::query()
            ->withCount(['staffMemberships', 'clients'])
            ->latest('created_at')
            ->get();

        // Single fast query for patient payments grouped by clinic
        $paymentsByTenant = Payment::withoutGlobalScopes()
            ->where('status', Payment::STATUS_SUCCEEDED)
            ->groupBy('tenant_id')
            ->selectRaw('tenant_id, sum(amount) as total_amount')
            ->pluck('total_amount', 'tenant_id');

        $totalMrr = 0.0;
        $totalPatientGrossVolume = 0.0;

        $tenantList = $tenants->map(function (Tenant $tenant) use ($paymentsByTenant, &$totalMrr, &$totalPatientGrossVolume) {
            $monthlyBillable = $tenant->monthlyBillableTotal();
            if ($tenant->status === Tenant::STATUS_APPROVED) {
                $totalMrr += $monthlyBillable;
            }

            $patientEarningsMinor = $paymentsByTenant->get($tenant->id, 0);
            $patientEarnings = ((float) $patientEarningsMinor) / 100;
            $totalPatientGrossVolume += $patientEarnings;

            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'subdomain' => $tenant->subdomain,
                'status' => $tenant->status ?? Tenant::STATUS_APPROVED,
                'currency' => $tenant->currency ?: 'USD',
                'plan_tier' => $tenant->plan_tier,
                'plan_name' => $tenant->planName(),
                'monthly_billable' => round($monthlyBillable, 2),
                'patient_earnings' => round($patientEarnings, 2),
                'primary_contact_name' => $tenant->primary_contact_name,
                'primary_contact_email' => $tenant->primary_contact_email,
                'staff_memberships_count' => $tenant->staff_memberships_count,
                'clients_count' => $tenant->clients_count,
                'app_url' => $tenant->appUrl('/app/dashboard'),
                'created_at' => $tenant->created_at?->format('M j, Y'),
            ];
        });

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'totalTenants' => $tenants->count(),
                'activeTenants' => $tenants->where('status', Tenant::STATUS_APPROVED)->count(),
                'pendingTenants' => $tenants->where('status', Tenant::STATUS_PENDING_REVIEW)->count(),
                'suspendedTenants' => $tenants->where('status', Tenant::STATUS_SUSPENDED)->count(),
                'totalStaff' => StaffMembership::where('status', StaffMembership::STATUS_ACTIVE)->count(),
                'totalClients' => Client::count(),
                'totalMrr' => round($totalMrr, 2),
                'totalArr' => round($totalMrr * 12, 2),
                'totalPatientGrossVolume' => round($totalPatientGrossVolume, 2),
            ],
            'tenants' => $tenantList,
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
            default => $this->practitionerDashboard($tenantId, $membership),
        };
    }

    protected function ownerDashboard(?string $tenantId): Response
    {
        $memberships = StaffMembership::with('user')
            ->where('tenant_id', $tenantId)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->get();

        $now = now();

        $staff = $memberships->map(function (StaffMembership $m) use ($now) {
            $todaysAppointments = Appointment::where('staff_membership_id', $m->id)
                ->whereDate('starts_at', $now->toDateString())
                ->get();

            $inSessionNow = $todaysAppointments->contains(
                fn (Appointment $a) => $a->starts_at <= $now && $a->ends_at >= $now
            );

            $availability = match (true) {
                $inSessionNow => 'In Session',
                $todaysAppointments->isNotEmpty() => 'Available',
                default => 'Off Today',
            };

            return [
                'name' => $m->user->name,
                'role' => $m->role,
                'availability' => $availability,
            ];
        });

        // Revenue = paid patient invoices this month. Amounts are integer minor
        // units; divide only for display formatting (never for money math).
        $monthlyRevenue = (int) Invoice::where('tenant_id', $tenantId)
            ->where('status', Invoice::STATUS_PAID)
            ->whereMonth('paid_at', $now->month)
            ->whereYear('paid_at', $now->year)
            ->sum('total_amount');

        $outstandingInvoices = Invoice::with('client')
            ->where('tenant_id', $tenantId)
            ->where('status', Invoice::STATUS_OPEN)
            ->orderBy('due_date')
            ->limit(5)
            ->get()
            ->map(fn (Invoice $invoice) => [
                'client' => $invoice->client->first_name.' '.$invoice->client->last_name,
                'amount' => $this->money($invoice->amountDue()),
                'due' => $this->dueLabel($invoice),
            ]);

        $tenant = Tenant::find($tenantId);
        $subscription = $tenant?->subscription(Tenant::PLATFORM_SUBSCRIPTION);
        $subscriptionSummary = $tenant ? [
            'plan_name' => $tenant->planName(),
            'plan_tier' => $tenant->plan_tier ?? Tenant::PLAN_PRACTICE,
            'status' => $tenant->subscription_status ?? Tenant::SUBSCRIPTION_NONE,
            'is_active' => $subscription?->active() ?? false,
            'monthly_total' => '$'.number_format($tenant->monthlyBillableBreakdown()['total'] ?? 0, 2),
            'full_time' => $tenant->full_time_practitioners_count ?? 1,
            'part_time' => $tenant->part_time_practitioners_count ?? 0,
        ] : null;

        return Inertia::render('Dashboard/Owner', [
            'stats' => [
                'todayAppointments' => Appointment::where('tenant_id', $tenantId)->whereDate('starts_at', $now->toDateString())->count(),
                'totalClients' => Client::count(),
                'activeLocations' => Location::count(),
                'monthlyRevenue' => $this->money($monthlyRevenue),
            ],
            'subscription' => $subscriptionSummary,
            'outstandingInvoices' => $outstandingInvoices,
            'staff' => $staff,
        ]);
    }

    protected function practitionerDashboard(?string $tenantId, StaffMembership $membership): Response
    {
        $appointments = Appointment::with('client', 'room')
            ->where('staff_membership_id', $membership->id)
            ->whereDate('starts_at', now()->toDateString())
            ->orderBy('starts_at')
            ->get()
            ->map(fn (Appointment $a) => [
                'id' => $a->id,
                'client_name' => $a->client->first_name.' '.$a->client->last_name,
                'service' => $a->service_name,
                'time' => $a->starts_at->format('g:i A').' - '.$a->ends_at->format('g:i A'),
                'room' => $a->room->name ?? '—',
                'status' => $this->statusLabel($a->status),
            ]);

        $unsignedNotes = ClinicalNote::with('client')
            ->where('staff_membership_id', $membership->id)
            ->where('status', ClinicalNote::STATUS_DRAFT)
            ->latest('created_at')
            ->get()
            ->map(fn (ClinicalNote $note) => [
                'client_name' => $note->client->first_name.' '.$note->client->last_name,
                'service' => $note->content,
                'date' => $note->created_at->diffForHumans(),
            ]);

        $formAlerts = ClientForm::with('client')
            ->where('tenant_id', $tenantId)
            ->where('status', ClientForm::STATUS_PENDING)
            ->get()
            ->map(fn (ClientForm $form) => [
                'client_name' => $form->client->first_name.' '.$form->client->last_name,
                'form' => $form->name,
                'status' => 'Awaiting client signature',
            ]);

        return Inertia::render('Dashboard/Practitioner', [
            'appointments' => $appointments,
            'unsignedNotes' => $unsignedNotes,
            'formAlerts' => $formAlerts,
        ]);
    }

    protected function receptionistDashboard(?string $tenantId): Response
    {
        // Deliberately excludes clinical data (notes, treatment plans, forms).
        $todaysAppointments = Appointment::with('client', 'staffMembership.user', 'room')
            ->where('tenant_id', $tenantId)
            ->whereDate('starts_at', now()->toDateString())
            ->orderBy('starts_at')
            ->get();

        $checkInQueue = $todaysAppointments
            ->whereIn('status', [Appointment::STATUS_CONFIRMED, Appointment::STATUS_CHECKED_IN])
            ->map(fn (Appointment $a) => [
                'client_name' => $a->client->first_name.' '.$a->client->last_name,
                'time' => $a->starts_at->format('g:i A'),
                'status' => $a->status === Appointment::STATUS_CHECKED_IN ? 'Waiting' : 'Not Arrived',
            ])
            ->values();

        $todaysSchedule = $todaysAppointments->map(fn (Appointment $a) => [
            'client_name' => $a->client->first_name.' '.$a->client->last_name,
            'practitioner' => $a->staffMembership->user->name,
            'time' => $a->starts_at->format('g:i A').' - '.$a->ends_at->format('g:i A'),
            'room' => $a->room->name ?? '—',
        ]);

        $balancesDue = Invoice::with('client')
            ->where('tenant_id', $tenantId)
            ->where('status', Invoice::STATUS_OPEN)
            ->get()
            ->map(fn (Invoice $invoice) => [
                'client_name' => $invoice->client->first_name.' '.$invoice->client->last_name,
                'amount' => $this->money($invoice->amountDue()),
            ]);

        return Inertia::render('Dashboard/Receptionist', [
            'checkInQueue' => $checkInQueue,
            'todaysSchedule' => $todaysSchedule,
            'balancesDue' => $balancesDue,
        ]);
    }

    /**
     * Client portal dashboard.
     */
    public function portal(Request $request): Response
    {
        $client = $request->attributes->get('clientRecord');

        $upcomingAppointments = $client->appointments()
            ->with('staffMembership.user')
            ->where('starts_at', '>=', now())
            ->whereIn('status', [Appointment::STATUS_SCHEDULED, Appointment::STATUS_CONFIRMED])
            ->orderBy('starts_at')
            ->limit(5)
            ->get()
            ->map(fn (Appointment $a) => [
                'service' => $a->service_name,
                'practitioner' => $a->staffMembership->user->name,
                'time' => $a->starts_at->isToday()
                    ? 'Today, '.$a->starts_at->format('g:i A')
                    : ($a->starts_at->isTomorrow() ? 'Tomorrow, '.$a->starts_at->format('g:i A') : $a->starts_at->format('M j, g:i A')),
                'day' => $a->starts_at->format('j'),
                'month' => $a->starts_at->format('M'),
            ]);

        $formsDue = $client->forms()
            ->where('status', ClientForm::STATUS_PENDING)
            ->get()
            ->map(fn (ClientForm $form) => [
                'name' => $form->name,
                'status' => 'Action needed',
            ]);

        $allInvoices = $client->invoices()->get();

        $dueInvoices = $allInvoices->where('status', Invoice::STATUS_OPEN);

        $balances = $dueInvoices->map(fn (Invoice $invoice) => [
            'description' => $invoice->reference(),
            'amount' => $this->money($invoice->amountDue()),
        ])->values();

        $totalInvoiceCount = $allInvoices->count();
        $paidInvoiceCount = $allInvoices->where('status', Invoice::STATUS_PAID)->count();

        $balanceStats = [
            'totalDue' => $this->money((int) $dueInvoices->sum(fn (Invoice $i) => $i->amountDue())),
            'paidRatio' => $totalInvoiceCount > 0 ? round($paidInvoiceCount / $totalInvoiceCount, 2) : 1,
        ];

        $messages = $client->messages()
            ->where('sender', 'clinic')
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($message) => [
                'from' => $message->tenant->name ?? 'Your Clinic',
                'preview' => $message->body,
            ]);

        return Inertia::render('Portal/Dashboard', [
            'client' => [
                'first_name' => $client->first_name,
                'last_name' => $client->last_name,
                'member_since' => $client->created_at->format('M Y'),
            ],
            'themePreference' => $client->theme_preference,
            'upcomingAppointments' => $upcomingAppointments,
            'formsDue' => $formsDue,
            'balances' => $balances,
            'balanceStats' => $balanceStats,
            'messages' => $messages,
        ]);
    }

    /** Format integer minor units as a currency string (display only). */
    protected function money(int $minorUnits): string
    {
        return '$'.number_format($minorUnits / 100, 2);
    }

    protected function dueLabel(Invoice $invoice): string
    {
        if (! $invoice->due_date) {
            return 'No due date';
        }

        $days = now()->startOfDay()->diffInDays($invoice->due_date, false);

        if ($days < 0) {
            return 'Overdue by '.abs($days).' day'.(abs($days) === 1 ? '' : 's');
        }

        if ($days === 0) {
            return 'Due today';
        }

        return 'Due in '.$days.' day'.($days === 1 ? '' : 's');
    }

    protected function statusLabel(string $status): string
    {
        return ucwords(str_replace('_', ' ', $status));
    }
}
