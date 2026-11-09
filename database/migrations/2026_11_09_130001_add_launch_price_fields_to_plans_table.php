<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (! Schema::hasColumn('plans', 'show_launch_price')) {
                $table->boolean('show_launch_price')->default(false)->after('badge');
            }
            if (! Schema::hasColumn('plans', 'launch_badge_text')) {
                $table->string('launch_badge_text', 50)->nullable()->default('Launch price')->after('show_launch_price');
            }
            if (! Schema::hasColumn('plans', 'original_price_monthly')) {
                $table->decimal('original_price_monthly', 10, 2)->nullable()->after('launch_badge_text');
            }
            if (! Schema::hasColumn('plans', 'original_price_annual')) {
                $table->decimal('original_price_annual', 10, 2)->nullable()->after('original_price_monthly');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn([
                'show_launch_price',
                'launch_badge_text',
                'original_price_monthly',
                'original_price_annual',
            ]);
        });
    }
};

