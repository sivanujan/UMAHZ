<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\BlockedEmail;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BlockedEmailController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Tenant::class);

        $blockedEmails = BlockedEmail::query()
            ->with(['blockedBy', 'tenant'])
            ->latest()
            ->get()
            ->map(fn (BlockedEmail $item) => [
                'id' => $item->id,
                'email' => $item->email,
                'reason' => $item->reason,
                'blocked_by_name' => $item->blockedBy?->name ?? 'System',
                'tenant_name' => $item->tenant?->name ?? '—',
                'tenant_id' => $item->tenant_id,
                'business_registration_number' => $item->business_registration_number,
                'phone' => $item->phone,
                'created_at' => $item->created_at?->format('M j, Y g:i A'),
                'created_ago' => $item->created_at?->diffForHumans(),
            ]);

        return Inertia::render('Admin/BlockedEmails/Index', [
            'blockedEmails' => $blockedEmails,
        ]);
    }

    public function unban(Request $request, BlockedEmail $blockedEmail): RedirectResponse
    {
        $this->authorize('viewAny', Tenant::class);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $email = $blockedEmail->email;
        $tenantId = $blockedEmail->tenant_id;

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'clinic.email_unbanned',
            'resource_type' => BlockedEmail::class,
            'resource_id' => (string) $blockedEmail->id,
            'ip_address' => $request->ip(),
            'reason' => $data['reason'],
            'metadata' => [
                'email' => $email,
                'unbanned_by' => $request->user()->name,
            ],
        ]);

        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
            if ($tenant) {
                $tenant->update(['is_permanently_rejected' => false]);
            }
        }

        $blockedEmail->delete();

        return back()->with('success', "Application restriction lifted for {$email}.");
    }
}
