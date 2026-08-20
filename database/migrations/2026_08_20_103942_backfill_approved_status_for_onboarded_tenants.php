<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The clinic-approval gate (add_verification_fields_to_tenants_table)
     * added a `status` column defaulting to pending_review — which Postgres
     * backfills onto every existing row, including tenants that were
     * already live, operating clinics with real staff and clients before
     * this feature existed. Left alone, that locks every one of them out
     * of their own workspace.
     *
     * A tenant that had already finished the setup wizard
     * (onboarding_completed_at is set) was, by definition, already a real
     * operating clinic — not a new applicant — so it's retroactively
     * marked approved. reviewed_by is deliberately left null: no admin
     * actually reviewed these, and it would be dishonest to fabricate one.
     */
    public function up(): void
    {
        DB::table('tenants')
            ->whereNotNull('onboarding_completed_at')
            ->where('status', 'pending_review')
            ->update([
                'status' => 'approved',
                'submitted_at' => DB::raw('COALESCE(submitted_at, created_at)'),
                'reviewed_at' => now(),
            ]);
    }

    /**
     * Not reversible: there's no way to distinguish which rows this
     * migration changed from ones that were already approved some other
     * way by the time a rollback runs.
     */
    public function down(): void
    {
        //
    }
};
