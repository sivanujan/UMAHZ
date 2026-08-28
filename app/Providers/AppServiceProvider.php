<?php

namespace App\Providers;

use App\Models\PractitionerProfile;
use App\Models\Tenant;
use App\Policies\PractitionerProfilePolicy;
use App\Policies\TenantPolicy;
use GuzzleHttp\Client as GuzzleClient;
use Illuminate\Mail\Transport\ResendTransport;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Resend\Client as ResendClient;
use Resend\Transporters\HttpTransporter;
use Resend\ValueObjects\ApiKey;
use Resend\ValueObjects\Transporter\BaseUri;
use Resend\ValueObjects\Transporter\Headers;

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

        $caPath = storage_path('cacert.pem');
        if (file_exists($caPath)) {
            Http::globalOptions([
                'verify' => $caPath,
            ]);
        }

        Mail::extend('resend', function (array $config = []) use ($caPath) {
            $apiKey = $config['key'] ?? config('services.resend.key');
            $api = ApiKey::from($apiKey);
            $baseUri = BaseUri::from(getenv('RESEND_BASE_URL') ?: 'api.resend.com');
            $headers = Headers::withAuthorization($api);

            $guzzleOptions = [];
            if (file_exists($caPath)) {
                $guzzleOptions['verify'] = $caPath;
            } elseif (file_exists('C:\\Users\\Sivanujan_PC\\cacert.pem')) {
                $guzzleOptions['verify'] = 'C:\\Users\\Sivanujan_PC\\cacert.pem';
            }

            $client = new GuzzleClient($guzzleOptions);
            $transporter = new HttpTransporter($client, $baseUri, $headers);
            $resendClient = new ResendClient($transporter);

            return new ResendTransport($resendClient);
        });
    }
}
