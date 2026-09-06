<?php

namespace App\PatientBilling;

/**
 * Provider-neutral snapshot of a clinic's connected (sub-)account capability
 * flags. Returned by a PaymentProvider; carries no processor-specific fields.
 */
class ConnectedAccountStatus
{
    public function __construct(
        public readonly bool $chargesEnabled,
        public readonly bool $payoutsEnabled,
        public readonly bool $detailsSubmitted,
    ) {}
}
