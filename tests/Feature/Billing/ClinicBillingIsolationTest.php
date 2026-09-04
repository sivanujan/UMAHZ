<?php

namespace Tests\Feature\Billing;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Billing data is per-tenant: one clinic's subscription state can never be
 * read or mutated through another clinic's context.
 */
class ClinicBillingIsolationTest extends TestCase
{
    use RefreshDatabase;

    private function clinic(string $sub, string $customer): Tenant
    {
        $tenant = Tenant::create([
            'name' => ucfirst($sub), 'slug' => $sub, 'subdomain' => $sub,
            'status' => Tenant::STATUS_APPROVED,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
        ]);
        $tenant->forceFill(['stripe_id' => $customer])->save();

        return $tenant;
    }

    public function test_a_webhook_for_one_clinic_never_touches_another(): void
    {
        config(['cashier.webhook.secret' => null]);
        $a = $this->clinic('clinic-a', 'cus_A');
        $b = $this->clinic('clinic-b', 'cus_B');

        // A payment failure for clinic A's customer.
        $this->postJson('http://umahz.test/stripe/webhook', [
            'id' => 'evt_x', 'type' => 'invoice.payment_failed',
            'data' => ['object' => ['customer' => 'cus_A', 'id' => 'in_x']],
        ])->assertOk();

        $this->assertSame(Tenant::SUBSCRIPTION_PAST_DUE, $a->refresh()->subscription_status);
        // Clinic B is completely untouched.
        $this->assertSame(Tenant::SUBSCRIPTION_ACTIVE, $b->refresh()->subscription_status);
    }

    public function test_subscription_rows_are_scoped_to_their_own_tenant(): void
    {
        $a = $this->clinic('clinic-a', 'cus_A');
        $b = $this->clinic('clinic-b', 'cus_B');

        $a->subscriptions()->create([
            'type' => Tenant::PLATFORM_SUBSCRIPTION, 'stripe_id' => 'sub_A',
            'stripe_status' => 'active', 'stripe_price' => 'price_x', 'quantity' => 1,
        ]);
        $b->subscriptions()->create([
            'type' => Tenant::PLATFORM_SUBSCRIPTION, 'stripe_id' => 'sub_B',
            'stripe_status' => 'active', 'stripe_price' => 'price_x', 'quantity' => 1,
        ]);

        $this->assertSame(['sub_A'], $a->subscriptions()->pluck('stripe_id')->all());
        $this->assertSame(['sub_B'], $b->subscriptions()->pluck('stripe_id')->all());
    }
}
