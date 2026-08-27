<?php

namespace Tests\Feature;

use App\Models\Tenant;
use Closure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SubdomainBackfillTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Drive the real migration's backfill against a legacy tenant row that has
     * no subdomain, and confirm it receives a valid, unique one.
     */
    public function test_backfill_fills_a_legacy_tenant(): void
    {
        // A pre-existing clinic already holds the obvious slug-based subdomain,
        // so the legacy row must be given a non-colliding value.
        Tenant::create([
            'name' => 'Existing Clinic',
            'slug' => 'existing-clinic',
            'subdomain' => 'legacy-clinic',
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $legacy = Tenant::create([
            'name' => 'Legacy Clinic',
            'slug' => 'legacy-clinic',
            'subdomain' => 'placeholder-tmp',
            'status' => Tenant::STATUS_APPROVED,
        ]);
        DB::table('tenants')->where('id', $legacy->id)->update(['subdomain' => null]);

        // Invoke the migration's protected backfill() directly.
        $migration = require database_path('migrations/2026_08_27_000001_add_subdomain_to_tenants_table.php');
        Closure::bind(fn () => $this->backfill(), $migration, $migration)();

        $filled = $legacy->fresh()->subdomain;

        $this->assertNotNull($filled);
        $this->assertNotSame('legacy-clinic', $filled);
        $this->assertMatchesRegularExpression(config('tenancy.subdomain_pattern'), $filled);
    }
}
