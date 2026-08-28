<?php

use App\Http\Controllers\Admin\ClinicReviewController;
use App\Http\Controllers\Admin\PractitionerReviewController;
use App\Http\Controllers\ClinicSettingsController;
use App\Http\Controllers\ClinicStatusController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Http\Controllers\Portal\SettingsController;
use App\Http\Controllers\Settings\StaffInvitationController;
use App\Models\Client;
use App\Models\ClinicalNote;
use App\Support\Tenancy;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

$central = Tenancy::centralDomain();
$portalHost = Tenancy::portalHost();

/*
|--------------------------------------------------------------------------
| Central domain (umahz.com) — marketing, clinic registration, super-admin
|--------------------------------------------------------------------------
| These resolve on the root domain ONLY, never on a clinic subdomain.
*/
Route::domain($central)->group(function () {
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

    // Brand-new clinic (tenant) genesis signup — the only public path that
    // creates a new tenant. Central domain only.
    Route::middleware('guest')->group(function () {
        Route::get('clinics/register', [ClinicRegistrationController::class, 'create'])->name('clinics.register');
        Route::post('clinics/register', [ClinicRegistrationController::class, 'store']);
        // Live subdomain availability check for the wizard.
        Route::get('clinics/register/subdomain', [ClinicRegistrationController::class, 'checkSubdomain'])
            ->name('clinics.register.subdomain');
        // Email verification codes for step 1 (rate-limited against abuse).
        Route::post('clinics/register/send-code', [ClinicRegistrationController::class, 'sendCode'])
            ->middleware('throttle:5,1')->name('clinics.register.send-code');
        Route::post('clinics/register/verify-code', [ClinicRegistrationController::class, 'verifyCode'])
            ->middleware('throttle:10,1')->name('clinics.register.verify-code');
    });

    /*
    | Platform Admin — /admin/*
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
            Route::delete('/{tenant}', [ClinicReviewController::class, 'destroy'])->name('destroy');
        });

        Route::prefix('practitioners')->name('practitioners.')->group(function () {
            Route::get('/', [PractitionerReviewController::class, 'index'])->name('index');
            Route::get('/{practitionerProfile}', [PractitionerReviewController::class, 'show'])->name('show');
            Route::get('/{practitionerProfile}/document', [PractitionerReviewController::class, 'document'])->middleware('signed')->name('document');
            Route::post('/{practitionerProfile}/approve', [PractitionerReviewController::class, 'approve'])->name('approve');
            Route::post('/{practitionerProfile}/reject', [PractitionerReviewController::class, 'reject'])->name('reject');
        });
    });
});

/*
|--------------------------------------------------------------------------
| Patient portal — portal.umahz.com/portal/*
|--------------------------------------------------------------------------
| Common host for ALL patients. Tenant is resolved from the logged-in
| client's account (login-based), NOT from a subdomain — unchanged.
*/
Route::domain($portalHost)->group(function () {
    Route::get('/', fn () => redirect()->route('portal.dashboard'));

    Route::middleware(['auth', 'verified', 'client.access'])->prefix('portal')->name('portal.')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'portal'])->name('dashboard');

        Route::get('/settings', [SettingsController::class, 'show'])->name('settings');
        Route::patch('/settings/profile', [SettingsController::class, 'updateProfile'])->name('settings.profile');
        Route::put('/settings/password', [SettingsController::class, 'updatePassword'])->name('settings.password');
        Route::patch('/settings/notifications', [SettingsController::class, 'updateNotifications'])->name('settings.notifications');
        Route::patch('/settings/theme', [SettingsController::class, 'updateTheme'])->name('settings.theme');
        Route::post('/settings/delete-account', [SettingsController::class, 'requestDeletion'])->name('settings.delete-account');
    });
});

/*
|--------------------------------------------------------------------------
| Clinic staff — {subdomain}.umahz.com
|--------------------------------------------------------------------------
| The tenant is resolved from the subdomain (`tenant.subdomain`) and the
| authenticated user is verified to belong to it BEFORE any /app route runs.
| Registered last so the wildcard doesn't shadow the central/portal hosts.
*/
Route::domain('{tenant}.'.$central)->where(['tenant' => '[a-z0-9-]+'])->group(function () {
    // Landing on the subdomain root goes straight to the workspace (which in
    // turn bounces guests to login). Host-relative so it stays on the current
    // clinic subdomain — route('app.dashboard') can't be generated here
    // because its {tenant} domain parameter is unknown at this point.
    Route::get('/', fn () => redirect('/app/dashboard'));

    /*
    | Clinic application status — /clinic/status
    | The one route EnsureStaffRole exempts from its approval gate, so an
    | owner mid-review can always see where their application stands.
    */
    Route::middleware(['auth', 'verified', 'tenant.subdomain', 'staff.role'])->prefix('clinic')->name('clinic.')->group(function () {
        Route::get('/status', [ClinicStatusController::class, 'show'])->name('status');
        Route::patch('/status', [ClinicStatusController::class, 'update'])->name('status.update');
    });

    /*
    | Clinic staff — /app/* (clinic_owner, practitioner, receptionist)
    */
    Route::middleware(['auth', 'verified', 'tenant.subdomain', 'staff.role'])->prefix('app')->name('app.')->group(function () {
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
            Route::patch('/staff/{membership}', [StaffInvitationController::class, 'updateStatus'])->name('staff.update');
            Route::delete('/staff/{membership}', [StaffInvitationController::class, 'destroy'])->name('staff.destroy');

            // Clinic Settings — owner-only profile, branding & disciplines.
            Route::get('/settings', [ClinicSettingsController::class, 'show'])->name('settings');
            Route::patch('/settings/profile', [ClinicSettingsController::class, 'updateProfile'])->name('settings.profile');
            Route::patch('/settings/disciplines', [ClinicSettingsController::class, 'updateDisciplines'])->name('settings.disciplines');
            Route::post('/settings/branding', [ClinicSettingsController::class, 'updateBranding'])->name('settings.branding');

            // Locations & Rooms — owner-only management.
            Route::get('/locations', [LocationController::class, 'index'])->name('locations.index');
            Route::post('/locations', [LocationController::class, 'store'])->name('locations.store');
            Route::get('/locations/{location}', [LocationController::class, 'show'])->name('locations.show');
            Route::patch('/locations/{location}', [LocationController::class, 'update'])->name('locations.update');
            Route::patch('/locations/{location}/toggle', [LocationController::class, 'toggle'])->name('locations.toggle');
            Route::delete('/locations/{location}', [LocationController::class, 'destroy'])->name('locations.destroy');

            Route::post('/locations/{location}/rooms', [RoomController::class, 'store'])->name('rooms.store');
            Route::patch('/rooms/{room}', [RoomController::class, 'update'])->name('rooms.update');
            Route::patch('/rooms/{room}/toggle', [RoomController::class, 'toggle'])->name('rooms.toggle');
            Route::delete('/rooms/{room}', [RoomController::class, 'destroy'])->name('rooms.destroy');
        });

        // Example of a per-route Spatie permission gate on top of the tenant
        // role check above — clinical note-signing is not available to every
        // staff role (e.g. receptionists) even within /app.
        Route::post('/notes/{note}/finalize', function (ClinicalNote $note) {
            $note->update(['status' => ClinicalNote::STATUS_SIGNED, 'signed_at' => now()]);

            return back()->with('success', 'Note signed.');
        })->middleware('permission:notes.finalize')->name('notes.finalize');
    });
});

require __DIR__.'/auth.php';
