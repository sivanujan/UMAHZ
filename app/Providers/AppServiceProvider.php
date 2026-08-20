<?php

namespace App\Providers;

use App\Models\PractitionerProfile;
use App\Models\Tenant;
use App\Policies\PractitionerProfilePolicy;
use App\Policies\TenantPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('production') || str_starts_with(config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }

        Gate::policy(Tenant::class, TenantPolicy::class);
        Gate::policy(PractitionerProfile::class, PractitionerProfilePolicy::class);
    }
}
