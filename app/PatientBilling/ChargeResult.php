<?php

namespace App\PatientBilling;

/**
 * Provider-neutral result of charging an invoice. `clientToken` is the secret a
 * provider's client-side SDK uses to complete the charge (Stripe calls this a
 * PaymentIntent client_secret); other processors expose an equivalent. The
 * payment is only settled once the provider confirms it (webhook), keeping the
 * provider the source of truth.
 */
class ChargeResult
{
    public function __construct(
        public readonly string $reference,          // provider charge/intent id
        public readonly string $clientToken,        // client-side completion secret
        public readonly string $status,
        public readonly string $connectedAccountId, // account the funds settle into
        public readonly int $amount,
        public readonly int $applicationFeeAmount,
        public readonly ?string $chargeReference = null,
    ) {}
}
