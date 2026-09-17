<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Fetch active dynamic clinic notifications.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = TenantScope::getTenantId();
        if (! $tenantId) {
            return response()->json([
                'notifications' => [],
                'unread_count' => 0,
            ]);
        }

        $tenant = Tenant::find($tenantId);
        $notifications = [];
        $now = Carbon::now();

        // 1. Upcoming or recent appointments (Today and Tomorrow)
        $upcomingAppts = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereBetween('starts_at', [$now->copy()->subHours(12), $now->copy()->addHours(48)])
            ->whereNotIn('status', [Appointment::STATUS_CANCELLED])
            ->with(['client:id,first_name,last_name', 'staffMembership.user:id,name'])
            ->orderBy('starts_at', 'asc')
            ->limit(4)
            ->get();

        foreach ($upcomingAppts as $appt) {
            $clientName = $appt->client ? trim("{$appt->client->first_name} {$appt->client->last_name}") : 'Patient';
            $practitionerName = $appt->staffMembership?->user?->name ?? 'Practitioner';
            $isPast = $appt->starts_at->isPast();

            $diffText = $appt->starts_at->diffForHumans();
            $timeFormatted = $appt->starts_at->format('M j, g:ia');

            $notifications[] = [
                'id' => 'appt_'.$appt->id,
                'type' => 'appointment',
                'title' => $isPast ? 'Recent Appointment' : 'Upcoming Appointment',
                'message' => "{$clientName} • {$appt->service_name} ({$timeFormatted}) with {$practitionerName}",
                'time' => $timeFormatted,
                'time_ago' => $diffText,
                'url' => "/app/calendar?appointment_id={$appt->id}",
                'icon' => 'calendar',
                'tone' => $isPast ? 'blue' : 'emerald',
            ];
        }

        // 2. Recent payments / paid invoices
        $recentPaid = Invoice::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('status', Invoice::STATUS_PAID)
            ->whereNotNull('paid_at')
            ->with(['client:id,first_name,last_name'])
            ->orderBy('paid_at', 'desc')
            ->limit(3)
            ->get();

        foreach ($recentPaid as $inv) {
            $clientName = $inv->client ? trim("{$inv->client->first_name} {$inv->client->last_name}") : 'Patient';
            $amount = '$'.number_format(($inv->total_amount ?? 0) / 100, 2);
            $invNum = 'INV-'.str_pad((string) $inv->invoice_number, 4, '0', STR_PAD_LEFT);

            $notifications[] = [
                'id' => 'inv_'.$inv->id,
                'type' => 'payment',
                'title' => 'Payment Received',
                'message' => "{$amount} collected from {$clientName} ({$invNum})",
                'time' => $inv->paid_at ? $inv->paid_at->format('M j, g:ia') : 'Recently',
                'time_ago' => $inv->paid_at ? $inv->paid_at->diffForHumans() : 'Recently',
                'url' => "/app/invoices/{$inv->id}",
                'icon' => 'receipt',
                'tone' => 'emerald',
            ];
        }

        // 3. Outstanding open invoices needing collection
        $openInvoices = Invoice::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('status', Invoice::STATUS_OPEN)
            ->with(['client:id,first_name,last_name'])
            ->orderBy('due_date', 'asc')
            ->limit(2)
            ->get();

        foreach ($openInvoices as $inv) {
            $clientName = $inv->client ? trim("{$inv->client->first_name} {$inv->client->last_name}") : 'Patient';
            $amount = '$'.number_format(($inv->total_amount ?? 0) / 100, 2);
            $invNum = 'INV-'.str_pad((string) $inv->invoice_number, 4, '0', STR_PAD_LEFT);

            $notifications[] = [
                'id' => 'open_inv_'.$inv->id,
                'type' => 'invoice',
                'title' => 'Invoice Pending Payment',
                'message' => "{$invNum} for {$clientName} • {$amount} outstanding",
                'time' => $inv->due_date ? 'Due '.$inv->due_date->format('M j') : 'Open balance',
                'time_ago' => $inv->due_date ? $inv->due_date->diffForHumans() : 'Pending',
                'url' => "/app/invoices/{$inv->id}",
                'icon' => 'clock',
                'tone' => 'amber',
            ];
        }

        // 4. Recent Client Registrations
        $recentClients = Client::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->orderBy('created_at', 'desc')
            ->limit(2)
            ->get();

        foreach ($recentClients as $client) {
            $clientName = trim("{$client->first_name} {$client->last_name}") ?: 'New Client';
            $notifications[] = [
                'id' => 'client_'.$client->id,
                'type' => 'client',
                'title' => 'New Client Registered',
                'message' => "{$clientName} was added to your practice client roster",
                'time' => $client->created_at ? $client->created_at->format('M j, g:ia') : 'Recently',
                'time_ago' => $client->created_at ? $client->created_at->diffForHumans() : 'Recently',
                'url' => "/app/clients/{$client->id}",
                'icon' => 'user',
                'tone' => 'indigo',
            ];
        }

        // 5. Operating Hours Setup Alert (if not configured)
        if (empty($tenant?->business_hours)) {
            $notifications[] = [
                'id' => 'setup_business_hours',
                'type' => 'setup',
                'title' => 'Operating Hours Setup',
                'message' => 'Configure your clinic business hours to unlock capacity utilization reporting',
                'time' => 'Setup needed',
                'time_ago' => 'Action required',
                'url' => '/app/settings',
                'icon' => 'settings',
                'tone' => 'amber',
            ];
        }

        return response()->json([
            'notifications' => $notifications,
            'count' => count($notifications),
        ]);
    }
}
