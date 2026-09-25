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
use App\Models\ScribeSession;
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
use App\Policies\ScribeSessionPolicy;
use App\Policies\TenantPolicy;
use App\Scribe\AssemblyAiTranscriptionProvider;
use App\Scribe\Contracts\DraftingProvider;
use App\Scribe\Contracts\ObjectiveMeasurementSource;
use App\Scribe\Contracts\TranscriptionProvider;
use App\Scribe\Drafting\FakeDraftingProvider;
use App\Scribe\Drafting\NullObjectiveMeasurementSource;
use App\Scribe\Drafting\OpenRouterDraftingProvider;
use App\Scribe\FakeTranscriptionProvider;
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
        // Tell Cashier not to register its default webhook route so that our custom
        // App\Http\Controllers\StripeWebhookController (with tenant sync) can be used.
        Cashier::ignoreRoutes();

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

        // AI Scribe providers. Scribe depends only on these contracts, so a
        // provider (e.g. a Canadian-hosted one that passes privacy review) is
        // swapped here via config/scribe.php — no Scribe code changes.
        $this->app->singleton(TranscriptionProvider::class, fn () => match (config('scribe.transcription.driver')) {
            'fake' => new FakeTranscriptionProvider,
            default => new AssemblyAiTranscriptionProvider,
        });

        // Phase 2: profession-specific AI draft (Claude Haiku 4.5 via OpenRouter by default).
        $this->app->singleton(DraftingProvider::class, fn () => match (config('scribe.drafting.driver')) {
            'fake' => new FakeDraftingProvider,
            default => new OpenRouterDraftingProvider,
        });

        // Phase 4 placeholder (approved UMAHZ Motion results plug in here).
        $this->app->singleton(ObjectiveMeasurementSource::class, NullObjectiveMeasurementSource::class);
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
        Gate::policy(ScribeSession::class, ScribeSessionPolicy::class);

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
