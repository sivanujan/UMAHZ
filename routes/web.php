<?php

use App\Http\Controllers\Admin\ClinicReviewController;
use App\Http\Controllers\Admin\PractitionerReviewController;
use App\Http\Controllers\ClinicStatusController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Http\Controllers\Portal\SettingsController;
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

    Route::prefix('clinics')->name('clinics.')->group(function () {
        Route::get('/', [ClinicReviewController::class, 'index'])->name('index');
        Route::get('/{tenant}', [ClinicReviewController::class, 'show'])->name('show');
        Route::get('/{tenant}/document', [ClinicReviewController::class, 'document'])->middleware('signed')->name('document');
        Route::post('/{tenant}/approve', [ClinicReviewController::class, 'approve'])->name('approve');
        Route::post('/{tenant}/request-info', [ClinicReviewController::class, 'requestMoreInfo'])->name('request-info');
        Route::post('/{tenant}/reject', [ClinicReviewController::class, 'reject'])->name('reject');
    });

    Route::prefix('practitioners')->name('practitioners.')->group(function () {
        Route::get('/', [PractitionerReviewController::class, 'index'])->name('index');
        Route::get('/{practitionerProfile}', [PractitionerReviewController::class, 'show'])->name('show');
        Route::get('/{practitionerProfile}/document', [PractitionerReviewController::class, 'document'])->middleware('signed')->name('document');
        Route::post('/{practitionerProfile}/approve', [PractitionerReviewController::class, 'approve'])->name('approve');
        Route::post('/{practitionerProfile}/reject', [PractitionerReviewController::class, 'reject'])->name('reject');
    });
});

/*
|--------------------------------------------------------------------------
| Clinic application status — /clinic/status
|--------------------------------------------------------------------------
| Reachable regardless of the tenant's approval status (it's the one route
| EnsureStaffRole exempts from its approval gate), so an owner mid-review
| can always see where their application stands.
*/
Route::middleware(['auth', 'verified', 'staff.role'])->prefix('clinic')->name('clinic.')->group(function () {
    Route::get('/status', [ClinicStatusController::class, 'show'])->name('status');
    Route::patch('/status', [ClinicStatusController::class, 'update'])->name('status.update');
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

    Route::get('/settings', [SettingsController::class, 'show'])->name('settings');
    Route::patch('/settings/profile', [SettingsController::class, 'updateProfile'])->name('settings.profile');
    Route::put('/settings/password', [SettingsController::class, 'updatePassword'])->name('settings.password');
    Route::patch('/settings/notifications', [SettingsController::class, 'updateNotifications'])->name('settings.notifications');
    Route::patch('/settings/theme', [SettingsController::class, 'updateTheme'])->name('settings.theme');
    Route::post('/settings/delete-account', [SettingsController::class, 'requestDeletion'])->name('settings.delete-account');
});

require __DIR__.'/auth.php';
