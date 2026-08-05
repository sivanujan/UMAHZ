<?php

use App\Models\Client;
use App\Models\Location;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('dashboard');
});

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
