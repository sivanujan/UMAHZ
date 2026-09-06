<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Patient -> Clinic billing (Stripe Connect)
    |--------------------------------------------------------------------------
    | COMPLETELY SEPARATE from the clinic -> UMAHZ platform subscription
    | (config/billing.php + Laravel Cashier). Patients pay the CLINIC; money
    | settles DIRECTLY into that clinic's own connected Stripe account.
    */

    /*
    | Platform application fee, in BASIS POINTS of the payment amount
    | (100 bps = 1%). DISABLED at launch (0) => 100% of every patient payment
    | goes to the clinic; UMAHZ takes nothing. Never hardcode a fee in code;
    | always read it from here (or a future per-tenant override). Switching on a
    | percentage fee later is a config change, not a rewrite.
    */
    'platform_fee_bps' => (int) env('PATIENT_BILLING_PLATFORM_FEE_BPS', 0),

    /*
    | Default settlement currency (ISO 4217). Falls back to the tenant's own
    | currency when set. Amounts are ALWAYS integer minor units (e.g. cents).
    */
    'default_currency' => env('PATIENT_BILLING_CURRENCY', 'cad'),

    /*
    | Stripe Connect account type used for clinic onboarding. Express gives the
    | simplest Stripe-hosted onboarding + dashboard.
    */
    'connect_account_type' => env('PATIENT_BILLING_CONNECT_ACCOUNT_TYPE', 'express'),

    /*
    | Signing secret for the SEPARATE Connect webhook endpoint. This is a
    | different endpoint (and secret) from the platform-subscription
    | (Cashier) webhook — never reuse STRIPE_WEBHOOK_SECRET here.
    */
    'connect_webhook_secret' => env('STRIPE_CONNECT_WEBHOOK_SECRET'),
];
