<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Release abandoned clinic registrations (card never saved) so their reserved
// subdomain frees up and no junk/orphan records linger.
Schedule::command('registrations:prune-expired')->everyTenMinutes();
