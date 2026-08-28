<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\RoleRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'status' => session('status'),
            'demoCredentialsEnabled' => ! app()->environment('production'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request): HttpResponse|RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors([
                'email' => 'The provided credentials do not match our records.',
            ])->onlyInput('email');
        }

        $request->session()->regenerate();

        $target = RoleRedirect::path($request, $request->user());
        $host = parse_url($target, PHP_URL_HOST);

        // A staff/patient target lives on another host (clinic subdomain /
        // portal). The login form is an Inertia XHR, which can't follow a
        // cross-origin redirect — hand it a full-page location visit instead.
        // Same-host targets (admin, home) keep the normal intended() flow.
        if ($host && $host !== $request->getHost()) {
            return Inertia::location($target);
        }

        return redirect()->intended($target);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
