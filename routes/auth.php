<?php

use App\Http\Controllers\Auth\AcceptInviteController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\Auth\WorkspaceController;
use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    // Client self-registration only. Staff accounts are invite-only.
    Route::get('register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('register', [RegisteredUserController::class, 'store']);

    // Brand-new clinic (tenant) genesis signup — the only public path that
    // creates a new tenant.
    Route::get('clinics/register', [ClinicRegistrationController::class, 'create'])->name('clinics.register');
    Route::post('clinics/register', [ClinicRegistrationController::class, 'store']);

    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])->name('password.request');
    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])->name('password.email');
    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])->name('password.reset');
    Route::post('reset-password', [NewPasswordController::class, 'store'])->name('password.update');

    Route::get('invite/accept/{staffMembership}', [AcceptInviteController::class, 'show'])
        ->middleware('signed')
        ->name('invite.accept');
    Route::post('invite/accept/{staffMembership}', [AcceptInviteController::class, 'store'])
        ->middleware('signed');
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('select-workspace', [WorkspaceController::class, 'index'])->name('workspace.select');
    Route::post('select-workspace', [WorkspaceController::class, 'store'])->name('workspace.store');

    Route::get('verify-email', EmailVerificationPromptController::class)->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('verify-email/resend', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');
});
