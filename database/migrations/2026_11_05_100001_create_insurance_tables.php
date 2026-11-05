<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Insurance Providers (reference table + tenant custom providers)
        Schema::create('insurance_providers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->index();
            $table->string('province', 2)->nullable()->index(); // Null = national
            $table->string('network')->default('other')->index(); // telus_eclaims | sun_life | greenshield | blue_cross | other | none
            $table->boolean('supports_direct_billing')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'active']);
        });

        // 2. Client Insurance Policies (tenant-scoped, encrypted numbers at rest)
        Schema::create('client_insurance_policies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('client_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('insurance_provider_id')->constrained('insurance_providers')->cascadeOnDelete();

            // Encrypted at rest via Laravel encrypted cast
            $table->text('policy_number');
            $table->text('group_number')->nullable();
            $table->text('member_id');
            $table->text('certificate_id')->nullable();

            $table->string('plan_holder_name');
            $table->string('relationship_to_patient')->default('self'); // self | spouse | child | parent | other
            $table->text('plan_holder_dob')->nullable();
            $table->date('coverage_start_date')->nullable();
            $table->date('coverage_end_date')->nullable();
            $table->string('priority')->default('primary'); // primary | secondary
            $table->text('notes')->nullable();

            $table->timestamp('verified_at')->nullable();
            $table->foreignUuid('verified_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['tenant_id', 'client_id']);
            $table->index(['tenant_id', 'priority']);
        });

        // 3. Insurance Claims (placeholder for electronic claims, used for manual claims in Phase 1)
        Schema::create('insurance_claims', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('client_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('client_insurance_policy_id')->constrained('client_insurance_policies')->cascadeOnDelete();

            // manual | electronic
            $table->string('claim_type')->default('manual');

            // draft | submitted | approved | partially_approved | rejected | paid | cancelled
            $table->string('status')->default('draft')->index();

            // Integer minor units (cents)
            $table->unsignedBigInteger('amount_claimed')->default(0);
            $table->unsignedBigInteger('amount_approved')->default(0);
            $table->unsignedBigInteger('patient_balance')->default(0);

            $table->string('external_reference')->nullable();
            $table->json('response_payload')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['tenant_id', 'client_id']);
            $table->index(['tenant_id', 'invoice_id']);
            $table->index(['tenant_id', 'status']);
        });

        // 4. Insurance Claim Events (audit / status history)
        Schema::create('insurance_claim_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('claim_id')->constrained('insurance_claims')->cascadeOnDelete();
            $table->string('status');
            $table->text('note')->nullable();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index('claim_id');
        });

        // 5. Seed Starter List of Reference Insurance Providers
        $now = now();
        $starterProviders = [
            [
                'name' => 'Manulife',
                'code' => 'manulife',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Canada Life',
                'code' => 'canada_life',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Sun Life',
                'code' => 'sun_life',
                'province' => null,
                'network' => 'sun_life',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'GreenShield Canada',
                'code' => 'greenshield',
                'province' => null,
                'network' => 'greenshield',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Desjardins Insurance',
                'code' => 'desjardins',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Industrial Alliance (iA Financial Group)',
                'code' => 'industrial_alliance',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Equitable Life of Canada',
                'code' => 'equitable',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Beneva',
                'code' => 'beneva',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Alberta Blue Cross',
                'code' => 'alberta_blue_cross',
                'province' => 'AB',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Pacific Blue Cross',
                'code' => 'pacific_blue_cross',
                'province' => 'BC',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Medavie Blue Cross',
                'code' => 'medavie_blue_cross',
                'province' => null,
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Ontario Blue Cross',
                'code' => 'ontario_blue_cross',
                'province' => 'ON',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Quebec Blue Cross',
                'code' => 'quebec_blue_cross',
                'province' => 'QC',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Manitoba Blue Cross',
                'code' => 'manitoba_blue_cross',
                'province' => 'MB',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Saskatchewan Blue Cross',
                'code' => 'saskatchewan_blue_cross',
                'province' => 'SK',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Other',
                'code' => 'other',
                'province' => null,
                'network' => 'other',
                'supports_direct_billing' => false,
                'active' => true,
            ],
        ];

        foreach ($starterProviders as $provider) {
            DB::table('insurance_providers')->insert(array_merge($provider, [
                'id' => (string) Str::uuid(),
                'tenant_id' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('insurance_claim_events');
        Schema::dropIfExists('insurance_claims');
        Schema::dropIfExists('client_insurance_policies');
        Schema::dropIfExists('insurance_providers');
    }
};

