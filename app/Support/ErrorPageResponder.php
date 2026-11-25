<?php

namespace App\Support;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ErrorPageResponder
{
    public const SUPPORTED_STATUSES = [403, 404, 419, 429, 500, 503];

    public static function respond(Response $response, \Throwable $exception, Request $request): Response
    {
        $status = $response->getStatusCode();

        if (! in_array($status, self::SUPPORTED_STATUSES, true)) {
            return $response;
        }

        // JSON/API requests and Inertia partial reloads must keep JSON responses.
        if (
            $request->expectsJson()
            || $request->is('api/*')
            || $request->header('X-Inertia-Partial-Data')
        ) {
            return $response;
        }

        // Preserve Laravel's detailed debug page when APP_DEBUG=true in local.
        if (App::isLocal() && config('app.debug')) {
            return $response;
        }

        $safeMessage = ($status === 403 && $exception->getMessage() !== '')
            ? $exception->getMessage()
            : null;

        return self::render($request, $status, $response->headers->get('Retry-After'), $safeMessage);
    }

    public static function preview(Request $request, int $status): Response
    {
        abort_unless(in_array($status, self::SUPPORTED_STATUSES, true), 404);

        $retryAfter = $status === 429
            ? ($request->query('retry', '60'))
            : null;

        return self::render($request, $status, $retryAfter);
    }

    public static function render(Request $request, int $status, ?string $retryAfter = null, ?string $message = null): Response
    {
        $requestId = $request->header('X-Request-Id')
            ?: strtoupper(Str::random(8));

        $clinic = null;
        $authContext = [
            'isAuthenticated' => false,
            'isPlatformAdmin' => false,
            'dashboardUrl' => null,
            'clinicName' => null,
        ];

        // Guard DB/Auth lookups so 500/503 still render cleanly even if DB is down.
        if ($status !== 503) {
            try {
                $subdomain = Tenancy::subdomainFromHost($request->getHost());
                if ($subdomain !== null) {
                    $tenant = Tenant::withoutGlobalScopes()
                        ->where('subdomain', $subdomain)
                        ->first();
                    if ($tenant) {
                        $clinic = [
                            'name' => $tenant->name,
                            'subdomain' => $tenant->subdomain,
                            'homeUrl' => '/',
                        ];
                    }
                }

                $user = $request->user();
                if ($user) {
                    $isAdmin = $user->isPlatformAdmin();
                    $dashboardUrl = $isAdmin
                        ? '/admin/dashboard'
                        : '/app/dashboard';

                    $membership = null;
                    if (! $isAdmin) {
                        $membership = $user->activeWorkspaceMemberships()->with('tenant')->first();
                        if ($membership?->tenant) {
                            $dashboardUrl = $membership->tenant->appUrl('/app/dashboard');
                        } elseif ($user->clients()->exists()) {
                            $dashboardUrl = Tenancy::portalUrl('/portal/dashboard');
                        } else {
                            $dashboardUrl = '/';
                        }
                    }

                    $authContext = [
                        'isAuthenticated' => true,
                        'isPlatformAdmin' => $isAdmin,
                        'dashboardUrl' => $dashboardUrl,
                        'clinicName' => $membership?->tenant?->name,
                    ];
                }
            } catch (\Throwable) {
                // Fall back silently if database is unavailable.
            }
        }

        try {
            return Inertia::render('ErrorPage', [
                'status' => $status,
                'message' => $message,
                'requestId' => $requestId,
                'retryAfter' => $retryAfter,
                'clinic' => $clinic,
                'authContext' => $authContext,
                'centralHomeUrl' => Tenancy::centralUrl('/'),
                'links' => [
                    ['label' => 'Home', 'href' => '/'],
                    ['label' => 'Pricing', 'href' => Tenancy::centralUrl('/pricing')],
                    ['label' => 'Login', 'href' => '/login'],
                    ['label' => 'Help', 'href' => Tenancy::centralUrl('/faq')],
                ],
            ])->toResponse($request)->setStatusCode($status);
        } catch (\Throwable) {
            return response()->view("errors.{$status}", [
                'status' => $status,
                'requestId' => $requestId,
                'retryAfter' => $retryAfter,
                'clinicName' => $clinic['name'] ?? null,
            ], $status);
        }
    }
}
