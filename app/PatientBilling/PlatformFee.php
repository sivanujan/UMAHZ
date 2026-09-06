<?php

namespace App\PatientBilling;

use App\Models\Tenant;

/**
 * Computes the platform (application) fee for a patient payment, in integer
 * minor units, from a configurable basis-point rate.
 *
 * DISABLED at launch: config('patient_billing.platform_fee_bps') defaults to 0,
 * so the fee is always 0 and 100% of every payment goes to the clinic. The rate
 * is NEVER hardcoded here — switching on a percentage fee later is purely a
 * config (or future per-tenant) change; this code path already supports it.
 */
class PlatformFee
{
    /**
     * @param  int  $amount  Payment amount in minor units.
     * @param  Tenant|null  $tenant  Reserved for a future per-tenant override.
     * @return int Application fee in minor units (0 when disabled).
     */
    public static function forAmount(int $amount, ?Tenant $tenant = null): int
    {
        if ($amount <= 0) {
            return 0;
        }

        $bps = self::rateBps($tenant);

        if ($bps <= 0) {
            return 0;
        }

        // Pure integer math: (amount * bps) / 10_000, rounded to nearest cent.
        // No floating point anywhere in the money path.
        $fee = intdiv($amount * $bps + 5_000, 10_000);

        // The fee can never exceed the payment.
        return min($fee, $amount);
    }

    /**
     * Effective fee rate in basis points. Reads config today; a per-tenant
     * override can slot in here later without touching callers.
     */
    public static function rateBps(?Tenant $tenant = null): int
    {
        return (int) config('patient_billing.platform_fee_bps', 0);
    }

    public static function isEnabled(?Tenant $tenant = null): bool
    {
        return self::rateBps($tenant) > 0;
    }
}
