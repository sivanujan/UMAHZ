<?php

namespace App\Providers;

use App\Billing\PlatformBilling;
use App\Billing\StripePlatformBilling;
use App\Models\Appointment;
use App\Models\ClientIntake;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteTemplate;
use App\Models\Consent;
use App\Models\IntakeFormTemplate;
use App\Models\PractitionerProfile;
use App\Models\Tenant;
use App\PatientBilling\Contracts\PaymentProvider;
use App\PatientBilling\StripePaymentProvider;
use App\Policies\AppointmentPolicy;
use App\Policies\ClientIntakePolicy;
use App\Policies\ClinicalNotePolicy;
use App\Policies\ClinicalNoteTemplatePolicy;
use App\Policies\ConsentPolicy;
use App\Policies\IntakeFormTemplatePolicy;
use App\Policies\PractitionerProfilePolicy;
use App\Policies\TenantPolicy;
use GuzzleHttp\Client as GuzzleClient;
use Illuminate\Mail\Transport\ResendTransport;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Laravel\Cashier\Cashier;
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
        // Platform (clinic -> UMAHZ) billing gateway. Swapped for a fake in tests.
        $this->app->bind(
            PlatformBilling::class,
            StripePlatformBilling::class,
        );

        // Patient -> clinic payment provider (Stripe Connect today). All billing
        // logic depends on the PaymentProvider contract, never on Stripe
        // directly, so the processor can be swapped/extended later. Entirely
        // separate from the platform billing above. Swapped for a fake in tests.
        $this->app->singleton(
            PaymentProvider::class,
            StripePaymentProvider::class,
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        Gate::policy(Tenant::class, TenantPolicy::class);
        Gate::policy(PractitionerProfile::class, PractitionerProfilePolicy::class);
        Gate::policy(Appointment::class, AppointmentPolicy::class);
        Gate::policy(Consent::class, ConsentPolicy::class);
        Gate::policy(IntakeFormTemplate::class, IntakeFormTemplatePolicy::class);
        Gate::policy(ClientIntake::class, ClientIntakePolicy::class);
        Gate::policy(ClinicalNote::class, ClinicalNotePolicy::class);
        Gate::policy(ClinicalNoteTemplate::class, ClinicalNoteTemplatePolicy::class);

        // The CLINIC -> UMAHZ platform subscription bills the Tenant as the
        // Stripe customer (our own Stripe account, not Connect).
        Cashier::useCustomerModel(Tenant::class);

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
