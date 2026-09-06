<?php

namespace App\PatientBilling;

/**
 * A provider-neutral, already-verified webhook event. A PaymentProvider parses
 * and signature-verifies a raw processor webhook, then hands back one of these
 * so the billing layer (controller + services) never touches processor-specific
 * payload shapes. `id` is the provider event id, used for idempotency.
 */
class WebhookEvent
{
    public const TYPE_ACCOUNT_UPDATED = 'account.updated';

    public const TYPE_PAYMENT_SUCCEEDED = 'payment.succeeded';

    public const TYPE_PAYMENT_FAILED = 'payment.failed';

    public const TYPE_REFUNDED = 'payment.refunded';

    public const TYPE_UNKNOWN = 'unknown';

    public function __construct(
        public readonly string $id,
        public readonly string $type,
        public readonly ?string $accountId = null,
        public readonly ?ConnectedAccountStatus $accountStatus = null,
        public readonly ?string $paymentReference = null,
        public readonly ?string $chargeReference = null,
    ) {}
}
