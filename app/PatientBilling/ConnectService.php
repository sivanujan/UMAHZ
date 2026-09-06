<?php

namespace App\PatientBilling;

use App\Models\Tenant;
use App\PatientBilling\Contracts\PaymentProvider;

/**
 * Orchestrates Stripe Connect onboarding for a clinic and keeps the tenant's
 * local status mirror in sync with Stripe (the source of truth). Separate from
 * the clinic -> UMAHZ subscription onboarding entirely.
 */
class ConnectService
{
    public function __construct(private readonly PaymentProvider $provider) {}

    /**
     * Ensure the clinic has a connected account and return a fresh onboarding
     * link to send the owner to. Marks the tenant pending until Stripe reports
     * the account as fully enabled.
     */
    public function startOnboarding(Tenant $tenant, string $returnUrl, string $refreshUrl): string
    {
        if (! $tenant->stripe_connect_account_id) {
            $accountId = $this->provider->createConnectedAccount($tenant);
            $tenant->forceFill([
                'stripe_connect_account_id' => $accountId,
                'stripe_connect_status' => Tenant::CONNECT_PENDING,
            ])->save();
        } elseif ($tenant->stripe_connect_status === Tenant::CONNECT_NONE) {
            $tenant->forceFill(['stripe_connect_status' => Tenant::CONNECT_PENDING])->save();
        }

        return $this->provider->createOnboardingLink(
            $tenant->stripe_connect_account_id,
            $returnUrl,
            $refreshUrl,
        );
    }

    /**
     * Pull the latest capability flags from Stripe and update the tenant. Called
     * on the onboarding return flow and from the account.updated webhook.
     *
     * @return bool Whether the account became newly connected during this sync.
     */
    public function refreshStatus(Tenant $tenant): bool
    {
        if (! $tenant->stripe_connect_account_id) {
            return false;
        }

        $status = $this->provider->getConnectedAccountStatus($tenant->stripe_connect_account_id);

        return $this->applyStatus($tenant, $status);
    }

    /**
     * Apply a known status snapshot (e.g. from an account.updated webhook
     * payload) to the tenant. Idempotent: maps to a fixed target state.
     *
     * @return bool Whether the account became newly connected.
     */
    public function applyStatus(Tenant $tenant, ConnectedAccountStatus $status): bool
    {
        $wasConnected = $tenant->stripe_connect_status === Tenant::CONNECT_CONNECTED;

        $connected = $status->chargesEnabled && $status->detailsSubmitted;

        $tenant->forceFill([
            'stripe_connect_charges_enabled' => $status->chargesEnabled,
            'stripe_connect_payouts_enabled' => $status->payoutsEnabled,
            'stripe_connect_details_submitted' => $status->detailsSubmitted,
            'stripe_connect_status' => $connected ? Tenant::CONNECT_CONNECTED : Tenant::CONNECT_PENDING,
        ])->save();

        return $connected && ! $wasConnected;
    }
}
