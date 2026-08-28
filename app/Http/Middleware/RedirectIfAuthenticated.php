<?php

namespace App\Http\Middleware;

use App\Support\RoleRedirect;
use App\Support\Tenancy;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * The `guest` middleware. Replaces the framework default, which sends an
 * already-authenticated visitor to "/" (the marketing home) when they hit a
 * guest route like /login. Here we send them to their actual destination —
 * a staff member to their clinic subdomain, a patient to the portal, an admin
 * to /admin — so clicking "Login" while already signed in lands in the right
 * place instead of the home page.
 */
class RedirectIfAuthenticated
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        $guards = empty($guards) ? [null] : $guards;

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                $target = RoleRedirect::path($request, Auth::guard($guard)->user());

                // Cross-host targets (subdomain / portal) need an Inertia
                // location visit; same-host ones a plain redirect. Tenancy
                // picks the right one.
                return Tenancy::redirectTo($request, $target);
            }
        }

        return $next($request);
    }
}
