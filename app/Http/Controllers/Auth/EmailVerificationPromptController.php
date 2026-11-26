<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\AuthBranding;
use App\Support\RoleRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationPromptController extends Controller
{
    /**
     * Show the "check your email" notice, or send the user on if they're
     * already verified.
     */
    public function __invoke(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect(RoleRedirect::path($request, $user));
        }

        $branding = AuthBranding::resolve($request);

        return Inertia::render('Auth/VerifyEmail', array_merge($branding['props'], [
            'status' => session('status'),
            'email' => $user->email,
        ]));
    }
}
