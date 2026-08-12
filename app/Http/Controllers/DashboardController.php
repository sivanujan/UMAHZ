<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\ClientForm;
use App\Models\ClinicalNote;
use App\Models\Invoice;
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

        $monthlyRevenue = Invoice::where('tenant_id', $tenantId)
            ->where('status', Invoice::STATUS_PAID)
            ->whereMonth('paid_at', $now->month)
            ->whereYear('paid_at', $now->year)
            ->sum('amount');

        $outstandingInvoices = Invoice::with('client')
            ->where('tenant_id', $tenantId)
            ->whereIn('status', [Invoice::STATUS_DUE, Invoice::STATUS_OVERDUE])
            ->orderBy('due_date')
            ->limit(5)
            ->get()
            ->map(fn (Invoice $invoice) => [
                'client' => $invoice->client->first_name.' '.$invoice->client->last_name,
                'amount' => '$'.number_format($invoice->amount, 2),
                'due' => $this->dueLabel($invoice),
            ]);

        return Inertia::render('Dashboard/Owner', [
            'stats' => [
                'todayAppointments' => Appointment::where('tenant_id', $tenantId)->whereDate('starts_at', $now->toDateString())->count(),
                'totalClients' => Client::count(),
                'activeLocations' => Location::count(),
                'monthlyRevenue' => '$'.number_format($monthlyRevenue, 2),
            ],
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
            ->whereIn('status', [Invoice::STATUS_DUE, Invoice::STATUS_OVERDUE])
            ->get()
            ->map(fn (Invoice $invoice) => [
                'client_name' => $invoice->client->first_name.' '.$invoice->client->last_name,
                'amount' => '$'.number_format($invoice->amount, 2),
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
            ]);

        $formsDue = $client->forms()
            ->where('status', ClientForm::STATUS_PENDING)
            ->get()
            ->map(fn (ClientForm $form) => [
                'name' => $form->name,
                'status' => 'Action needed',
            ]);

        $balances = $client->invoices()
            ->whereIn('status', [Invoice::STATUS_DUE, Invoice::STATUS_OVERDUE])
            ->get()
            ->map(fn (Invoice $invoice) => [
                'description' => $invoice->description,
                'amount' => '$'.number_format($invoice->amount, 2),
            ]);

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
            ],
            'upcomingAppointments' => $upcomingAppointments,
            'formsDue' => $formsDue,
            'balances' => $balances,
            'messages' => $messages,
        ]);
    }

    protected function dueLabel(Invoice $invoice): string
    {
        if (!$invoice->due_date) {
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
