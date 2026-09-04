<?php

namespace Tests\Feature\Billing;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The Stripe webhook keeps the tenant's coarse subscription state in sync and is
 * signature-verified + idempotent.
 */
class StripeWebhookTest extends TestCase
{
    use RefreshDatabase;

    private function clinic(): Tenant
    {
        $tenant = Tenant::create([
            'name' => 'Lotus', 'slug' => 'lotus', 'subdomain' => 'lotus',
            'status' => Tenant::STATUS_APPROVED,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
        ]);
        $tenant->forceFill(['stripe_id' => 'cus_hook_lotus'])->save();

        return $tenant;
    }

    private function sendEvent(string $type, array $object)
    {
        return $this->postJson('http://umahz.test/stripe/webhook', [
            'id' => 'evt_'.uniqid(),
            'type' => $type,
            'data' => ['object' => array_merge(['customer' => 'cus_hook_lotus'], $object)],
        ]);
    }

    public function test_failed_payment_flags_past_due_and_is_idempotent(): void
    {
        // No webhook secret configured -> Cashier skips signature checks so we
        // can drive the handler directly.
        config(['cashier.webhook.secret' => null]);
        $clinic = $this->clinic();

        $this->sendEvent('invoice.payment_failed', ['id' => 'in_1'])->assertOk();

        $clinic->refresh();
        $this->assertSame(Tenant::SUBSCRIPTION_PAST_DUE, $clinic->subscription_status);
        $firstFailedAt = $clinic->payment_failed_at;
        $this->assertNotNull($firstFailedAt);
        // Clinic keeps access during the grace period.
        $this->assertSame(Tenant::STATUS_APPROVED, $clinic->status);

        // Re-delivering the same kind of event doesn't move the first-failed marker.
        $this->sendEvent('invoice.payment_failed', ['id' => 'in_1'])->assertOk();
        $this->assertEquals($firstFailedAt, $clinic->refresh()->payment_failed_at);
    }

    public function test_successful_payment_restores_active(): void
    {
        config(['cashier.webhook.secret' => null]);
        $clinic = $this->clinic();
        $clinic->update(['subscription_status' => Tenant::SUBSCRIPTION_PAST_DUE, 'payment_failed_at' => now()]);

        $this->sendEvent('invoice.payment_succeeded', ['id' => 'in_2'])->assertOk();

        $clinic->refresh();
        $this->assertSame(Tenant::SUBSCRIPTION_ACTIVE, $clinic->subscription_status);
        $this->assertNull($clinic->payment_failed_at);
    }

    public function test_unsigned_webhook_is_rejected_when_a_secret_is_configured(): void
    {
        config(['cashier.webhook.secret' => 'whsec_test_secret']);
        $this->clinic();

        // No Stripe-Signature header -> Cashier's verification middleware rejects.
        $this->sendEvent('invoice.payment_failed', ['id' => 'in_3'])->assertForbidden();
    }
}
