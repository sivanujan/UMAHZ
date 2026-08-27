<?php

use App\Http\Middleware\EnsureClientAccess;
use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsureStaffRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ResolveTenantFromSubdomain;
use App\Http\Middleware\SetTenantContext;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

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
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'platform.admin' => EnsurePlatformAdmin::class,
            'staff.role' => EnsureStaffRole::class,
            'client.access' => EnsureClientAccess::class,
            'tenant.subdomain' => ResolveTenantFromSubdomain::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
