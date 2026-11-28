<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\AssessmentTest;
use App\Models\Client;
use App\Models\ClinicalNoteTemplate;
use App\Models\ConsentType;
use App\Models\IntakeFormTemplate;
use App\Models\Location;
use App\Models\PractitionerProfile;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Room;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\InsuranceProviderSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class E2eSeedCommand extends Command
{
    protected $signature = 'e2e:seed {--database=umahz_e2e : Target E2E PostgreSQL database (must end with _e2e)}';

    protected $description = 'Migrate and seed an isolated E2E database (never touches dev or production).';

    public function handle(): int
    {
        $dbName = (string) $this->option('database');

        if (!str_ends_with(strtolower($dbName), '_e2e')) {
            $this->error("Refusing to run e2e:seed against [{$dbName}]. Target database MUST end with '_e2e'.");

            return self::FAILURE;
        }

        // Ensure target database exists on PostgreSQL
        $host = config('database.connections.pgsql.host', '127.0.0.1');
        $port = config('database.connections.pgsql.port', '5432');
        $user = config('database.connections.pgsql.username', 'postgres');
        $pass = config('database.connections.pgsql.password', 'root');

        try {
            $pdo = new \PDO("pgsql:host={$host};port={$port};dbname=postgres", $user, $pass);
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $exists = $pdo->query("SELECT 1 FROM pg_database WHERE datname = " . $pdo->quote($dbName))->fetchColumn();
            if (!$exists) {
                $pdo->exec('CREATE DATABASE "' . str_replace('"', '', $dbName) . '"');
                $this->info("Created database [{$dbName}].");
            }
        } catch (\Throwable $e) {
            $this->error("Failed to connect/create database [{$dbName}]: " . $e->getMessage());

            return self::FAILURE;
        }

        // Switch active pgsql connection to the E2E database
        Config::set('database.connections.pgsql.database', $dbName);
        DB::purge('pgsql');
        DB::reconnect('pgsql');

        if (DB::connection()->getDatabaseName() !== $dbName) {
            $this->error('Database switch verification failed.');

            return self::FAILURE;
        }

        $this->info("Running migrate:fresh on [{$dbName}]...");
        $migrate = \Illuminate\Support\Facades\Process::env(['DB_DATABASE' => $dbName])
            ->run([PHP_BINARY, base_path('artisan'), 'migrate:fresh', '--force']);
        $this->output->write($migrate->output());
        if ($migrate->failed()) {
            $this->error($migrate->errorOutput());

            return self::FAILURE;
        }

        $this->seedRoles();
        $this->call('db:seed', ['--class' => SubscriptionPlansSeeder::class, '--force' => true]);
        $this->call('db:seed', ['--class' => InsuranceProviderSeeder::class, '--force' => true]);

        $password = Hash::make('Password123!');

        // 1. Platform Admin
        $admin = $this->createVerifiedUser([
            'name' => 'E2E Platform Admin',
            'email' => 'admin@e2e.umahz.test',
            'password' => $password,
            'is_platform_admin' => true,
        ]);
        $admin->assignRole('Platform Admin');

        // 2. Approved Clinic: e2e-clinic (Toronto timezone)
        $clinic = Tenant::create([
            'name' => 'E2E Wellness Clinic',
            'slug' => 'e2e-clinic',
            'subdomain' => 'e2e-clinic',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'currency' => 'CAD',
            'email' => 'hello@e2e-clinic.test',
            'phone' => '416-555-0100',
            'plan_tier' => 'practice',
            'offered_disciplines' => ['physiotherapy', 'massage_therapy', 'chiropractic'],
            'business_hours' => collect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
                ->mapWithKeys(fn($d) => [$d => ['closed' => false, 'open' => '08:00', 'close' => '22:00']])->all(),
            'public_website_enabled' => true,
            'scribe_settings' => ['enabled' => true],
            'booking_settings' => [
                'enabled' => true,
                'mode' => 'request',
                'min_notice_hours' => 2,
                'max_days_ahead' => 60,
                'buffer_minutes' => 15,
                'allow_patient_cancellation' => true,
                'cancellation_notice_hours' => 24,
                'require_intake' => false,
                'require_consent' => false,
                'send_24h_reminder' => true,
            ],
            'referral_code' => 'E2E-REF10',
        ]);

        \App\Models\ClinicService::create([
            'tenant_id' => $clinic->id,
            'name' => 'E2E Initial Physiotherapy',
            'discipline' => 'physiotherapy',
            'duration_minutes' => 60,
            'price_cents' => 12000,
            'bookable_online' => true,
            'is_active' => true,
        ]);

        $adminMembership = StaffMembership::create([
            'tenant_id' => $clinic->id,
            'user_id' => $admin->id,
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $owner = $this->createVerifiedUser([
            'name' => 'E2E Owner',
            'email' => 'owner@e2e-clinic.test',
            'password' => $password,
        ]);
        $owner->assignRole('Clinic Owner');
        StaffMembership::create([
            'tenant_id' => $clinic->id,
            'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $practitioner = $this->createVerifiedUser([
            'name' => 'Dr. E2E Physio',
            'email' => 'practitioner@e2e-clinic.test',
            'password' => $password,
        ]);
        $practitioner->assignRole('Practitioner');
        $pracMembership = StaffMembership::create([
            'tenant_id' => $clinic->id,
            'user_id' => $practitioner->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);
        PractitionerProfile::create([
            'tenant_id' => $clinic->id,
            'staff_membership_id' => $pracMembership->id,
            'profession' => 'physiotherapy',
            'credentials' => 'PT #E2E-101',
            'bio' => 'E2E Physiotherapy specialist.',
            'is_primary_contact' => true,
        ]);

        $receptionist = $this->createVerifiedUser([
            'name' => 'E2E Receptionist',
            'email' => 'receptionist@e2e-clinic.test',
            'password' => $password,
        ]);
        $receptionist->assignRole('Receptionist');
        StaffMembership::create([
            'tenant_id' => $clinic->id,
            'user_id' => $receptionist->id,
            'role' => StaffMembership::ROLE_RECEPTIONIST,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $location = Location::create([
            'tenant_id' => $clinic->id,
            'name' => 'Downtown Toronto',
            'address_line1' => '100 King St W',
            'city' => 'Toronto',
            'region' => 'ON',
            'postal_code' => 'M5X 1A9',
            'country' => 'CA',
            'phone' => '416-555-0100',
            'timezone' => 'America/Toronto',
            'is_active' => true,
        ]);

        $room = Room::create([
            'tenant_id' => $clinic->id,
            'location_id' => $location->id,
            'name' => 'Treatment Room 1',
            'is_active' => true,
        ]);

        $client = Client::create([
            'tenant_id' => $clinic->id,
            'first_name' => 'Jordan',
            'last_name' => 'Taylor',
            'email' => 'client@e2e-clinic.test',
            'phone' => '416-555-0199',
        ]);

        // Evening Toronto appointment for today (tests EST/EDT evening display on dashboard)
        $eveningStart = Carbon::now('America/Toronto')->setTime(19, 30, 0)->utc();
        Appointment::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'staff_membership_id' => $pracMembership->id,
            'service_name' => 'Initial Physiotherapy Assessment',
            'location_id' => $location->id,
            'room_id' => $room->id,
            'starts_at' => $eveningStart,
            'ends_at' => $eveningStart->copy()->addMinutes(45),
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        // Product with 2 sizes/variants
        $product = Product::create([
            'tenant_id' => $clinic->id,
            'name' => 'E2E Arnica Recovery Gel',
            'category' => 'oils',
            'unit_price' => 2500,
            'currency' => 'CAD',
            'taxable' => true,
            'tax_rate' => 13.00,
            'track_inventory' => true,
            'has_variants' => true,
            'stock_quantity' => 20,
            'active' => true,
        ]);
        ProductVariant::create([
            'tenant_id' => $clinic->id,
            'product_id' => $product->id,
            'name' => 'Small (50ml)',
            'sku' => 'ARN-50',
            'unit_price' => 2000,
            'stock_quantity' => 10,
            'sort_order' => 1,
            'active' => true,
        ]);
        ProductVariant::create([
            'tenant_id' => $clinic->id,
            'product_id' => $product->id,
            'name' => 'Large (150ml)',
            'sku' => 'ARN-150',
            'unit_price' => 3500,
            'stock_quantity' => 10,
            'sort_order' => 2,
            'active' => true,
        ]);

        // Templates & Consents
        ClinicalNoteTemplate::ensureDefaultsForTenant($clinic->id, ['physiotherapy', 'massage_therapy']);
        ConsentType::ensureDefaultsForTenant($clinic->id);
        $scribeConsent = ConsentType::ensureScribeTypeForTenant($clinic->id);
        $scribeConsent->update(['body' => 'I consent to audio recording and AI transcription for clinical documentation.']);
        $pdfPath = "consent-templates/{$clinic->id}/e2e-consent.pdf";
        $minimalPdf = "%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n";
        \Illuminate\Support\Facades\Storage::disk('local')->put($pdfPath, $minimalPdf);
        ConsentType::create([
            'tenant_id' => $clinic->id,
            'code' => 'e2e_treatment_pdf',
            'name' => 'E2E Treatment Consent PDF',
            'description' => 'E2E PDF consent template for signature verification.',
            'agreement_source' => ConsentType::SOURCE_PDF,
            'pdf_path' => $pdfPath,
            'pdf_original_name' => 'e2e-consent.pdf',
            'pdf_file_size' => strlen($minimalPdf),
            'version' => 1,
            'is_active' => true,
        ]);
        IntakeFormTemplate::ensureDefaultsForTenant($clinic->id, ['physiotherapy']);

        // Assessment Tests: 1 reviewed, 1 draft
        AssessmentTest::create([
            'tenant_id' => null,
            'body_region' => 'shoulder',
            'name' => 'Neer Impingement Test',
            'aliases' => ['Neer Test'],
            'purpose' => 'Assess subacromial impingement.',
            'procedure' => 'Passively flex the shoulder forward while stabilizing the scapula.',
            'positive_finding' => 'Pain in anterior/lateral shoulder.',
            'disciplines' => ['physio', 'chiro'],
            'status' => AssessmentTest::STATUS_REVIEWED,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        AssessmentTest::create([
            'tenant_id' => null,
            'body_region' => 'knee',
            'name' => 'Lachman Test',
            'aliases' => ['Lachman'],
            'purpose' => 'Assess ACL integrity.',
            'procedure' => 'Flex knee 20-30 degrees and translate tibia anteriorly.',
            'positive_finding' => 'Soft endpoint or increased anterior translation.',
            'disciplines' => ['physio', 'chiro'],
            'status' => AssessmentTest::STATUS_REVIEWED,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        AssessmentTest::create([
            'tenant_id' => null,
            'body_region' => 'lumbar',
            'name' => 'E2E Draft Straight Leg Raise',
            'aliases' => ['SLR'],
            'purpose' => 'Assess lumbar nerve root irritation.',
            'procedure' => 'Passively elevate the extended leg.',
            'positive_finding' => 'Radiating leg pain between 30 and 70 degrees.',
            'disciplines' => ['physio'],
            'status' => AssessmentTest::STATUS_DRAFT,
        ]);

        // 3. Pending clinic for Admin approval E2E
        $pendingClinic = Tenant::create([
            'name' => 'Pending E2E Physio',
            'slug' => 'pending-e2e-clinic',
            'subdomain' => 'pending-e2e-clinic',
            'status' => Tenant::STATUS_PENDING_REVIEW,
            'submitted_at' => now(),
            'timezone' => 'America/Toronto',
            'currency' => 'CAD',
            'email' => 'pending-owner@e2e.test',
            'primary_contact_name' => 'Pending Owner',
            'primary_contact_email' => 'pending-owner@e2e.test',
            'primary_contact_phone' => '416-555-0188',
            'offered_disciplines' => ['physiotherapy'],
        ]);
        $pendingOwner = $this->createVerifiedUser([
            'name' => 'Pending Owner',
            'email' => 'pending-owner@e2e.test',
            'password' => $password,
        ]);
        StaffMembership::create([
            'tenant_id' => $pendingClinic->id,
            'user_id' => $pendingOwner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 4. Second approved clinic for cross-tenant isolation E2E
        $otherClinic = Tenant::create([
            'name' => 'Other E2E Clinic',
            'slug' => 'other-e2e-clinic',
            'subdomain' => 'other-e2e-clinic',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'currency' => 'CAD',
            'email' => 'other@e2e.test',
        ]);
        $otherOwner = $this->createVerifiedUser([
            'name' => 'Other Owner',
            'email' => 'other-owner@e2e.test',
            'password' => $password,
        ]);
        StaffMembership::create([
            'tenant_id' => $otherClinic->id,
            'user_id' => $otherOwner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $this->info("E2E database [{$dbName}] migrated and seeded successfully.");

        return self::SUCCESS;
    }

    private function createVerifiedUser(array $attributes): User
    {
        $user = User::create($attributes);
        $user->forceFill(['email_verified_at' => now()])->save();

        return $user;
    }

    private function seedRoles(): void
    {
        foreach (['Platform Admin', 'Clinic Owner', 'Practitioner', 'Receptionist', 'Client'] as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }
        Permission::firstOrCreate(['name' => 'notes.finalize', 'guard_name' => 'web']);
    }
}
