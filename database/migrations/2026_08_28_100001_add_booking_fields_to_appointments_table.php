<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Active statuses occupy a slot; cancelled/no-show free it. Kept in sync
     * with App\Services\BookingService::ACTIVE_STATUSES.
     */
    private const ACTIVE = "'scheduled','confirmed','checked_in','completed'";

    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('status');
            $table->timestamp('cancelled_at')->nullable()->after('notes');
            $table->string('cancellation_reason')->nullable()->after('cancelled_at');

            // Room-scoped conflict lookups (practitioner already has an index).
            $table->index(['tenant_id', 'room_id', 'starts_at']);
        });

        // The race-proof guard: Postgres refuses to persist two active
        // appointments whose time ranges overlap for the same practitioner or
        // the same room, no matter how the two writers interleave. Requires the
        // btree_gist extension to combine equality (uuid) with range overlap.
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gist');

            // Remediate any pre-existing overlaps so the constraints can be
            // created on a dataset that predates this rule. For each clashing
            // pair we keep the earliest-starting appointment (tie-broken by id)
            // and soft-cancel the rest — the records are preserved, never
            // deleted. Practitioner clashes first, then room clashes.
            $this->cancelOverlaps('staff_membership_id');
            $this->cancelOverlaps('room_id');

            DB::statement(sprintf(
                'ALTER TABLE appointments ADD CONSTRAINT appointments_no_practitioner_overlap '
                .'EXCLUDE USING gist ('
                .'staff_membership_id WITH =, '
                .'tsrange(starts_at, ends_at, \'[)\') WITH &&'
                .') WHERE (status IN (%s))',
                self::ACTIVE
            ));

            DB::statement(sprintf(
                'ALTER TABLE appointments ADD CONSTRAINT appointments_no_room_overlap '
                .'EXCLUDE USING gist ('
                .'room_id WITH =, '
                .'tsrange(starts_at, ends_at, \'[)\') WITH &&'
                .') WHERE (room_id IS NOT NULL AND status IN (%s))',
                self::ACTIVE
            ));
        }
    }

    /**
     * Soft-cancel every active appointment that overlaps an earlier active
     * appointment sharing the same $column, so the exclusion constraint on that
     * column can be created. The earliest of each overlapping cluster survives.
     */
    private function cancelOverlaps(string $column): void
    {
        DB::statement(sprintf(
            'UPDATE appointments a '
            ."SET status = 'cancelled', cancelled_at = now(), "
            ."cancellation_reason = 'Auto-cancelled: overlapping booking (booking-engine migration)' "
            .'WHERE a.status IN (%1$s) AND a.%2$s IS NOT NULL AND EXISTS ('
            .'SELECT 1 FROM appointments b '
            .'WHERE b.id <> a.id AND b.%2$s = a.%2$s AND b.status IN (%1$s) '
            ."AND tsrange(b.starts_at, b.ends_at, '[)') && tsrange(a.starts_at, a.ends_at, '[)') "
            .'AND (b.starts_at < a.starts_at OR (b.starts_at = a.starts_at AND b.id < a.id))'
            .')',
            self::ACTIVE,
            $column
        ));
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_practitioner_overlap');
            DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_room_overlap');
        }

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'room_id', 'starts_at']);
            $table->dropColumn(['notes', 'cancelled_at', 'cancellation_reason']);
        });
    }
};
