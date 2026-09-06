<?php

namespace App\PatientBilling;

/**
 * Provider-neutral result of refunding a payment. Refunds are a later-phase
 * feature; the contract carries this so switching one on is not a rewrite.
 */
class RefundResult
{
    public function __construct(
        public readonly string $reference,  // provider refund id
        public readonly int $amount,
        public readonly string $status,
    ) {}
}
