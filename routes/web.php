<?php

use App\Models\Client;
use App\Models\Location;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

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

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', function () {
        $clientsCount = Client::count();
        $locationsCount = Location::count();

        $sampleAppointments = [
            [
                'id' => 101,
                'client_name' => 'Sophia Chen',
                'service' => 'Acupuncture Initial Assessment',
                'practitioner' => 'Julian Hayes, LAc',
                'time' => '10:00 AM - 11:00 AM',
                'room' => 'Acupuncture Suite A',
                'status' => 'Confirmed',
            ],
            [
                'id' => 102,
                'client_name' => 'Marcus Aurelius',
                'service' => 'Herbal Consultation & Follow-up',
                'practitioner' => 'Dr. Eleanor Vance',
                'time' => '02:30 PM - 03:15 PM',
                'room' => 'Mindfulness Room B',
                'status' => 'Scheduled',
            ],
        ];

        return Inertia::render('Dashboard/Index', [
            'stats' => [
                'todayAppointments' => count($sampleAppointments),
                'totalClients' => $clientsCount,
                'activeLocations' => $locationsCount,
                'monthlyRevenue' => '$14,280',
            ],
            'appointments' => $sampleAppointments,
        ]);
    })->name('dashboard');

    Route::get('/clients', function () {
        $clients = Client::latest()->get();
        return Inertia::render('Clients/Index', [
            'clients' => $clients,
        ]);
    })->name('clients.index');
});

require __DIR__.'/auth.php';
