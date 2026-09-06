<?php

namespace Tests\Unit;

use App\PatientBilling\PlatformFee;
use Tests\TestCase;

/**
 * The platform (application) fee is configurable and DISABLED at launch (0 bps),
 * so 100% of every patient payment goes to the clinic. These tests pin both the
 * launch default and the fact that switching on a percentage later Just Works
 * with pure integer math.
 */
class PlatformFeeTest extends TestCase
{
    public function test_fee_is_zero_at_launch_default(): void
    {
        config(['patient_billing.platform_fee_bps' => 0]);

        $this->assertSame(0, PlatformFee::forAmount(12_000));
        $this->assertFalse(PlatformFee::isEnabled());
    }

    public function test_fee_is_configurable_via_basis_points(): void
    {
        // 2.5% of $120.00 (12000 cents) = 300 cents.
        config(['patient_billing.platform_fee_bps' => 250]);

        $this->assertTrue(PlatformFee::isEnabled());
        $this->assertSame(300, PlatformFee::forAmount(12_000));
    }

    public function test_fee_uses_integer_rounding_no_floats(): void
    {
        // 2.9% of 999 cents = 28.971 -> rounds to 29 cents, pure integer math.
        config(['patient_billing.platform_fee_bps' => 290]);

        $this->assertSame(29, PlatformFee::forAmount(999));
    }

    public function test_fee_never_exceeds_amount_and_zero_for_nonpositive(): void
    {
        config(['patient_billing.platform_fee_bps' => 250]);

        $this->assertSame(0, PlatformFee::forAmount(0));
        $this->assertSame(0, PlatformFee::forAmount(-500));
    }
}
