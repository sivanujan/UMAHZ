<?php

use App\Http\Middleware\EnsureClientAccess;
use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsureStaffRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectIfAuthenticated;
use App\Http\Middleware\ResolveTenantFromSubdomain;
use App\Http\Middleware\SetTenantContext;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

// Polyfill for finfo when fileinfo PHP extension is disabled in environment
if (!defined('FILEINFO_MIME_TYPE')) {
    define('FILEINFO_MIME_TYPE', 16);
}
if (!class_exists('finfo')) {
    class finfo {
        public function __construct(int $flags = 0, ?string $magicFile = null) {}
        public function buffer(string $string, int $flags = 0, $context = null): string|false {
            return false;
        }
        public function file(string $filename, int $flags = 0, $context = null): string|false {
            return false;
        }
    }
}

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            SetTenantContext::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Stripe posts webhooks without a CSRF token; the route is protected by
        // Stripe signature verification instead (Cashier's WebhookController).
        $middleware->validateCsrfTokens(except: [
            'stripe/webhook',
            'stripe/connect/webhook',
        ]);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'platform.admin' => EnsurePlatformAdmin::class,
            'staff.role' => EnsureStaffRole::class,
            'client.access' => EnsureClientAccess::class,
            'tenant.subdomain' => ResolveTenantFromSubdomain::class,
            // Override the framework default so already-authenticated visitors
            // hitting a guest route land in their workspace, not the home page.
            'guest' => RedirectIfAuthenticated::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
