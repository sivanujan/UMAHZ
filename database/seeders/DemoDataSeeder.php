<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\ClientIntake;
use App\Models\ClinicalNote;
use App\Models\Consent;
use App\Models\ConsentType;
use App\Models\IntakeFormTemplate;
use App\Models\Location;
use App\Models\Plan;
use App\Models\PractitionerProfile;
use App\Models\Room;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DemoDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Strictly prohibited on production.
     */
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('CRITICAL: DemoDataSeeder is strictly prohibited from running in production environment.');
        }

        // 1. Ensure Subscription Plans exist
        if (! Plan::where('slug', 'signature')->exists()) {
            $this->call(SubscriptionPlansSeeder::class);
        }

        $signaturePlan = Plan::where('slug', 'signature')->firstOrFail();

        // 2. Roles & Permissions setup
        $roles = ['Platform Admin', 'Clinic Owner', 'Practitioner', 'Receptionist', 'Client'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        $notesFinalize = Permission::firstOrCreate(['name' => 'notes.finalize', 'guard_name' => 'web']);
        Role::findByName('Clinic Owner')->givePermissionTo($notesFinalize);
        Role::findByName('Practitioner')->givePermissionTo($notesFinalize);

        $demoPasswordPlain = env('DEMO_PASSWORD', 'Password123!');
        $demoPasswordHash = Hash::make($demoPasswordPlain);

        // 3. Platform Admin User
        $adminUser = User::firstOrCreate(['email' => 'admin@umahz.com'], [
            'name' => 'Platform Admin',
            'password' => $demoPasswordHash,
            'email_verified_at' => now(),
        ]);
        if (! $adminUser->hasRole('Platform Admin')) {
            $adminUser->assignRole('Platform Admin');
        }

        // 4. Demo Clinic: Astrogenapp
        $tenant = Tenant::firstOrCreate(['slug' => 'astrogenapp'], [
            'name' => 'Astrogenapp',
            'subdomain' => 'astrogenapp',
            'status' => Tenant::STATUS_APPROVED,
            'plan_id' => $signaturePlan->id,
            'billing_interval' => 'month',
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'onboarding_completed_at' => now(),
            'currency' => 'CAD',
            'timezone' => 'America/Toronto',
            'email' => 'astrogenapp@gmail.com',
            'phone' => '+1 (416) 555-0100',
            'stripe_id' => 'cus_demo_astrogenapp',
            'address' => [
                'line1' => '100 University Ave, Suite 500',
                'city' => 'Toronto',
                'region' => 'ON',
                'postal_code' => 'M5J 1V6',
                'country' => 'CA',
            ],
        ]);

        // Mock subscription in DB (No real Stripe API calls)
        DB::table('subscriptions')->updateOrInsert(
            [
                'tenant_id' => $tenant->id,
                'type' => 'default',
            ],
            [
                'stripe_id' => 'sub_demo_astrogenapp',
                'stripe_status' => 'active',
                'stripe_price' => $signaturePlan->monthlyPrice?->stripe_base_price_id ?? 'price_signature_monthly_demo',
                'quantity' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Attach Platform Admin to Astrogenapp for administrative oversight
        StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $adminUser->id,
        ], [
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 5. Clinic Owner Login (astrogenapp@gmail.com)
        $ownerUser = User::firstOrCreate(['email' => 'astrogenapp@gmail.com'], [
            'name' => 'Dr. Astrogen Owner',
            'password' => $demoPasswordHash,
            'email_verified_at' => now(),
        ]);
        if (! $ownerUser->hasRole('Clinic Owner')) {
            $ownerUser->assignRole('Clinic Owner');
        }

        $ownerMembership = StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $ownerUser->id,
        ], [
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 6. Practitioner
        $practitionerUser = User::firstOrCreate(['email' => 'practitioner@astrogenapp.com'], [
            'name' => 'Dr. Julian Hayes',
            'password' => $demoPasswordHash,
            'email_verified_at' => now(),
        ]);
        if (! $practitionerUser->hasRole('Practitioner')) {
            $practitionerUser->assignRole('Practitioner');
        }

        $practitionerMembership = StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $practitionerUser->id,
        ], [
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        PractitionerProfile::firstOrCreate([
            'staff_membership_id' => $practitionerMembership->id,
        ], [
            'profession' => PractitionerProfile::PROFESSION_ACUPUNCTURE_TCM,
            'credentials' => 'LAc, Dipl. OM',
            'biography' => 'Specializes in clinical acupuncture, musculoskeletal pain relief, and herbal consultation.',
            'calendar_color' => '#2563EB',
        ]);

        // 7. Receptionist
        $receptionistUser = User::firstOrCreate(['email' => 'receptionist@astrogenapp.com'], [
            'name' => 'Maya Torres',
            'password' => $demoPasswordHash,
            'email_verified_at' => now(),
        ]);
        if (! $receptionistUser->hasRole('Receptionist')) {
            $receptionistUser->assignRole('Receptionist');
        }

        StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $receptionistUser->id,
        ], [
            'role' => StaffMembership::ROLE_RECEPTIONIST,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 8. 1 Location with 2 Rooms
        $location = Location::firstOrCreate([
            'tenant_id' => $tenant->id,
            'name' => 'Astrogen Wellness Center',
        ], [
            'address' => '100 University Ave, Suite 500, Toronto, ON M5J 1V6',
            'timezone' => 'America/Toronto',
            'phone' => '+1 (416) 555-0100',
            'is_active' => true,
        ]);

        $room1 = Room::firstOrCreate([
            'tenant_id' => $tenant->id,
            'location_id' => $location->id,
            'name' => 'Room 101 - Treatment Suite A',
        ], [
            'description' => 'Equipped for acupuncture and somatic therapy',
            'is_active' => true,
        ]);

        $room2 = Room::firstOrCreate([
            'tenant_id' => $tenant->id,
            'location_id' => $location->id,
            'name' => 'Room 102 - Consultation Suite B',
        ], [
            'description' => 'Private clinical assessment and herbal consultation suite',
            'is_active' => true,
        ]);

        // 9. Demo Clients
        $clientSarah = Client::firstOrCreate([
            'tenant_id' => $tenant->id,
            'email' => 'sarah.connor@example.com',
        ], [
            'first_name' => 'Sarah',
            'last_name' => 'Connor',
            'phone' => '+1 (416) 555-1111',
            'date_of_birth' => '1985-05-12',
            'preferred_contact_method' => 'email',
            'emergency_contact' => [
                'name' => 'John Connor',
                'relationship' => 'Son',
                'phone' => '+1 (416) 555-9999',
            ],
        ]);

        $clientJohn = Client::firstOrCreate([
            'tenant_id' => $tenant->id,
            'email' => 'john.doe@example.com',
        ], [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'phone' => '+1 (416) 555-2222',
            'date_of_birth' => '1990-08-20',
            'preferred_contact_method' => 'phone',
        ]);

        $clientJane = Client::firstOrCreate([
            'tenant_id' => $tenant->id,
            'email' => 'jane.smith@example.com',
        ], [
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'phone' => '+1 (416) 555-3333',
            'date_of_birth' => '1993-11-04',
            'preferred_contact_method' => 'email',
        ]);

        // 10. Appointments
        // Completed appointment yesterday
        $completedApt = Appointment::firstOrCreate([
            'tenant_id' => $tenant->id,
            'client_id' => $clientSarah->id,
            'starts_at' => now()->subDay()->setTime(10, 0, 0),
        ], [
            'staff_membership_id' => $practitionerMembership->id,
            'location_id' => $location->id,
            'room_id' => $room1->id,
            'service_name' => 'Initial Acupuncture Assessment & Treatment (60m)',
            'ends_at' => now()->subDay()->setTime(11, 0, 0),
            'status' => Appointment::STATUS_COMPLETED,
        ]);

        // Scheduled appointments
        Appointment::firstOrCreate([
            'tenant_id' => $tenant->id,
            'client_id' => $clientJohn->id,
            'starts_at' => now()->addDay()->setTime(14, 0, 0),
        ], [
            'staff_membership_id' => $practitionerMembership->id,
            'location_id' => $location->id,
            'room_id' => $room1->id,
            'service_name' => 'Follow-up Acupuncture (45m)',
            'ends_at' => now()->addDay()->setTime(14, 45, 0),
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        Appointment::firstOrCreate([
            'tenant_id' => $tenant->id,
            'client_id' => $clientJane->id,
            'starts_at' => now()->addDays(3)->setTime(11, 30, 0),
        ], [
            'staff_membership_id' => $practitionerMembership->id,
            'location_id' => $location->id,
            'room_id' => $room2->id,
            'service_name' => 'Herbal Medicine Consultation (30m)',
            'ends_at' => now()->addDays(3)->setTime(12, 0, 0),
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        // 11. Consent
        $consentType = ConsentType::firstOrCreate([
            'tenant_id' => $tenant->id,
            'code' => 'general_treatment',
        ], [
            'name' => 'General Treatment & Telehealth Consent',
            'description' => 'Informed consent for acupuncture, soft tissue therapy, and telehealth consultations.',
            'body' => 'I understand that acupuncture treatments may involve the insertion of fine needles into specific points on the body. I voluntarily consent to this procedure and acknowledge the potential benefits and common mild side effects.',
            'is_active' => true,
        ]);

        Consent::firstOrCreate([
            'tenant_id' => $tenant->id,
            'client_id' => $clientSarah->id,
            'consent_type_id' => $consentType->id,
        ], [
            'consent_type_name' => $consentType->name,
            'consent_body' => $consentType->body,
            'signer_name' => 'Sarah Connor',
            'signature_type' => 'draw',
            'signature_data' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'agreed_at' => now()->subDay()->setTime(9, 45, 0),
            'status' => 'active',
            'ip_address' => '127.0.0.1',
        ]);

        // 12. Intake Form & Client Intake
        $intakeTemplate = IntakeFormTemplate::firstOrCreate([
            'tenant_id' => $tenant->id,
            'discipline' => 'acupuncture_tcm',
        ], [
            'name' => 'Acupuncture & TCM Intake Form',
            'description' => 'Comprehensive medical history and pain presentation intake questionnaire.',
            'schema' => [
                'sections' => [
                    [
                        'id' => 'medical_history',
                        'title' => 'Medical History',
                        'questions' => [
                            ['id' => 'chief_complaint', 'type' => 'textarea', 'label' => 'Primary reason for visit today', 'required' => true],
                            ['id' => 'pain_level', 'type' => 'rating', 'label' => 'Current pain intensity (1-10)', 'required' => true],
                            ['id' => 'is_pregnant', 'type' => 'boolean', 'label' => 'Are you currently pregnant?', 'required' => true, 'is_contraindication' => true],
                        ],
                    ],
                ],
            ],
            'is_active' => true,
        ]);

        ClientIntake::firstOrCreate([
            'tenant_id' => $tenant->id,
            'client_id' => $clientSarah->id,
        ], [
            'appointment_id' => $completedApt->id,
            'intake_form_template_id' => $intakeTemplate->id,
            'discipline' => 'acupuncture_tcm',
            'template_name' => $intakeTemplate->name,
            'schema_snapshot' => $intakeTemplate->schema,
            'responses' => [
                'chief_complaint' => 'Chronic lower back stiffness and mild cervical tension after long desk hours.',
                'pain_level' => 5,
                'is_pregnant' => false,
            ],
            'status' => 'completed',
            'submission_type' => 'patient_link',
            'submitted_at' => now()->subDay()->setTime(9, 50, 0),
            'ip_address' => '127.0.0.1',
        ]);

        // 13. Clinical Note for Completed Appointment
        ClinicalNote::firstOrCreate([
            'tenant_id' => $tenant->id,
            'appointment_id' => $completedApt->id,
        ], [
            'client_id' => $clientSarah->id,
            'staff_membership_id' => $practitionerMembership->id,
            'discipline' => 'acupuncture_tcm',
            'template_name' => 'Standard TCM SOAP Chart',
            'content' => json_encode([
                'subjective' => 'Patient presents with bilateral lumbosacral dull aching (5/10), worse in the morning. Denies radicular pain or numbness.',
                'objective' => 'Palpation reveals moderate hypertonicity at L4-S1 erector spinae and UB23/UB25. Tongue pale-pink with thin white coat; pulse wiry in liver position.',
                'assessment' => 'Qi and Blood stagnation with mild Kidney Yang deficiency. Responded well to local needle retention with TDP heat lamp.',
                'plan' => 'Administered 20min electro-acupuncture (UB23, UB25, GB30, BL40). Prescribed home stretching and ergonomics review. Follow-up in 1 week.',
            ]),
            'status' => 'signed',
            'signed_at' => now()->subDay()->setTime(11, 10, 0),
            'finalized_at' => now()->subDay()->setTime(11, 10, 0),
            'finalized_by_user_id' => $practitionerUser->id,
            'signer_name' => 'Dr. Julian Hayes',
            'signer_credentials' => 'LAc, Dipl. OM',
            'attestation_text' => 'I certify that I have conducted this clinical assessment and that the documented interventions are accurate.',
        ]);
    }
}
