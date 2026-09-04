<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Billing for the CLINIC -> UMAHZ platform subscription (our own Stripe account,
 * NOT Stripe Connect / patient payments). Laravel Cashier is pointed at the
 * Tenant model as the billable customer, so the standard Cashier columns live on
 * `tenants` and the subscription tables key on a UUID `tenant_id`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Cashier customer columns.
            $table->string('stripe_id')->nullable()->index();
            $table->string('pm_type')->nullable();
            $table->string('pm_last_four', 4)->nullable();
            $table->timestamp('trial_ends_at')->nullable();

            // The saved card's PaymentMethod id (opaque Stripe token, NOT card
            // data), captured pre-charge at registration and used to start the
            // subscription on approval / detach on rejection.
            $table->string('stripe_pm_id')->nullable();

            // Our own coarse mirror of Stripe's subscription state, kept in sync
            // by webhooks + the approve flow. Stripe remains the source of truth;
            // this is for fast, tenant-scoped gating without a Stripe round-trip.
            // none -> never subscribed; active; past_due (grace); canceled.
            $table->string('subscription_status')->default('none');
            // When a payment first failed (past_due) — drives dunning/notice.
            $table->timestamp('payment_failed_at')->nullable();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->string('type');
            $table->string('stripe_id')->unique();
            $table->string('stripe_status');
            $table->string('stripe_price')->nullable();
            $table->integer('quantity')->nullable();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'stripe_status']);
        });

        Schema::create('subscription_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id');
            $table->string('stripe_id')->unique();
            $table->string('stripe_product');
            $table->string('stripe_price');
            $table->string('meter_id')->nullable();
            $table->integer('quantity')->nullable();
            $table->string('meter_event_name')->nullable();
            $table->timestamps();

            $table->index(['subscription_id', 'stripe_price']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_items');
        Schema::dropIfExists('subscriptions');

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex(['stripe_id']);
            $table->dropColumn([
                'stripe_id', 'pm_type', 'pm_last_four', 'trial_ends_at', 'stripe_pm_id',
                'subscription_status', 'payment_failed_at',
            ]);
        });
    }
};
