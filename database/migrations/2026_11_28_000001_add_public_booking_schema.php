<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->json('booking_settings')->nullable()->after('scribe_settings');
        });

        Schema::table('practitioner_profiles', function (Blueprint $table) {
            $table->json('working_hours')->nullable()->after('calendar_color');
            $table->boolean('accepts_online_booking')->default(true)->after('working_hours');
        });

        Schema::create('clinic_services', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('discipline')->nullable();
            $table->unsignedInteger('duration_minutes')->default(60);
            $table->unsignedInteger('price_cents')->default(0);
            $table->unsignedInteger('buffer_minutes')->nullable();
            $table->boolean('bookable_online')->default(true);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['tenant_id', 'is_active', 'bookable_online']);
        });

        Schema::create('clinic_closed_dates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'date']);
        });

        Schema::create('practitioner_time_offs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('staff_membership_id')->constrained()->cascadeOnDelete();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index(['staff_membership_id', 'starts_at', 'ends_at']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignUuid('clinic_service_id')->nullable()->after('room_id')->constrained('clinic_services')->nullOnDelete();
            $table->string('booking_source', 20)->default('staff')->after('status');
            $table->string('public_manage_token_hash', 64)->nullable()->after('cancellation_reason');
            $table->json('client_contact_diff')->nullable()->after('public_manage_token_hash');
            $table->timestamp('reminder_sent_at')->nullable()->after('client_contact_diff');
            $table->text('declined_reason')->nullable()->after('reminder_sent_at');

            $table->index('public_manage_token_hash');
            $table->index(['tenant_id', 'status', 'starts_at']);
        });

        // Include 'requested' in Postgres exclusion constraints so pending requests
        // also hold the slot against concurrent bookings until approved or declined.
        if (DB::connection()->getDriverName() === 'pgsql') {
            $active = "'scheduled','confirmed','checked_in','completed','requested'";

            DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_practitioner_overlap');
            DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_room_overlap');

            DB::statement(sprintf(
                'ALTER TABLE appointments ADD CONSTRAINT appointments_no_practitioner_overlap '
                .'EXCLUDE USING gist (staff_membership_id WITH =, tsrange(starts_at, ends_at, \'[)\') WITH &&) '
                .'WHERE (status IN (%s))',
                $active
            ));

            DB::statement(sprintf(
                'ALTER TABLE appointments ADD CONSTRAINT appointments_no_room_overlap '
                .'EXCLUDE USING gist (room_id WITH =, tsrange(starts_at, ends_at, \'[)\') WITH &&) '
                .'WHERE (room_id IS NOT NULL AND status IN (%s))',
                $active
            ));
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            $active = "'scheduled','confirmed','checked_in','completed'";

            DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_practitioner_overlap');
            DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_room_overlap');

            DB::statement(sprintf(
                'ALTER TABLE appointments ADD CONSTRAINT appointments_no_practitioner_overlap '
                .'EXCLUDE USING gist (staff_membership_id WITH =, tsrange(starts_at, ends_at, \'[)\') WITH &&) '
                .'WHERE (status IN (%s))',
                $active
            ));

            DB::statement(sprintf(
                'ALTER TABLE appointments ADD CONSTRAINT appointments_no_room_overlap '
                .'EXCLUDE USING gist (room_id WITH =, tsrange(starts_at, ends_at, \'[)\') WITH &&) '
                .'WHERE (room_id IS NOT NULL AND status IN (%s))',
                $active
            ));
        }

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['public_manage_token_hash']);
            $table->dropIndex(['tenant_id', 'status', 'starts_at']);
            $table->dropConstrainedForeignId('clinic_service_id');
            $table->dropColumn([
                'booking_source',
                'public_manage_token_hash',
                'client_contact_diff',
                'reminder_sent_at',
                'declined_reason',
            ]);
        });

        Schema::dropIfExists('practitioner_time_offs');
        Schema::dropIfExists('clinic_closed_dates');
        Schema::dropIfExists('clinic_services');

        Schema::table('practitioner_profiles', function (Blueprint $table) {
            $table->dropColumn(['working_hours', 'accepts_online_booking']);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('booking_settings');
        });
    }
};
