<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Clinic-branded public home page settings.
     *
     * Stored as a single jsonb column so we can freely iterate on the
     * structure without more schema migrations. The expected shape is:
     *
     * {
     *   "tagline":          string|null,      // e.g. "Healing you, naturally"
     *   "description":      string|null,      // 1–3 sentence clinic overview
     *   "cover_image_url":  string|null,      // full URL to cover/hero image
     *   "show_hours":       bool,             // whether to render business hours
     *   "show_address":     bool,             // whether to show address block
     *   "social": {
     *     "instagram":  string|null,
     *     "facebook":   string|null,
     *     "twitter":    string|null,
     *     "linkedin":   string|null,
     *     "tiktok":     string|null,
     *     "youtube":    string|null,
     *     "website":    string|null,
     *   },
     *   "custom_buttons": [                   // up to 3 extra CTA buttons
     *     { "label": string, "url": string }
     *   ]
     * }
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->jsonb('homepage_settings')->nullable()->after('brand_color');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('homepage_settings');
        });
    }
};
