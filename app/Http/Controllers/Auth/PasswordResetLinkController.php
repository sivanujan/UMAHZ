<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\AuthBranding;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    public const NEUTRAL_SENT_MESSAGE = "If an account exists for this email, we've sent a password reset link.";

    /**
     * Display the "forgot password" view.
     */
    public function create(Request $request): Response
    {
        $branding = AuthBranding::resolve($request);

        return Inertia::render('Auth/ForgotPassword', array_merge($branding['props'], [
            'status' => session('status'),
            'prefilledEmail' => (string) $request->query('email', ''),
        ]));
    }

    /**
     * Email a password reset link to the given address. Always returns a neutral
     * confirmation message so account existence is never disclosed.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        Password::sendResetLink($request->only('email'));

        return back()->with('status', self::NEUTRAL_SENT_MESSAGE);
    }
}
