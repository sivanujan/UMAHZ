<?php

namespace Tests\Feature\PatientBilling;

use App\PatientBilling\StripePaymentProvider;
use App\PatientBilling\WebhookEvent;
use App\PatientBilling\WebhookVerificationException;
use Tests\TestCase;

/**
 * Exercises the REAL Stripe implementation of PaymentProvider::parseWebhook:
 * genuine Stripe signature verification (HMAC, offline) and normalization of
 * Stripe-shaped payloads into neutral WebhookEvents. The rest of the provider
 * (account/charge/refund) makes network calls and is verified through the fake
 * elsewhere.
 */
class StripePaymentProviderTest extends TestCase
{
    private string $secret = 'whsec_stripe_provider_secret';

    protected function setUp(): void
    {
        parent::setUp();
        config(['patient_billing.connect_webhook_secret' => $this->secret]);
    }

    private function sign(array $event): array
    {
        $payload = json_encode($event);
        $ts = time();
        $sig = 't='.$ts.',v1='.hash_hmac('sha256', "{$ts}.{$payload}", $this->secret);

        return [$payload, $sig];
    }

    public function test_it_rejects_a_forged_signature(): void
    {
        [$payload] = $this->sign(['id' => 'evt_x', 'type' => 'account.updated']);

        $this->expectException(WebhookVerificationException::class);
        (new StripePaymentProvider)->parseWebhook($payload, 't=1,v1=deadbeef');
    }

    public function test_it_rejects_a_missing_signature(): void
    {
        $this->expectException(WebhookVerificationException::class);
        (new StripePaymentProvider)->parseWebhook('{}', '');
    }

    public function test_it_normalizes_a_stripe_account_updated_event(): void
    {
        [$payload, $sig] = $this->sign([
            'id' => 'evt_acct',
            'type' => 'account.updated',
            'data' => ['object' => [
                'id' => 'acct_123',
                'charges_enabled' => true,
                'payouts_enabled' => false,
                'details_submitted' => true,
            ]],
        ]);

        $event = (new StripePaymentProvider)->parseWebhook($payload, $sig);

        $this->assertSame(WebhookEvent::TYPE_ACCOUNT_UPDATED, $event->type);
        $this->assertSame('acct_123', $event->accountId);
        $this->assertTrue($event->accountStatus->chargesEnabled);
        $this->assertFalse($event->accountStatus->payoutsEnabled);
    }

    public function test_it_normalizes_a_stripe_payment_intent_succeeded_event(): void
    {
        [$payload, $sig] = $this->sign([
            'id' => 'evt_pi',
            'type' => 'payment_intent.succeeded',
            'data' => ['object' => ['id' => 'pi_123', 'latest_charge' => 'ch_123']],
        ]);

        $event = (new StripePaymentProvider)->parseWebhook($payload, $sig);

        $this->assertSame(WebhookEvent::TYPE_PAYMENT_SUCCEEDED, $event->type);
        $this->assertSame('pi_123', $event->paymentReference);
        $this->assertSame('ch_123', $event->chargeReference);
    }

    public function test_unknown_event_types_normalize_to_unknown(): void
    {
        [$payload, $sig] = $this->sign(['id' => 'evt_o', 'type' => 'customer.created', 'data' => ['object' => []]]);

        $event = (new StripePaymentProvider)->parseWebhook($payload, $sig);

        $this->assertSame(WebhookEvent::TYPE_UNKNOWN, $event->type);
    }
}
