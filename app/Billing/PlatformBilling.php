<?php

namespace App\Billing;

use App\Models\Tenant;

/**
 * The CLINIC -> UMAHZ platform billing gateway (our own Stripe account, NOT
 * Stripe Connect / patient payments). Every raw Stripe interaction for the
 * platform subscription goes through this contract so the money logic can be
 * driven by a deterministic fake in tests — no live Stripe calls, and we can
 * assert "a rejected clinic is never charged".
 */
interface PlatformBilling
{
    /**
     * Create a Stripe customer for a pending registration (no Tenant yet) and
     * return its id. No card is attached and nothing is charged.
     */
    public function createCustomer(string $email, string $name): string;

    /**
     * Create a SetupIntent to collect + save a card on the customer (validates
     * the card, does NOT charge). Returns [id, client_secret].
     *
     * @return array{id:string, client_secret:string}
     */
    public function createSetupIntent(string $customerId): array;

    /**
     * The payment method id a SetupIntent saved, or null if it hasn't succeeded.
     * Used to confirm a real card was saved before submitting the application.
     */
    public function savedPaymentMethod(string $setupIntentId): ?string;

    /**
     * Start the monthly platform subscription for an approved tenant using its
     * saved card. THIS IS THE FIRST CHARGE — only ever called on approval.
     */
    public function startMonthlySubscription(Tenant $tenant, string $paymentMethodId): void;

    /**
     * Sync the subscription item quantities (e.g. additional FT/PT practitioners)
     * on Stripe when practitioner counts change.
     */
    public function syncSubscriptionQuantities(Tenant $tenant): void;

    /**
     * Discard a saved card without ever charging it — used when an application
     * is rejected. Safe to call when nothing was saved.
     */
    public function discardPaymentMethod(string $customerId, ?string $paymentMethodId): void;
}
