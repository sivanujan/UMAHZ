<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Http\Controllers\Settings\StaffInvitationController;
use App\Models\Client;
use App\Models\ClinicalNote;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

Route::get('/features', function () {
    return Inertia::render('Features');
})->name('features');

Route::get('/professions', function () {
    return Inertia::render('Professions/Index');
})->name('professions.index');

Route::get('/professions/{slug}', function (string $slug) {
    $validSlugs = ['massage-therapy', 'acupuncture-tcm', 'personal-training', 'nutrition-dietetics', 'colon-hydrotherapy'];
    abort_unless(in_array($slug, $validSlugs), 404);

    return Inertia::render('Professions/Show', ['slug' => $slug]);
})->name('professions.show');

Route::get('/pricing', function () {
    return Inertia::render('Pricing');
})->name('pricing');

Route::get('/security', function () {
    return Inertia::render('Security');
})->name('security');

Route::get('/about', function () {
    return Inertia::render('About');
})->name('about');

Route::get('/faq', function () {
    return Inertia::render('FAQ');
})->name('faq');

Route::get('/contact', function () {
    return Inertia::render('Contact');
})->name('contact');

/*
|--------------------------------------------------------------------------
| Platform Admin — /admin/*
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified', 'platform.admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'admin'])->name('dashboard');
});

/*
|--------------------------------------------------------------------------
| Clinic staff — /app/* (clinic_owner, practitioner, receptionist)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified', 'staff.role'])->prefix('app')->name('app.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'app'])->name('dashboard');

    // Clinic setup wizard — owner-only, exempted from the onboarding gate
    // itself (see EnsureStaffRole) so it's always reachable.
    Route::middleware('staff.role:clinic_owner')->prefix('onboarding')->name('onboarding.')->group(function () {
        Route::get('/', [OnboardingController::class, 'show'])->name('show');
        Route::post('/profile', [OnboardingController::class, 'updateProfile'])->name('profile');
        Route::post('/branding', [OnboardingController::class, 'updateBranding'])->name('branding');
        Route::post('/hours', [OnboardingController::class, 'updateHours'])->name('hours');
    });

    Route::get('/clients', function () {
        return Inertia::render('Clients/Index', [
            'clients' => Client::latest()->get(),
        ]);
    })->name('clients.index');

    // Staff invitations are owner-only.
    Route::middleware('staff.role:clinic_owner')->group(function () {
        Route::get('/staff', [StaffInvitationController::class, 'index'])->name('staff.index');
        Route::post('/staff', [StaffInvitationController::class, 'store'])->name('staff.store');
    });

    // Example of a per-route Spatie permission gate on top of the tenant
    // role check above — clinical note-signing is not available to every
    // staff role (e.g. receptionists) even within /app.
    Route::post('/notes/{note}/finalize', function (ClinicalNote $note) {
        $note->update(['status' => ClinicalNote::STATUS_SIGNED, 'signed_at' => now()]);

        return back()->with('success', 'Note signed.');
    })->middleware('permission:notes.finalize')->name('notes.finalize');
});

/*
|--------------------------------------------------------------------------
| Client portal — /portal/*
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified', 'client.access'])->prefix('portal')->name('portal.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'portal'])->name('dashboard');
});

require __DIR__.'/auth.php';
