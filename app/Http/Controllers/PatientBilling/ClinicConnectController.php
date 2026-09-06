<?php

namespace App\Http\Controllers\PatientBilling;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Tenant;
use App\PatientBilling\ConnectService;
use App\PatientBilling\PlatformFee;
use App\Scopes\TenantScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Clinic "Connect payments" settings: the owner connects their OWN Stripe
 * account (Express) so patients can pay the clinic directly. Owner-only (route
 * group). Separate from the clinic -> UMAHZ subscription billing page.
 */
class ClinicConnectController extends Controller
{
    public function __construct(private readonly ConnectService $connect) {}

    public function show(Request $request): Response
    {
        $tenant = $this->currentTenant($request);

        // If we're mid-onboarding, refresh from Stripe so status is current.
        if ($tenant->stripe_connect_account_id && $tenant->stripe_connect_status !== Tenant::CONNECT_CONNECTED) {
            $this->connect->refreshStatus($tenant->refresh());
        }

        $tenant->refresh();

        return Inertia::render('Settings/Payments', [
            'connect' => [
                'status' => $tenant->stripe_connect_status,
                'account_id' => $tenant->stripe_connect_account_id,
                'charges_enabled' => (bool) $tenant->stripe_connect_charges_enabled,
                'payouts_enabled' => (bool) $tenant->stripe_connect_payouts_enabled,
                'details_submitted' => (bool) $tenant->stripe_connect_details_submitted,
                'can_accept_cards' => $tenant->canAcceptCardPayments(),
            ],
            // Surfaced read-only so the owner can see the launch policy (0%).
            'platform_fee' => [
                'bps' => PlatformFee::rateBps($tenant),
                'enabled' => PlatformFee::isEnabled($tenant),
            ],
        ]);
    }

    public function connect(Request $request): SymfonyResponse
    {
        $tenant = $this->currentTenant($request);

        $url = $this->connect->startOnboarding(
            $tenant,
            returnUrl: $tenant->appUrl('/app/settings/payments/return'),
            refreshUrl: $tenant->appUrl('/app/settings/payments/refresh'),
        );

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'patient_billing.connect.onboarding_started',
            'resource_type' => Tenant::class,
            'resource_id' => $tenant->id,
            'metadata' => ['stripe_connect_account_id' => $tenant->stripe_connect_account_id],
            'ip_address' => $request->ip(),
        ]);

        // Full-page visit out to Stripe's hosted onboarding (works from an
        // Inertia POST via the X-Inertia-Location protocol).
        return Inertia::location($url);
    }

    /** Return flow after the owner finishes (or exits) Stripe onboarding. */
    public function return(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);
        $this->connect->refreshStatus($tenant);

        return redirect()->to($tenant->appUrl('/app/settings/payments'));
    }

    /** Stripe sends the owner here when an onboarding link expires. */
    public function refresh(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);

        $url = $this->connect->startOnboarding(
            $tenant,
            returnUrl: $tenant->appUrl('/app/settings/payments/return'),
            refreshUrl: $tenant->appUrl('/app/settings/payments/refresh'),
        );

        // This is a normal browser GET (Stripe redirected the browser here), so
        // a standard away-redirect back to Stripe is correct.
        return redirect()->away($url);
    }

    protected function currentTenant(Request $request): Tenant
    {
        $membership = $request->attributes->get('staffMembership');

        return $membership?->tenant ?? Tenant::findOrFail(TenantScope::getTenantId());
    }
}
