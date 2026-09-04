<?php

namespace Tests\Concerns;

use App\Billing\FakePlatformBilling;
use App\Billing\PlatformBilling;
use Illuminate\Testing\TestResponse;

/**
 * Helpers for the two-step clinic registration (card capture -> finalize) so
 * tests don't hit live Stripe. Requires the consuming test to boot the app
 * (RefreshDatabase etc.) and to have faked local storage for the license file.
 */
trait RegistersClinics
{
    protected function fakePlatformBilling(): FakePlatformBilling
    {
        $fake = new FakePlatformBilling();
        $this->app->instance(PlatformBilling::class, $fake);

        return $fake;
    }

    /**
     * Run the full register flow: prepare (saves a card via the fake gateway)
     * then finalize (creates the tenant). Returns the finalize response.
     */
    protected function registerClinicThroughPayment(array $payload): TestResponse
    {
        $this->fakePlatformBilling();

        $prepare = $this->postJson('http://umahz.test/clinics/register/prepare', $payload);
        $prepare->assertOk();

        return $this->post('http://umahz.test/clinics/register', [
            'pending_id' => $prepare->json('pending_id'),
        ]);
    }
}
