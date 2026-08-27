<?php

use App\Support\Tenancy;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the per-clinic subdomain. Nullable at the DB level (the app always
     * sets it), unique + indexed. Existing tenants are backfilled from their
     * slug with a value that satisfies the same rules the wizard enforces.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('subdomain')->nullable()->unique()->after('slug');
        });

        $this->backfill();
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('subdomain');
        });
    }

    protected function backfill(): void
    {
        // Track what's already used so generated values stay unique within this run.
        $taken = DB::table('tenants')->whereNotNull('subdomain')->pluck('subdomain')->all();

        $rows = DB::table('tenants')->whereNull('subdomain')->select('id', 'slug', 'name')->get();

        foreach ($rows as $row) {
            $subdomain = Tenancy::generateSubdomain($row->slug ?: $row->name, $taken);

            DB::table('tenants')->where('id', $row->id)->update(['subdomain' => $subdomain]);
            $taken[] = $subdomain;
        }
    }
};
