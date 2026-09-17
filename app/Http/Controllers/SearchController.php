<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Handle global quick search query for clients, appointments, invoices, and navigation.
     */
    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->input('q', ''));
        $tenantId = TenantScope::getTenantId();

        if (! $tenantId) {
            return response()->json([
                'query' => $query,
                'clients' => [],
                'appointments' => [],
                'invoices' => [],
                'navigation' => [],
            ]);
        }

        // Static pages registry for quick navigation suggestions
        $pages = [
            ['title' => 'Dashboard', 'subtitle' => 'Overview & activity', 'category' => 'Navigation', 'url' => '/app/dashboard', 'keywords' => ['dashboard', 'home', 'overview', 'stats']],
            ['title' => 'Clients & Patients', 'subtitle' => 'Client roster and profiles', 'category' => 'Navigation', 'url' => '/app/clients', 'keywords' => ['clients', 'patients', 'roster', 'people']],
            ['title' => 'Calendar & Bookings', 'subtitle' => 'Schedule and appointment book', 'category' => 'Navigation', 'url' => '/app/calendar', 'keywords' => ['calendar', 'appointments', 'schedule', 'booking', 'visits']],
            ['title' => 'Appointments Report', 'subtitle' => 'Booking activity and volume analytics', 'category' => 'Reports', 'url' => '/app/reports/appointments', 'keywords' => ['appointments report', 'booking analytics', 'volume']],
            ['title' => 'Revenue & Financials Report', 'subtitle' => 'Gross billing and collections', 'category' => 'Reports', 'url' => '/app/reports/revenue', 'keywords' => ['revenue', 'financials', 'money', 'billing report', 'collections', 'sales']],
            ['title' => 'Client Retention Report', 'subtitle' => 'Rebooking rates and patient loyalty', 'category' => 'Reports', 'url' => '/app/reports/retention', 'keywords' => ['retention', 'rebooking', 'loyalty', 'returning clients']],
            ['title' => 'Capacity Utilization Report', 'subtitle' => 'Operating hours vs booked time', 'category' => 'Reports', 'url' => '/app/reports/utilization', 'keywords' => ['capacity', 'utilization', 'rooms', 'bottlenecks', 'hours']],
            ['title' => 'Clinic Settings', 'subtitle' => 'Profile, branding, and operating hours', 'category' => 'Settings', 'url' => '/app/settings', 'keywords' => ['settings', 'clinic profile', 'hours', 'operating hours', 'business hours', 'branding']],
            ['title' => 'Subscription & Billing', 'subtitle' => 'UMAHZ clinic plan & payment methods', 'category' => 'Settings', 'url' => '/app/billing', 'keywords' => ['billing', 'subscription', 'plan', 'invoice', 'credit card']],
            ['title' => 'Locations & Rooms', 'subtitle' => 'Clinic sites and consultation suites', 'category' => 'Settings', 'url' => '/app/locations', 'keywords' => ['locations', 'rooms', 'suites', 'branches', 'clinics']],
            ['title' => 'Staff & Team', 'subtitle' => 'Practitioners and team invitations', 'category' => 'Settings', 'url' => '/app/staff', 'keywords' => ['staff', 'team', 'practitioners', 'invitations', 'members']],
            ['title' => 'Intake Form Templates', 'subtitle' => 'Patient onboarding questionnaires', 'category' => 'Settings', 'url' => '/app/settings/intake-forms', 'keywords' => ['intake', 'forms', 'questionnaires', 'templates']],
            ['title' => 'Clinical Note Templates', 'subtitle' => 'SOAP and clinical note definitions', 'category' => 'Settings', 'url' => '/app/settings/clinical-note-templates', 'keywords' => ['notes', 'soap', 'templates', 'clinical notes']],
            ['title' => 'Consent Documents', 'subtitle' => 'Informed consent forms and types', 'category' => 'Settings', 'url' => '/app/settings/consents', 'keywords' => ['consents', 'agreements', 'legal']],
        ];

        // Filter navigation
        $matchedNavigation = [];
        if ($query !== '') {
            $lowerQuery = strtolower($query);
            foreach ($pages as $p) {
                $matched = str_contains(strtolower($p['title']), $lowerQuery)
                    || str_contains(strtolower($p['subtitle']), $lowerQuery)
                    || collect($p['keywords'])->contains(fn ($kw) => str_contains($kw, $lowerQuery));

                if ($matched) {
                    $matchedNavigation[] = [
                        'title' => $p['title'],
                        'subtitle' => $p['subtitle'],
                        'category' => $p['category'],
                        'url' => $p['url'],
                    ];
                }
            }
        }

        if (strlen($query) < 2) {
            return response()->json([
                'query' => $query,
                'clients' => [],
                'appointments' => [],
                'invoices' => [],
                'navigation' => array_slice($matchedNavigation, 0, 4),
            ]);
        }

        $term = "%{$query}%";

        // 1. Clients
        $clients = Client::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where(function ($q) use ($term) {
                $q->where('first_name', 'ILIKE', $term)
                    ->orWhere('last_name', 'ILIKE', $term)
                    ->orWhere('email', 'ILIKE', $term)
                    ->orWhere('phone', 'ILIKE', $term)
                    ->orWhereRaw("first_name || ' ' || last_name ILIKE ?", [$term]);
            })
            ->limit(5)
            ->get(['id', 'first_name', 'last_name', 'email', 'phone', 'is_active'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => trim("{$c->first_name} {$c->last_name}") ?: 'Unnamed Client',
                'email' => $c->email,
                'phone' => $c->phone,
                'is_active' => $c->is_active,
                'url' => "/app/clients/{$c->id}",
            ]);

        // 2. Appointments
        $appointments = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where(function ($q) use ($term) {
                $q->where('service_name', 'ILIKE', $term)
                    ->orWhereHas('client', function ($cq) use ($term) {
                        $cq->where('first_name', 'ILIKE', $term)
                            ->orWhere('last_name', 'ILIKE', $term)
                            ->orWhere('email', 'ILIKE', $term)
                            ->orWhereRaw("first_name || ' ' || last_name ILIKE ?", [$term]);
                    });
            })
            ->with(['client:id,first_name,last_name,email', 'staffMembership.user:id,name'])
            ->orderBy('starts_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($a) {
                $clientName = $a->client ? trim("{$a->client->first_name} {$a->client->last_name}") : 'Guest / Unknown';
                $practitionerName = $a->staffMembership?->user?->name ?? 'Any Practitioner';
                $formattedTime = $a->starts_at ? $a->starts_at->format('M j, Y g:ia') : 'No date';

                return [
                    'id' => $a->id,
                    'service_name' => $a->service_name ?: 'Consultation',
                    'client_name' => $clientName,
                    'practitioner_name' => $practitionerName,
                    'starts_at_formatted' => $formattedTime,
                    'status' => $a->status,
                    'url' => "/app/calendar?appointment_id={$a->id}",
                ];
            });

        // 3. Invoices (check if user can view financial / billing)
        $user = $request->user();
        $membership = StaffMembership::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->first();

        $canViewInvoices = $membership && in_array($membership->role, [
            StaffMembership::ROLE_CLINIC_OWNER,
            StaffMembership::ROLE_RECEPTIONIST,
        ]);

        $invoices = [];
        if ($canViewInvoices) {
            $invoices = Invoice::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where(function ($q) use ($term, $query) {
                    if (is_numeric($query)) {
                        $q->where('invoice_number', (int) $query);
                    }
                    $q->orWhereRaw("CAST(invoice_number AS TEXT) ILIKE ?", [$term])
                        ->orWhereHas('client', function ($cq) use ($term) {
                            $cq->where('first_name', 'ILIKE', $term)
                                ->orWhere('last_name', 'ILIKE', $term)
                                ->orWhereRaw("first_name || ' ' || last_name ILIKE ?", [$term]);
                        });
                })
                ->with(['client:id,first_name,last_name'])
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($inv) {
                    $clientName = $inv->client ? trim("{$inv->client->first_name} {$inv->client->last_name}") : 'Unknown Client';
                    $formattedTotal = '$'.number_format(($inv->total_amount ?? 0) / 100, 2);

                    return [
                        'id' => $inv->id,
                        'invoice_number' => 'INV-'.str_pad((string) $inv->invoice_number, 4, '0', STR_PAD_LEFT),
                        'client_name' => $clientName,
                        'total_amount' => $formattedTotal,
                        'status' => $inv->status,
                        'url' => "/app/invoices/{$inv->id}",
                    ];
                });
        }

        return response()->json([
            'query' => $query,
            'clients' => $clients,
            'appointments' => $appointments,
            'invoices' => $invoices,
            'navigation' => array_slice($matchedNavigation, 0, 4),
        ]);
    }
}
