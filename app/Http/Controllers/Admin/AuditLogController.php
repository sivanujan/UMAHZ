<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    /**
     * Display a paginated list of system and platform audit events.
     */
    public function index(Request $request): Response
    {
        $query = AuditEvent::query()
            ->with([
                'user:id,name,email',
                'tenant:id,name,subdomain',
            ])
            ->latest('created_at');

        if ($request->filled('action')) {
            $action = $request->query('action');
            if (str_contains($action, '*')) {
                $query->where('action', 'like', str_replace('*', '%', $action));
            } else {
                $query->where('action', 'like', "%{$action}%");
            }
        }

        if ($request->filled('category')) {
            $cat = $request->query('category');
            if ($cat === 'billing') {
                $query->where(function ($q) {
                    $q->where('action', 'like', 'plan.%')
                        ->orWhere('action', 'like', 'feature.%')
                        ->orWhere('action', 'like', 'addon.%')
                        ->orWhere('action', 'like', 'promo_code.%')
                        ->orWhere('action', 'like', 'clinic_billing.%')
                        ->orWhere('action', 'like', 'entitlement.%');
                });
            } elseif ($cat === 'settings') {
                $query->where('action', 'like', 'platform_settings.%');
            } elseif ($cat === 'clinics') {
                $query->where(function ($q) {
                    $q->where('action', 'like', 'clinic.%')
                        ->orWhere('action', 'like', 'clinic_billing.%');
                });
            }
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->query('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->query('date_to'));
        }

        $events = $query->paginate(25)->withQueryString()->through(function (AuditEvent $event) {
            return [
                'id' => $event->id,
                'action' => $event->action,
                'resource_type' => class_basename($event->resource_type ?? ''),
                'resource_id' => $event->resource_id,
                'user' => $event->user ? [
                    'id' => $event->user->id,
                    'name' => $event->user->name,
                    'email' => $event->user->email,
                ] : null,
                'tenant' => $event->tenant ? [
                    'id' => $event->tenant->id,
                    'name' => $event->tenant->name,
                    'subdomain' => $event->tenant->subdomain,
                ] : null,
                'ip_address' => $event->ip_address,
                'metadata' => $event->metadata,
                'created_at' => $event->created_at->format('Y-m-d H:i:s'),
                'time_ago' => $event->created_at->diffForHumans(),
            ];
        });

        $adminUsers = User::query()
            ->where(function ($query) {
                $query->whereHas('roles', function ($q) {
                    $q->where('name', 'Platform Admin');
                })->orWhereHas('staffMemberships', function ($q) {
                    $q->where('role', \App\Models\StaffMembership::ROLE_PLATFORM_ADMIN);
                });
            })
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('Admin/Audit/Index', [
            'events' => $events,
            'filters' => $request->only(['action', 'category', 'user_id', 'date_from', 'date_to']),
            'adminUsers' => $adminUsers,
        ]);
    }
}
