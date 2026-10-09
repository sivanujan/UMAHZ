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

    protected function setUp(): void
    {
        parent::setUp();
        config(['cashier.webhook.secret' => 'whsec_test_secret_for_phpunit_12345']);
    }

    private function sendEvent(string $type, array $object, bool $unsigned = false)
    {
        $payload = [
            'id' => 'evt_'.uniqid(),
            'type' => $type,
            'data' => ['object' => array_merge(['customer' => 'cus_hook_lotus'], $object)],
        ];

        $secret = config('cashier.webhook.secret') ?: 'whsec_test_secret_for_phpunit_12345';

        if ($unsigned || empty($secret)) {
            return $this->postJson('http://umahz.test/stripe/webhook', $payload);
        }

        $json = json_encode($payload);
        $timestamp = time();
        $signature = hash_hmac('sha256', "{$timestamp}.{$json}", $secret);
        $header = "t={$timestamp},v1={$signature}";

        return $this->call(
            'POST',
            'http://umahz.test/stripe/webhook',
            [],
            [],
            [],
            ['HTTP_STRIPE_SIGNATURE' => $header, 'CONTENT_TYPE' => 'application/json'],
            $json
        );
    }

    public function test_failed_payment_flags_past_due_and_is_idempotent(): void
    {
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
        $clinic = $this->clinic();
        $clinic->update(['subscription_status' => Tenant::SUBSCRIPTION_PAST_DUE, 'payment_failed_at' => now()]);

        $this->sendEvent('invoice.payment_succeeded', ['id' => 'in_2'])->assertOk();

        $clinic->refresh();
        $this->assertSame(Tenant::SUBSCRIPTION_ACTIVE, $clinic->subscription_status);
        $this->assertNull($clinic->payment_failed_at);
    }

    public function test_unsigned_webhook_is_rejected_when_a_secret_is_configured(): void
    {
        $this->clinic();

        // No Stripe-Signature header -> Cashier's verification middleware rejects.
        $this->sendEvent('invoice.payment_failed', ['id' => 'in_3'], unsigned: true)->assertForbidden();
    }

    public function test_subscription_updated_syncs_plan_and_seats(): void
    {
        $clinic = $this->clinic();

        $plan = \App\Models\Plan::create([
            'name' => 'Scale',
            'slug' => 'scale',
            'is_active' => true,
        ]);
        $price = $plan->prices()->create([
            'interval' => 'year',
            'base_price' => 990.00,
            'extra_practitioner_price' => 350.00,
            'stripe_base_price_id' => 'price_scale_annual_123',
            'stripe_extra_seat_price_id' => 'price_scale_seat_123',
            'is_active' => true,
            'currency' => 'CAD',
        ]);

        $this->sendEvent('customer.subscription.updated', [
            'id' => 'sub_test_123',
            'status' => 'active',
            'items' => [
                'data' => [
                    [
                        'id' => 'si_base',
                        'price' => [
                            'id' => 'price_scale_annual_123',
                            'product' => 'prod_scale_123',
                        ],
                        'quantity' => 1,
                    ],
                    [
                        'id' => 'si_seats',
                        'price' => [
                            'id' => 'price_scale_seat_123',
                            'product' => 'prod_scale_123',
                        ],
                        'quantity' => 3,
                    ],
                ],
            ],
        ])->assertOk();

        $clinic->refresh();
        $this->assertSame($plan->id, $clinic->plan_id);
        $this->assertSame('year', $clinic->billing_interval);
        $this->assertSame(3, $clinic->extra_practitioner_seats);
    }

    public function test_customer_subscription_deleted_marks_canceled_and_read_export_still_works(): void
    {
        $clinic = $this->clinic();
        $clinic->update([
            'onboarding_completed_at' => now(),
        ]);

        $owner = \App\Models\User::factory()->create(['email' => 'owner@lotus.test', 'email_verified_at' => now()]);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'clinic_owner', 'guard_name' => 'web']);
        $owner->assignRole('clinic_owner');
        $clinic->staffMemberships()->create([
            'user_id' => $owner->id,
            'role' => 'clinic_owner',
            'status' => 'active',
        ]);

        // Trigger subscription deleted webhook
        $this->sendEvent('customer.subscription.deleted', [
            'id' => 'sub_del_123',
            'status' => 'canceled',
        ])->assertOk();

        $clinic->refresh();
        $this->assertSame(Tenant::SUBSCRIPTION_CANCELED, $clinic->subscription_status);

        // Read/export still works!
        $this->actingAs($owner)
            ->get("http://{$clinic->subdomain}.umahz.test/app/dashboard")
            ->assertOk();

        // Mutating/write routes are blocked by EnsureSubscriptionWriteAccess
        $this->actingAs($owner)
            ->postJson("http://{$clinic->subdomain}.umahz.test/app/staff", [
                'email' => 'newprac@lotus.test',
                'role' => 'practitioner',
            ])
            ->assertStatus(403)
            ->assertJson([
                'code' => 'subscription_canceled',
            ]);

        // Idempotency: re-delivering does not crash and leaves canceled
        $this->sendEvent('customer.subscription.deleted', [
            'id' => 'sub_del_123',
            'status' => 'canceled',
        ])->assertOk();

        $this->assertSame(Tenant::SUBSCRIPTION_CANCELED, $clinic->refresh()->subscription_status);
    }

    public function test_payment_succeeded_clears_restricted_overdue_and_is_idempotent(): void
    {
        $clinic = $this->clinic();
        $clinic->update([
            'subscription_status' => Tenant::SUBSCRIPTION_RESTRICTED_OVERDUE,
            'payment_failed_at' => now()->subDays(20),
            'status' => Tenant::STATUS_SUSPENDED,
        ]);

        $this->sendEvent('invoice.payment_succeeded', ['id' => 'in_cleared'])->assertOk();

        $clinic->refresh();
        $this->assertSame(Tenant::SUBSCRIPTION_ACTIVE, $clinic->subscription_status);
        $this->assertNull($clinic->payment_failed_at);
        $this->assertSame(Tenant::STATUS_APPROVED, $clinic->status);

        // Idempotency
        $this->sendEvent('invoice.payment_succeeded', ['id' => 'in_cleared'])->assertOk();
        $this->assertSame(Tenant::SUBSCRIPTION_ACTIVE, $clinic->refresh()->subscription_status);
        $this->assertNull($clinic->payment_failed_at);
    }
}
