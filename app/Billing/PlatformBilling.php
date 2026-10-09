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
    public function syncSubscriptionQuantities(Tenant $tenant, bool $invoiceImmediately = false): void;

    /**
     * Discard a saved card without ever charging it — used when an application
     * is rejected. Safe to call when nothing was saved.
     */
    public function discardPaymentMethod(?string $customerId, ?string $paymentMethodId): void;

    /**
     * Create a Stripe Product for a plan or add-on.
     */
    public function createStripeProduct(string $name, ?string $description = null, array $metadata = []): string;

    /**
     * Update an existing Stripe Product.
     */
    public function updateStripeProduct(string $productId, array $params): void;

    /**
     * Create an immutable Stripe recurring Price.
     */
    public function createStripePrice(string $productId, float $amount, string $currency, string $interval, array $metadata = [], ?string $lookupKey = null): string;

    /**
     * Archive an existing Stripe Price so new subscriptions cannot use it.
     */
    public function archiveStripePrice(string $priceId): void;

    /**
     * Create a Stripe Coupon for discounts.
     *
     * @param array{
     *     percent_off?: float,
     *     amount_off?: int,
     *     currency?: string,
     *     duration: string,
     *     duration_in_months?: int,
     *     name: string
     * } $params
     */
    public function createStripeCoupon(array $params): string;

    /**
     * Create a Stripe Promotion Code for customer checkout.
     */
    public function createStripePromotionCode(string $couponId, string $code, ?int $maxRedemptions = null, ?int $expiresAt = null): string;

    /**
     * Deactivate a Stripe Promotion Code.
     */
    public function deactivateStripePromotionCode(string $promotionCodeId): void;

    /**
     * Swap subscription plan items on Stripe without any proration charge (noProrate).
     */
    public function swapSubscriptionWithoutProration(Tenant $tenant): void;
}
