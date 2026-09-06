<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stripe Connect (patient -> clinic payments) onboarding fields on the tenant.
 *
 * These are ENTIRELY separate from the Cashier `stripe_id` / `stripe_pm_id`
 * columns, which belong to the clinic -> UMAHZ platform subscription. A tenant's
 * connected account is where its OWN patients' card payments settle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // The clinic's own connected Stripe (Express) account id: "acct_...".
            $table->string('stripe_connect_account_id')->nullable()->after('stripe_pm_id');

            // Coarse local mirror of onboarding state (Stripe is source of truth,
            // kept current by the return flow + account.updated webhook):
            // none | pending | connected
            $table->string('stripe_connect_status')->default('none')->after('stripe_connect_account_id');

            // Capability flags copied from the Stripe account object.
            $table->boolean('stripe_connect_charges_enabled')->default(false)->after('stripe_connect_status');
            $table->boolean('stripe_connect_payouts_enabled')->default(false)->after('stripe_connect_charges_enabled');
            $table->boolean('stripe_connect_details_submitted')->default(false)->after('stripe_connect_payouts_enabled');

            $table->index('stripe_connect_account_id');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex(['stripe_connect_account_id']);
            $table->dropColumn([
                'stripe_connect_account_id',
                'stripe_connect_status',
                'stripe_connect_charges_enabled',
                'stripe_connect_payouts_enabled',
                'stripe_connect_details_submitted',
            ]);
        });
    }
};
