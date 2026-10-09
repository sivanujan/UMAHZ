<?php

use App\Models\PlanPrice;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Confirm all active plans with extra practitioner pricing ($35/mo for Professional, $30/mo for Signature)
        // so that additional practitioner seats dynamically compute in billing.
        PlanPrice::where('extra_practitioner_price', '>', 0)->each(function (PlanPrice $price) {
            $fields = (array) ($price->needs_review_fields ?? []);
            $remaining = array_values(array_filter($fields, fn ($f) => $f !== 'extra_practitioner_price'));

            $price->update([
                'needs_review' => count($remaining) > 0,
                'needs_review_fields' => count($remaining) > 0 ? $remaining : null,
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse needed
    }
};
