<?php

namespace App\Console\Commands;

use App\Models\AddOn;
use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\ClientForm;
use App\Models\ClientIntake;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteAddendum;
use App\Models\ClinicalNoteTemplate;
use App\Models\Consent;
use App\Models\ConsentType;
use App\Models\IntakeFormTemplate;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\Location;
use App\Models\Message;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\PractitionerProfile;
use App\Models\Room;
use App\Models\ScribeAudioChunk;
use App\Models\ScribeDraftItem;
use App\Models\ScribeLanguage;
use App\Models\ScribeSession;
use App\Models\ScribeTranscriptSegment;
use App\Models\ScribeUsageLedger;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\TenantAddOn;
use App\Models\User;
use App\PatientBilling\InvoiceNumberAllocator;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DemoSeedRichCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'demo:seed-rich {--fresh : Wipe and re-create demo data for clinic astrogenapp}';

    /**
     * The console command description.
     */
    protected $description = 'Seed a rich, realistic marketing demo dataset for the local environment.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // 1. SAFETY: Must refuse to run if APP_ENV=production
        if (app()->environment('production')) {
            $this->error('CRITICAL: demo:seed-rich is strictly prohibited from running in production environment.');
            return 1;
        }

        // Force mail driver to "log" and fake notifications/mail so ZERO real external calls can occur
        config(['mail.default' => 'log']);
        config(['mail.mailers.resend.transport' => 'log']);
        Notification::fake();
        Mail::fake();

        $this->info('Starting rich demo data seeding for local marketing demo...');

        $isFresh = (bool) $this->option('fresh');

        // Ensure Plans exist
        if (! Plan::where('slug', 'signature')->exists()) {
            $this->call('db:seed', ['--class' => 'Database\\Seeders\\SubscriptionPlansSeeder']);
        }

        $signaturePlan = Plan::where('slug', 'signature')->firstOrFail();
        $professionalPlan = Plan::where('slug', 'professional')->firstOrFail();
        $essentialPlan = Plan::where('slug', 'essential')->firstOrFail();

        // Ensure Roles and Permissions
        $roles = ['Platform Admin', 'Clinic Owner', 'Practitioner', 'Receptionist', 'Client'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }
        $notesFinalize = Permission::firstOrCreate(['name' => 'notes.finalize', 'guard_name' => 'web']);
        Role::findByName('Clinic Owner')->givePermissionTo($notesFinalize);
        Role::findByName('Practitioner')->givePermissionTo($notesFinalize);

        $demoPasswordPlain = env('DEMO_PASSWORD', 'Password123!');
        $demoPasswordHash = Hash::make($demoPasswordPlain);

        // 2. Ensure Platform Admin user exists
        $adminUser = User::firstOrCreate(['email' => 'admin@umahz.com'], [
            'name' => 'Platform Admin',
            'password' => $demoPasswordHash,
            'email_verified_at' => now(),
        ]);
        if (! $adminUser->hasRole('Platform Admin')) {
            $adminUser->assignRole('Platform Admin');
        }
        $adminUser->update(['password' => $demoPasswordHash]);

        // 3. Find or Create Astrogenapp Tenant
        $tenant = Tenant::withoutGlobalScopes()->where('slug', 'astrogenapp')->first();

        if ($tenant && $isFresh) {
            $this->warn('Removing existing demo data for clinic [astrogenapp] (--fresh mode)...');

            DB::transaction(function () use ($tenant) {
                // Clear Scribe
                DB::table('scribe_usage_ledgers')->where('tenant_id', $tenant->id)->delete();
                DB::table('scribe_draft_items')->where('tenant_id', $tenant->id)->delete();
                DB::table('scribe_transcript_segments')->where('tenant_id', $tenant->id)->delete();
                DB::table('scribe_audio_chunks')->where('tenant_id', $tenant->id)->delete();
                DB::table('scribe_sessions')->where('tenant_id', $tenant->id)->delete();

                // Clear Clinical
                DB::table('clinical_note_addenda')->where('tenant_id', $tenant->id)->delete();
                DB::table('clinical_notes')->where('tenant_id', $tenant->id)->delete();
                DB::table('client_intakes')->where('tenant_id', $tenant->id)->delete();
                DB::table('consents')->where('tenant_id', $tenant->id)->delete();
                DB::table('client_forms')->where('tenant_id', $tenant->id)->delete();

                // Clear Billing
                DB::table('payments')->where('tenant_id', $tenant->id)->delete();
                DB::table('invoice_line_items')->where('tenant_id', $tenant->id)->delete();
                DB::table('invoices')->where('tenant_id', $tenant->id)->delete();

                // Clear Appointments
                DB::table('appointments')->where('tenant_id', $tenant->id)->delete();

                // Clear Clients
                DB::table('clients')->where('tenant_id', $tenant->id)->delete();

                // Clear Rooms and Locations
                DB::table('rooms')->where('tenant_id', $tenant->id)->delete();
                DB::table('locations')->where('tenant_id', $tenant->id)->delete();

                // Clear extra staff memberships
                $membershipsToDelete = StaffMembership::withoutGlobalScopes()
                    ->where('tenant_id', $tenant->id)
                    ->whereHas('user', function ($q) {
                        $q->whereNotIn('email', ['admin@umahz.com', 'astrogenapp@gmail.com', 'practitioner@astrogenapp.com', 'receptionist@astrogenapp.com']);
                    })
                    ->get();

                foreach ($membershipsToDelete as $m) {
                    PractitionerProfile::where('staff_membership_id', $m->id)->delete();
                    $userId = $m->user_id;
                    $m->delete();
                    User::where('id', $userId)->whereNotIn('email', ['admin@umahz.com', 'astrogenapp@gmail.com', 'practitioner@astrogenapp.com', 'receptionist@astrogenapp.com'])->delete();
                }
            });
        }

        $businessHours = [
            'monday' => ['open' => '08:00', 'close' => '19:00', 'closed' => false],
            'tuesday' => ['open' => '08:00', 'close' => '19:00', 'closed' => false],
            'wednesday' => ['open' => '08:00', 'close' => '19:00', 'closed' => false],
            'thursday' => ['open' => '08:00', 'close' => '19:00', 'closed' => false],
            'friday' => ['open' => '08:00', 'close' => '19:00', 'closed' => false],
            'saturday' => ['open' => '09:00', 'close' => '17:00', 'closed' => false],
            'sunday' => ['open' => '10:00', 'close' => '16:00', 'closed' => true],
        ];

        $homepageSettings = [
            'tagline' => 'Integrative Multidisciplinary Healthcare in Toronto',
            'description' => 'Astrogen Wellness Centre provides patient-centered care uniting Acupuncture, Registered Massage, Physiotherapy, Chiropractic, and Clinical Nutrition under one roof.',
            'cover_image_url' => 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80',
            'social' => [
                'instagram' => 'https://instagram.com/astrogenwellness',
                'facebook' => 'https://facebook.com/astrogenwellness',
                'linkedin' => 'https://linkedin.com/company/astrogenwellness',
                'website' => 'https://astrogenwellness.example.com',
            ],
            'gjs_html' => '<header class="umahz-section" style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); color: #ffffff; padding: 100px 24px; text-align: center;">
  <div style="max-width: 960px; margin: 0 auto;">
    <div style="display: inline-block; padding: 6px 16px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); border-radius: 9999px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 24px;">Welcome to Astrogen Wellness Centre</div>
    <h1 style="font-size: 3.5rem; font-weight: 800; line-height: 1.15; margin-bottom: 20px;">Modern Integrative Healthcare for Toronto</h1>
    <p style="font-size: 1.25rem; opacity: 0.92; line-height: 1.6; max-width: 720px; margin: 0 auto 36px;">Experience personalized multidisciplinary therapy uniting Acupuncture, Massage, Physiotherapy, Chiropractic, and Clinical Nutrition under one roof.</p>
    <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
      <a href="/pay" style="background: #2563EB; color: #ffffff; padding: 16px 36px; border-radius: 9999px; font-weight: 700; text-decoration: none; box-shadow: 0 10px 25px rgba(37,99,235,0.35);">Pay Invoice Online</a>
      <a href="/login" style="background: rgba(255,255,255,0.12); color: #ffffff; border: 1px solid rgba(255,255,255,0.3); padding: 16px 32px; border-radius: 9999px; font-weight: 600; text-decoration: none;">Staff Portal</a>
    </div>
  </div>
</header>
<section id="services" class="umahz-section" style="padding: 80px 24px; background: #f8fafc;">
  <div style="max-width: 1200px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 56px;">
      <h2 style="font-size: 2.4rem; font-weight: 800; color: #0f172a; margin-bottom: 12px;">Comprehensive Disciplines</h2>
      <p style="color: #64748b; font-size: 1.1rem;">Expert practitioners collaborating on your holistic wellness plan.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px;">
      <div style="background: #ffffff; padding: 32px 24px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h3 style="font-size: 1.3rem; font-weight: 700; color: #2563EB; margin-bottom: 8px;">Acupuncture & TCM</h3>
        <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5;">Targeted pain relief, electro-acupuncture, and botanical herbal consultations.</p>
      </div>
      <div style="background: #ffffff; padding: 32px 24px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h3 style="font-size: 1.3rem; font-weight: 700; color: #10B981; margin-bottom: 8px;">Massage Therapy</h3>
        <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5;">Registered deep tissue, myofascial release, and restorative prenatal therapy.</p>
      </div>
      <div style="background: #ffffff; padding: 32px 24px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h3 style="font-size: 1.3rem; font-weight: 700; color: #8B5CF6; margin-bottom: 8px;">Physiotherapy</h3>
        <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5;">Post-injury rehabilitation, active mobility coaching, and biomechanical recovery.</p>
      </div>
      <div style="background: #ffffff; padding: 32px 24px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h3 style="font-size: 1.3rem; font-weight: 700; color: #F59E0B; margin-bottom: 8px;">Chiropractic</h3>
        <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5;">Spinal decompression, gentle adjustments, and postural realignment.</p>
      </div>
      <div style="background: #ffffff; padding: 32px 24px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h3 style="font-size: 1.3rem; font-weight: 700; color: #EC4899; margin-bottom: 8px;">Clinical Nutrition</h3>
        <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5;">Metabolic health planning, chronic inflammation diets, and gut health protocols.</p>
      </div>
    </div>
  </div>
</section>
<section id="about" class="umahz-section" style="padding: 80px 24px; background: #ffffff;">
  <div style="max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px;">
    <div style="border-left: 4px solid #2563EB; padding-left: 20px;">
      <h2 style="font-size: 2.2rem; font-weight: 800; color: #0f172a; margin-bottom: 12px;">About Astrogen Wellness</h2>
      <p style="font-size: 1.1rem; line-height: 1.7; color: #475569;">Serving the Greater Toronto Area with two convenient clinics in Downtown Toronto and North York. Our licensed practitioners collaborate across disciplines to deliver evidenced-based care and long-term vitality.</p>
    </div>
  </div>
</section>
<section id="hours-contact" class="umahz-section" style="padding: 80px 24px; background: #0f172a; color: #f8fafc;">
  <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px;">
    <div style="background: rgba(255,255,255,0.05); padding: 32px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
      <h3 style="font-size: 1.4rem; font-weight: 700; margin-bottom: 16px; color: #60a5fa;">Clinic Operating Hours</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 8px 0;">Monday – Friday</td><td style="text-align: right; font-weight: 600;">8:00 AM – 7:00 PM</td></tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 8px 0;">Saturday</td><td style="text-align: right; font-weight: 600;">9:00 AM – 5:00 PM</td></tr>
        <tr><td style="padding: 8px 0;">Sunday</td><td style="text-align: right; color: #94a3b8;">Closed</td></tr>
      </table>
    </div>
    <div style="background: rgba(255,255,255,0.05); padding: 32px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
      <h3 style="font-size: 1.4rem; font-weight: 700; margin-bottom: 16px; color: #60a5fa;">Our Locations</h3>
      <p style="margin-bottom: 12px; line-height: 1.5;"><strong>Downtown:</strong> 100 University Ave, Suite 500, Toronto, ON M5J 1V6<br><span style="color: #94a3b8;">Phone: +1 (416) 555-0100</span></p>
      <p style="margin-bottom: 16px; line-height: 1.5;"><strong>North York:</strong> 45 Sheppard Ave E, Suite 310, North York, ON M2N 5W9<br><span style="color: #94a3b8;">Phone: +1 (416) 555-0102</span></p>
      <p style="color: #94a3b8; font-size: 0.9rem;">Email: astrogenapp@gmail.com</p>
    </div>
  </div>
</section>',
            'gjs_css' => 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }',
        ];

        $tenantData = [
            'name' => 'Astrogen Wellness Centre',
            'subdomain' => 'astrogenapp',
            'slug' => 'astrogenapp',
            'status' => Tenant::STATUS_APPROVED,
            'plan_tier' => 'signature',
            'plan_id' => $signaturePlan->id,
            'billing_interval' => 'month',
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'extra_practitioner_seats' => 2,
            'onboarding_completed_at' => now()->subMonths(8),
            'plan_started_at' => now()->subMonths(8),
            'currency' => 'CAD',
            'timezone' => 'America/Toronto',
            'email' => 'astrogenapp@gmail.com',
            'phone' => '+1 (416) 555-0100',
            'primary_contact_name' => 'Dr. Astrogen Owner',
            'primary_contact_email' => 'astrogenapp@gmail.com',
            'primary_contact_phone' => '+1 (416) 555-0100',
            'business_hours' => $businessHours,
            'brand_color' => '#2563EB',
            'homepage_settings' => $homepageSettings,
            'requested_disciplines' => ['acupuncture_tcm', 'massage_therapy', 'physiotherapy', 'chiropractor', 'nutrition'],
            'address' => [
                'line1' => '100 University Ave, Suite 500',
                'city' => 'Toronto',
                'region' => 'ON',
                'postal_code' => 'M5J 1V6',
                'country' => 'CA',
            ],
            'stripe_id' => 'cus_demo_astrogenapp',
        ];

        if (! $tenant) {
            $tenant = Tenant::create($tenantData);
        } else {
            $tenant->update($tenantData);
        }

        // The demo showcases AI Scribe (seeded sessions + usage allowance), so it
        // is switched on, with every spoken language the platform offers.
        $tenant->updateScribeSettings([
            'enabled' => true,
            'enabled_languages' => ['en', 'zh', 'fr'],
        ]);

        app()->instance('current_tenant_id', $tenant->id);

        // Mock subscription in DB (No real Stripe API calls)
        DB::table('subscriptions')->where('stripe_id', 'sub_demo_astrogenapp')->delete();
        DB::table('subscriptions')->updateOrInsert(
            [
                'tenant_id' => $tenant->id,
                'type' => Tenant::PLATFORM_SUBSCRIPTION,
            ],
            [
                'stripe_id' => 'sub_demo_astrogenapp',
                'stripe_status' => 'active',
                'stripe_price' => $signaturePlan->monthlyPrice?->stripe_base_price_id ?? 'price_signature_monthly_demo',
                'quantity' => 1,
                'created_at' => now()->subMonths(8),
                'updated_at' => now(),
            ]
        );

        // Attach Platform Admin to Astrogenapp
        StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $adminUser->id,
        ], [
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now()->subMonths(8),
        ]);

        // 4. Clinic Owner Login (astrogenapp@gmail.com)
        $ownerUser = User::firstOrCreate(['email' => 'astrogenapp@gmail.com'], [
            'name' => 'Dr. Astrogen Owner',
            'password' => $demoPasswordHash,
            'email_verified_at' => now(),
        ]);
        if (! $ownerUser->hasRole('Clinic Owner')) {
            $ownerUser->assignRole('Clinic Owner');
        }
        $ownerUser->update(['password' => $demoPasswordHash]);

        $ownerMembership = StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $ownerUser->id,
        ], [
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now()->subMonths(8),
        ]);

        // 5. Locations and Rooms
        $locDowntown = Location::firstOrCreate([
            'tenant_id' => $tenant->id,
            'name' => 'Downtown Toronto',
        ], [
            'address' => '100 University Ave, Suite 500, Toronto, ON M5J 1V6',
            'timezone' => 'America/Toronto',
            'phone' => '+1 (416) 555-0101',
            'is_active' => true,
        ]);

        $room101 = Room::firstOrCreate([
            'tenant_id' => $tenant->id,
            'location_id' => $locDowntown->id,
            'name' => 'Room 101 - Acupuncture & TCM Suite',
        ], ['description' => 'Equipped for acupuncture and somatic therapy', 'is_active' => true]);

        $room102 = Room::firstOrCreate([
            'tenant_id' => $tenant->id,
            'location_id' => $locDowntown->id,
            'name' => 'Room 102 - Massage & Bodywork Studio',
        ], ['description' => 'Heated massage table and sound therapy', 'is_active' => true]);

        $room103 = Room::firstOrCreate([
            'tenant_id' => $tenant->id,
            'location_id' => $locDowntown->id,
            'name' => 'Room 103 - Physiotherapy & Rehab Gym',
        ], ['description' => 'Rehab equipment, mobility assessment area', 'is_active' => true]);

        $locNorthYork = Location::firstOrCreate([
            'tenant_id' => $tenant->id,
            'name' => 'North York',
        ], [
            'address' => '45 Sheppard Ave E, Suite 310, North York, ON M2N 5W9',
            'timezone' => 'America/Toronto',
            'phone' => '+1 (416) 555-0102',
            'is_active' => true,
        ]);

        $room201 = Room::firstOrCreate([
            'tenant_id' => $tenant->id,
            'location_id' => $locNorthYork->id,
            'name' => 'Room 201 - Chiropractic Assessment Suite',
        ], ['description' => 'Drop table and spinal assessment posture grid', 'is_active' => true]);

        $room202 = Room::firstOrCreate([
            'tenant_id' => $tenant->id,
            'location_id' => $locNorthYork->id,
            'name' => 'Room 202 - Clinical Nutrition & Consultation Studio',
        ], ['description' => 'Private consulting and body composition analysis', 'is_active' => true]);

        // 6. 5 Practitioners across 5 disciplines
        $practitionersData = [
            [
                'email' => 'practitioner@astrogenapp.com',
                'name' => 'Dr. Julian Hayes',
                'profession' => PractitionerProfile::PROFESSION_ACUPUNCTURE_TCM,
                'credentials' => 'LAc, Dipl. OM',
                'biography' => 'Clinical TCM specialist with 12+ years treating chronic pain, migraines, and musculoskeletal dysfunction.',
                'calendar_color' => '#2563EB',
                'location_id' => $locDowntown->id,
                'room_id' => $room101->id,
                'working_days' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                'services' => [
                    ['name' => 'Initial Acupuncture Assessment & Treatment', 'duration' => 60, 'price' => 13500],
                    ['name' => 'Follow-up Acupuncture Session', 'duration' => 45, 'price' => 9500],
                    ['name' => 'Facial Acupuncture & Cupping Therapy', 'duration' => 60, 'price' => 12000],
                ],
            ],
            [
                'email' => 'elena.rostova@example.com',
                'name' => 'Elena Rostova',
                'profession' => PractitionerProfile::PROFESSION_MASSAGE_THERAPY,
                'credentials' => 'RMT, CMTO',
                'biography' => 'Specializes in myofascial trigger point release, sports recovery massage, and prenatal care.',
                'calendar_color' => '#10B981',
                'location_id' => $locDowntown->id,
                'room_id' => $room102->id,
                'working_days' => ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
                'services' => [
                    ['name' => 'Registered Massage Therapy (60m)', 'duration' => 60, 'price' => 11500],
                    ['name' => 'Deep Tissue & Trigger Point Massage (90m)', 'duration' => 90, 'price' => 16000],
                    ['name' => 'Prenatal Massage Therapy (60m)', 'duration' => 60, 'price' => 12000],
                ],
            ],
            [
                'email' => 'marcus.vance@example.com',
                'name' => 'Marcus Vance',
                'profession' => PractitionerProfile::PROFESSION_PHYSIOTHERAPY,
                'credentials' => 'PT, DPT, FCAMPT',
                'biography' => 'Doctor of Physical Therapy focused on orthopedic post-surgical rehab and athletic movement retraining.',
                'calendar_color' => '#8B5CF6',
                'location_id' => $locDowntown->id,
                'room_id' => $room103->id,
                'working_days' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                'services' => [
                    ['name' => 'Comprehensive Physiotherapy Assessment', 'duration' => 60, 'price' => 14000],
                    ['name' => 'Subsequent Physiotherapy Rehabilitation', 'duration' => 45, 'price' => 10000],
                    ['name' => 'Sports Injury & Mobility Session', 'duration' => 60, 'price' => 12500],
                ],
            ],
            [
                'email' => 'chloe.bennett@example.com',
                'name' => 'Dr. Chloe Bennett',
                'profession' => PractitionerProfile::PROFESSION_CHIROPRACTOR,
                'credentials' => 'DC, CCEP',
                'biography' => 'Chiropractic physician specializing in spine biomechanics, extremity adjusting, and posture correction.',
                'calendar_color' => '#F59E0B',
                'location_id' => $locNorthYork->id,
                'room_id' => $room201->id,
                'working_days' => ['monday', 'wednesday', 'thursday', 'friday', 'saturday'],
                'services' => [
                    ['name' => 'Chiropractic Initial Consultation & Exam', 'duration' => 60, 'price' => 13000],
                    ['name' => 'Chiropractic Adjustment & Postural Treatment', 'duration' => 30, 'price' => 7500],
                    ['name' => 'Spinal Decompression & Neuromuscular Rehab', 'duration' => 45, 'price' => 9500],
                ],
            ],
            [
                'email' => 'priya.sharma@example.com',
                'name' => 'Priya Sharma',
                'profession' => PractitionerProfile::PROFESSION_NUTRITION,
                'credentials' => 'RD, CDE, MSc',
                'biography' => 'Registered Dietitian focusing on cardiometabolic health, gut microbiome health, and sustainable lifestyle plans.',
                'calendar_color' => '#EC4899',
                'location_id' => $locNorthYork->id,
                'room_id' => $room202->id,
                'working_days' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                'services' => [
                    ['name' => 'Initial Clinical Nutrition Assessment', 'duration' => 60, 'price' => 14500],
                    ['name' => 'Nutritional Follow-up & Meal Planning', 'duration' => 45, 'price' => 9000],
                ],
            ],
        ];

        $practitioners = [];
        foreach ($practitionersData as $pData) {
            $u = User::firstOrCreate(['email' => $pData['email']], [
                'name' => $pData['name'],
                'password' => $demoPasswordHash,
                'email_verified_at' => now(),
            ]);
            $u->update(['password' => $demoPasswordHash]);
            if (! $u->hasRole('Practitioner')) {
                $u->assignRole('Practitioner');
            }

            $m = StaffMembership::firstOrCreate([
                'tenant_id' => $tenant->id,
                'user_id' => $u->id,
            ], [
                'role' => StaffMembership::ROLE_PRACTITIONER,
                'status' => StaffMembership::STATUS_ACTIVE,
                'joined_at' => now()->subMonths(8),
            ]);

            $prof = PractitionerProfile::updateOrCreate([
                'staff_membership_id' => $m->id,
            ], [
                'profession' => $pData['profession'],
                'credentials' => $pData['credentials'],
                'biography' => $pData['biography'],
                'calendar_color' => $pData['calendar_color'],
                'verification_status' => PractitionerProfile::VERIFICATION_VERIFIED,
                'employment_type' => PractitionerProfile::EMPLOYMENT_FULL_TIME,
                'reviewed_at' => now()->subMonths(8),
                'reviewed_by' => $adminUser->id,
            ]);

            $pData['user'] = $u;
            $pData['membership'] = $m;
            $pData['profile'] = $prof;
            $practitioners[] = $pData;
        }

        // 7. 2 Receptionists
        $receptionistsData = [
            [
                'email' => 'receptionist@astrogenapp.com',
                'name' => 'Maya Torres',
            ],
            [
                'email' => 'liam.davies@example.com',
                'name' => 'Liam Davies',
            ],
        ];

        foreach ($receptionistsData as $rData) {
            $u = User::firstOrCreate(['email' => $rData['email']], [
                'name' => $rData['name'],
                'password' => $demoPasswordHash,
                'email_verified_at' => now(),
            ]);
            $u->update(['password' => $demoPasswordHash]);
            if (! $u->hasRole('Receptionist')) {
                $u->assignRole('Receptionist');
            }

            StaffMembership::firstOrCreate([
                'tenant_id' => $tenant->id,
                'user_id' => $u->id,
            ], [
                'role' => StaffMembership::ROLE_RECEPTIONIST,
                'status' => StaffMembership::STATUS_ACTIVE,
                'joined_at' => now()->subMonths(8),
            ]);
        }

        // 8. 1 Pending Staff Invitation
        $invitedUser = User::firstOrCreate(['email' => 'claire.foster@example.com'], [
            'name' => 'Claire Foster',
            'password' => Hash::make(\Illuminate\Support\Str::random(32)),
        ]);
        StaffMembership::updateOrCreate(
            ['tenant_id' => $tenant->id, 'user_id' => $invitedUser->id],
            [
                'role' => StaffMembership::ROLE_PRACTITIONER,
                'status' => StaffMembership::STATUS_INVITED,
                'invited_at' => now()->subDays(2),
            ]
        );

        // 9. Ensure Templates for Intakes and Clinical Notes
        IntakeFormTemplate::ensureDefaultsForTenant($tenant->id, ['acupuncture_tcm', 'massage_therapy', 'physiotherapy', 'chiropractor', 'nutrition']);
        ClinicalNoteTemplate::ensureDefaultsForTenant($tenant->id, ['acupuncture_tcm', 'massage_therapy', 'physiotherapy', 'chiropractor', 'nutrition']);

        // Consent Types
        $consentGeneral = ConsentType::firstOrCreate([
            'tenant_id' => $tenant->id,
            'code' => ConsentType::CODE_GENERAL_TREATMENT,
        ], [
            'name' => 'General Treatment & Telehealth Consent',
            'description' => 'Comprehensive informed consent for multi-disciplinary therapies and telehealth consultations.',
            'body' => 'I understand that clinical treatments (Acupuncture, Massage, Physiotherapy, Chiropractic, Nutrition) involve thorough clinical assessment and evidence-based hands-on or lifestyle interventions. I voluntarily consent to treatment.',
            'is_active' => true,
        ]);

        $consentScribe = ConsentType::firstOrCreate([
            'tenant_id' => $tenant->id,
            'code' => ConsentType::CODE_AI_SCRIBE_RECORDING,
        ], [
            'name' => 'Audio Recording & AI Scribe Transcription Consent',
            'description' => 'Informed consent for secure in-session audio capture and machine transcription for documentation purposes.',
            'body' => 'I acknowledge and agree that my clinical consultation may be recorded solely for medical transcription and note drafting. No audio is shared publicly or used for marketing.',
            'is_active' => true,
        ]);

        $consentSensitive = ConsentType::firstOrCreate([
            'tenant_id' => $tenant->id,
            'code' => ConsentType::CODE_SENSITIVE_AREA,
        ], [
            'name' => 'Sensitive Areas Clinical Assessment Consent',
            'description' => 'Specific consent for examination of thoracic, pelvic, or gluteal anatomical landmarks.',
            'body' => 'I consent to physical assessment of targeted anatomical regions as clinically indicated for my diagnosis and rehabilitation.',
            'is_active' => true,
        ]);

        // 10. 120 Clients with Diverse Canadian Names, DOB, sex, preferred contact
        $firstNames = [
            'Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Charlotte', 'Lucas', 'Amelia', 'Benjamin', 'Sophia',
            'Ethan', 'Isabella', 'William', 'Ava', 'James', 'Mia', 'Henry', 'Evelyn', 'Alexander', 'Harper',
            'Michael', 'Camila', 'Daniel', 'Gianna', 'Matthew', 'Abigail', 'Jackson', 'Luna', 'Sebastian', 'Ella',
            'Aiden', 'Elizabeth', 'David', 'Sofia', 'Joseph', 'Emily', 'Carter', 'Avery', 'Owen', 'Mila',
            'Wyatt', 'Aria', 'John', 'Chloe', 'Jack', 'Layla', 'Luke', 'Penelope', 'Jayden', 'Riley',
            'Dylan', 'Zoey', 'Grayson', 'Nora', 'Levi', 'Lily', 'Isaac', 'Eleanor', 'Gabriel', 'Hannah',
            'Julian', 'Lillian', 'Mateo', 'Addison', 'Anthony', 'Aubrey', 'Jaxon', 'Ellie', 'Lincoln', 'Stella',
            'Joshua', 'Natalie', 'Christopher', 'Zoe', 'Andrew', 'Leah', 'Theodore', 'Hazel', 'Caleb', 'Violet',
            'Fatima', 'Arjun', 'Mei', 'Hiroshi', 'Zara', 'Tariq', 'Priya', 'Kofi', 'Amina', 'Dmitri',
            'Svetlana', 'Jean-Luc', 'Manon', 'Mathieu', 'Benoit', 'Camille', 'Chen', 'Wei', 'Yuki', 'Kenji',
            'Ananya', 'Rohan', 'Devanshi', 'Sunita', 'Kwame', 'Nia', 'Tenzin', 'Dawa', 'Soraya', 'Reza',
            'Chantal', 'Marc', 'Sylvie', 'Sebastien', 'Amira', 'Farhan', 'Nadia', 'Zayn', 'Ingrid', 'Lars',
        ];

        $lastNames = [
            'Tremblay', 'Smith', 'Roy', 'Brown', 'Gagnon', 'Wilson', 'Bouchard', 'MacDonald', 'Cote', 'Johnson',
            'Gauthier', 'Taylor', 'Morin', 'Anderson', 'Lavoie', 'Thomas', 'Fortin', 'Martin', 'Ouellet', 'White',
            'Pelletier', 'Campbell', 'Belanger', 'Kelly', 'Levesque', 'Patel', 'Chen', 'Singh', 'Wong', 'Li',
            'Sharma', 'Kowalski', 'Al-Mansoor', 'Tanaka', 'Kim', 'Nguyen', 'Hernandez', 'Silva', 'Santos', 'Rostova',
            'Ivanov', 'Petrov', 'Dubois', 'Fontaine', 'Mercier', 'Lefebvre', 'Moreau', 'Fournier', 'Girard', 'Beaulieu',
            'Desjardins', 'Vandermeer', 'Schmidt', 'Muller', 'Weber', 'O\'Connor', 'Murphy', 'Walsh', 'Farouk', 'Borges',
            'Gupta', 'Kumar', 'Chowdhury', 'Khan', 'Rahman', 'Takahashi', 'Suzuki', 'Nakamura', 'Park', 'Choi',
            'Diallo', 'Traore', 'Mensah', 'Boateng', 'Okafor', 'Adeyemi', 'Nowak', 'Wisniewski', 'Kaminski', 'Zielinski',
            'Popov', 'Sokolov', 'Kuznetsov', 'Morozov', 'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano',
            'Johansen', 'Hansen', 'Nielsen', 'Larsen', 'Lindqvist', 'Bergstrom', 'Holm', 'Eklund', 'Perez', 'Torres',
            'Rodriguez', 'Martinez', 'Garcia', 'Morales', 'Castillo', 'Vargas', 'Reyes', 'Gutierrez', 'Rios', 'Alvarez',
            'Sloan', 'Sinclair', 'Fraser', 'McKenzie', 'Sutherland', 'Livingston', 'MacLean', 'Chisholm', 'Munro', 'Armstrong',
        ];

        $contactMethods = ['email', 'phone', 'sms'];
        $sexOptions = ['male', 'female'];

        $clients = [];
        $totalClientsTarget = 120;

        for ($i = 0; $i < $totalClientsTarget; $i++) {
            $fName = $firstNames[$i % count($firstNames)];
            $lName = $lastNames[($i * 7) % count($lastNames)];
            $email = strtolower($fName).'.'.strtolower($lName).($i > 50 ? ($i + 1) : '').'@example.com';
            $phone = sprintf('+1 (416) 555-01%02d', ($i % 90) + 10);

            // Adults aged 22-75: born between 1951 and 2004
            $birthYear = 1951 + (($i * 13) % 53);
            $birthMonth = (($i * 3) % 12) + 1;
            $birthDay = (($i * 7) % 28) + 1;
            $dob = sprintf('%04d-%02d-%02d', $birthYear, $birthMonth, $birthDay);

            $sex = $sexOptions[$i % 2];
            $preferredContact = $contactMethods[$i % 3];
            $isActive = ($i < 112); // ~8 inactive clients

            // Spread created_at over the last 8 months, with ~16 created in the current month
            if ($i >= 104) {
                // New this month
                $createdAt = now()->startOfMonth()->addDays(($i - 104) % max(1, (int) now()->day));
            } else {
                $daysAgo = (int) (($totalClientsTarget - $i) * 2);
                $createdAt = now()->subDays(min(240, max(32, $daysAgo)));
            }

            $client = Client::firstOrCreate([
                'tenant_id' => $tenant->id,
                'email' => $email,
            ], [
                'first_name' => $fName,
                'last_name' => $lName,
                'phone' => $phone,
                'date_of_birth' => $dob,
                'sex' => $sex,
                'preferred_contact_method' => $preferredContact,
                'is_active' => $isActive,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
                'emergency_contact' => [
                    'name' => 'Alex '.($lName),
                    'relationship' => $i % 2 === 0 ? 'Spouse' : 'Partner',
                    'phone' => sprintf('+1 (416) 555-01%02d', (($i + 45) % 90) + 10),
                ],
            ]);

            DB::table('clients')->where('id', $client->id)->update([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            $clients[] = $client;
        }

        // 11. Client Consents
        foreach ($clients as $idx => $client) {
            // General Consent for ~95%
            if ($idx < 114) {
                Consent::firstOrCreate([
                    'tenant_id' => $tenant->id,
                    'client_id' => $client->id,
                    'consent_type_id' => $consentGeneral->id,
                ], [
                    'consent_type_name' => $consentGeneral->name,
                    'consent_body' => $consentGeneral->body,
                    'signer_name' => $client->full_name,
                    'signature_type' => 'draw',
                    'signature_data' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    'agreed_at' => $client->created_at->copy()->addMinutes(15),
                    'status' => Consent::STATUS_ACTIVE,
                    'ip_address' => '127.0.0.1',
                    'created_at' => $client->created_at->copy()->addMinutes(15),
                ]);
            }

            // AI Scribe Consent for ~30% (36 clients)
            if ($idx < 36) {
                Consent::firstOrCreate([
                    'tenant_id' => $tenant->id,
                    'client_id' => $client->id,
                    'consent_type_id' => $consentScribe->id,
                ], [
                    'consent_type_name' => $consentScribe->name,
                    'consent_body' => $consentScribe->body,
                    'signer_name' => $client->full_name,
                    'signature_type' => 'draw',
                    'signature_data' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    'agreed_at' => $client->created_at->copy()->addMinutes(20),
                    'status' => Consent::STATUS_ACTIVE,
                    'ip_address' => '127.0.0.1',
                    'created_at' => $client->created_at->copy()->addMinutes(20),
                ]);
            }

            // Sensitive Area for ~12% (14 clients)
            if ($idx < 14) {
                Consent::firstOrCreate([
                    'tenant_id' => $tenant->id,
                    'client_id' => $client->id,
                    'consent_type_id' => $consentSensitive->id,
                ], [
                    'consent_type_name' => $consentSensitive->name,
                    'consent_body' => $consentSensitive->body,
                    'signer_name' => $client->full_name,
                    'signature_type' => 'draw',
                    'signature_data' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    'agreed_at' => $client->created_at->copy()->addMinutes(25),
                    'status' => Consent::STATUS_ACTIVE,
                    'ip_address' => '127.0.0.1',
                    'created_at' => $client->created_at->copy()->addMinutes(25),
                ]);
            }
        }

        // 12. Client Intakes (discipline-specific completed for most clients; 4 with contraindication flags)
        $intakeTemplates = IntakeFormTemplate::where('tenant_id', $tenant->id)->get()->keyBy('discipline');

        $flaggedClients = [
            $clients[4]->id => ['reason' => 'First trimester pregnancy contraindicated for deep acupressure & sacral work', 'question' => 'is_pregnant'],
            $clients[12]->id => ['reason' => 'Implanted cardiac pacemaker contraindicated for electro-acupuncture', 'question' => 'has_pacemaker'],
            $clients[27]->id => ['reason' => 'Active anticoagulant therapy (warfarin) - high hematoma risk for deep tissue', 'question' => 'takes_anticoagulants'],
            $clients[39]->id => ['reason' => 'Unstable cervical radiculopathy - cervical high-velocity thrust adjustment contraindicated', 'question' => 'cervical_instability'],
        ];

        foreach ($clients as $idx => $client) {
            // Give ~100 clients completed intakes
            if ($idx < 100) {
                $discipline = match ($idx % 5) {
                    0 => 'acupuncture_tcm',
                    1 => 'massage_therapy',
                    2 => 'physiotherapy',
                    3 => 'chiropractor',
                    default => 'nutrition',
                };

                $template = $intakeTemplates->get($discipline) ?? $intakeTemplates->first();
                $isFlagged = isset($flaggedClients[$client->id]);

                $contraFlags = [];
                if ($isFlagged) {
                    $contraFlags[] = [
                        'section' => 'medical_history',
                        'question' => $flaggedClients[$client->id]['question'],
                        'value' => true,
                        'reason' => $flaggedClients[$client->id]['reason'],
                    ];
                }

                ClientIntake::firstOrCreate([
                    'tenant_id' => $tenant->id,
                    'client_id' => $client->id,
                    'discipline' => $discipline,
                ], [
                    'intake_form_template_id' => $template?->id,
                    'template_name' => $template?->name ?? 'Clinical Intake Form',
                    'schema_snapshot' => $template?->schema ?? ['sections' => []],
                    'responses' => [
                        'chief_complaint' => $isFlagged
                            ? $flaggedClients[$client->id]['reason']
                            : 'Patient presents with postural tension, neck stiffness and occupational ergonomic strain.',
                        'pain_rating' => ($idx % 6) + 3,
                        'symptom_duration' => '3 to 6 months',
                        'previous_treatments' => 'Physiotherapy, OTC NSAIDs, stretching',
                    ],
                    'contraindication_flags' => $contraFlags,
                    'status' => $isFlagged ? ClientIntake::STATUS_FLAGGED : ClientIntake::STATUS_COMPLETED,
                    'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
                    'submitted_at' => $client->created_at->copy()->addHours(1),
                    'created_at' => $client->created_at->copy()->addHours(1),
                    'ip_address' => '127.0.0.1',
                ]);
            }
        }

        // 13. GENERATE APPOINTMENTS & INVOICES
        // Strategy to guarantee 100% adherence to Postgres exclusion constraints:
        // Each practitioner has a dedicated room:
        // P0 (Acupuncture) -> Downtown Room 101
        // P1 (Massage)     -> Downtown Room 102
        // P2 (Physio)      -> Downtown Room 103
        // P3 (Chiro)       -> North York Room 201
        // P4 (Nutrition)   -> North York Room 202
        // On any given day, we schedule fixed, non-overlapping standard slot windows (e.g. 09:00, 10:15, 11:30, 13:00, 14:15, 15:30, 16:45, 18:00)
        // With duration <= 60 mins (e.g. 45-60m). Every slot has distinct starts_at and ends_at!
        // Because rooms are 1:1 with practitioners and slots never overlap, room collisions = 0, practitioner collisions = 0!

        $standardSlotHours = [
            ['h' => 9, 'm' => 0, 'dur' => 60],
            ['h' => 10, 'm' => 15, 'dur' => 60],
            ['h' => 11, 'm' => 30, 'dur' => 45],
            ['h' => 13, 'm' => 0, 'dur' => 60],
            ['h' => 14, 'm' => 15, 'dur' => 60],
            ['h' => 15, 'm' => 30, 'dur' => 45],
            ['h' => 16, 'm' => 30, 'dur' => 60],
            ['h' => 17, 'm' => 45, 'dur' => 45],
        ];

        $today = CarbonImmutable::now('America/Toronto')->startOfDay();
        $this->info("Scheduling past 6 months appointments relative to today ({$today->toDateString()})...");

        // Past 6 months targets to achieve healthy revenue growth:
        // Month -5 (~150 days ago): ~100 appts (~$18.5k)
        // Month -4 (~120 days ago): ~125 appts (~$21.5k)
        // Month -3 (~90 days ago):  ~145 appts (~$24.5k)
        // Month -2 (~60 days ago):  ~165 appts (~$27.5k)
        // Month -1 (~30 days ago):  ~185 appts (~$29.5k)
        // Month 0  (last 28 days up to yesterday): ~185 appts (~$32.5k MTD)
        // Total completed appts: ~900!

        $appointmentRecords = [];
        $completedAppointments = [];
        $apptsCreatedCount = 0;

        $startOfWeek = $today->startOfWeek(CarbonImmutable::MONDAY);
        $endHistoricalDate = $startOfWeek->subDay(); // Sunday immediately preceding current week
        $startHistoricalDate = $endHistoricalDate->subDays(154); // 22 weeks prior

        $historicalPeriod = \Carbon\CarbonPeriod::create($startHistoricalDate->toDateString(), $endHistoricalDate->toDateString());

        foreach ($historicalPeriod as $slotDateCarbon) {
            $slotDate = CarbonImmutable::parse($slotDateCarbon->toDateString(), 'America/Toronto');

            // Skip Sundays (clinic is closed)
            if ($slotDate->isSunday()) {
                continue;
            }

            $daysFromEnd = (int) abs($endHistoricalDate->diffInDays($slotDate));

            // Decide slots per practitioner based on month distance to generate the ~900 growing trend ($18k -> $30k)
            $slotsPerPractitioner = match (true) {
                $daysFromEnd > 125 => ($daysFromEnd % 3 === 0 ? 2 : 1), // Month 5 ago: ~6 appts/day (~150 appts = ~$18k)
                $daysFromEnd > 95  => ($daysFromEnd % 2 === 0 ? 2 : 1), // Month 4 ago: ~7 appts/day (~175 appts = ~$21k)
                $daysFromEnd > 65  => 2,                                // Month 3 ago: ~8 appts/day (~200 appts = ~$24k)
                $daysFromEnd > 35  => ($daysFromEnd % 3 === 0 ? 3 : 2), // Month 2 ago: ~9 appts/day (~225 appts = ~$27k)
                default            => ($daysFromEnd % 2 === 0 ? 3 : 2), // Month 1 ago: ~10 appts/day (~250 appts = ~$30k)
            };

            foreach ($practitioners as $pIdx => $p) {
                // Check if practitioner works on this day of week
                $dayName = strtolower($slotDate->format('l'));
                if (! in_array($dayName, $p['working_days'], true)) {
                    continue;
                }

                $cursor = $slotDate->setTime(8, 30);

                for ($s = 0; $s < $slotsPerPractitioner; $s++) {
                    $serviceDef = $p['services'][$s % count($p['services'])];
                    $duration = $serviceDef['duration'];

                    $startsAt = $cursor->setTimezone('UTC');
                    $endsAt = $startsAt->addMinutes($duration);
                    $cursor = $cursor->addMinutes($duration + 15);

                    // Client selection
                    $client = $clients[($apptsCreatedCount * 7) % count($clients)];

                    // Status distribution: ~92% completed, ~5% cancelled, ~3% no-show
                    $randStatus = ($apptsCreatedCount % 100);
                    $status = match (true) {
                        $randStatus < 5 => Appointment::STATUS_CANCELLED,
                        $randStatus < 8 => Appointment::STATUS_NO_SHOW,
                        default => Appointment::STATUS_COMPLETED,
                    };

                    $apt = Appointment::create([
                        'tenant_id' => $tenant->id,
                        'client_id' => $client->id,
                        'staff_membership_id' => $p['membership']->id,
                        'location_id' => $p['location_id'],
                        'room_id' => $p['room_id'],
                        'service_name' => $serviceDef['name'],
                        'starts_at' => $startsAt,
                        'ends_at' => $endsAt,
                        'status' => $status,
                        'notes' => $status === Appointment::STATUS_CANCELLED ? 'Patient gave notice of schedule conflict 24h prior.' : null,
                        'cancelled_at' => $status === Appointment::STATUS_CANCELLED ? $startsAt->subDay() : null,
                        'cancellation_reason' => $status === Appointment::STATUS_CANCELLED ? 'Client rescheduled' : null,
                        'created_at' => $startsAt->subDays(5),
                    ]);

                    $apptsCreatedCount++;

                    if ($status === Appointment::STATUS_COMPLETED) {
                        $completedAppointments[] = [
                            'appointment' => $apt,
                            'practitioner' => $p,
                            'client' => $client,
                            'service' => $serviceDef,
                            'date' => $slotDate,
                        ];
                    }
                }
            }
        }

        $this->info("Generated {$apptsCreatedCount} historical appointments (~".count($completedAppointments)." completed).");

        // 14. CURRENT WEEK APPOINTMENTS (Mon-Sat, 6-10 per practitioner per day)
        $startOfWeek = $today->startOfWeek(CarbonImmutable::MONDAY);
        $this->info("Scheduling full current week appointments starting {$startOfWeek->toDateString()}...");

        // Mon–Sat, plus today when today is a Sunday — "today" must always be busy.
        $weekDayIndexes = range(0, 5);
        if ($today->isSunday()) {
            $weekDayIndexes[] = 6;
        }

        foreach ($weekDayIndexes as $dayIdx) {
            $dayDate = $startOfWeek->addDays($dayIdx);
            $isToday = $dayDate->isSameDay($today);
            $isPastDay = $dayDate->isBefore($today);
            $isFutureDay = $dayDate->isAfter($today);

            foreach ($practitioners as $pIdx => $p) {
                $dayName = strtolower($dayDate->format('l'));
                // Every practitioner has a full schedule TODAY (weekends included),
                // so "Today's schedule" and today's sessions always look busy.
                if (! $isToday && ! in_array($dayName, $p['working_days'], true)) {
                    continue;
                }

                $cursor = $dayDate->setTime(8, 30);
                // 7 appointments per practitioner per day
                $slotsToday = 7;

                for ($s = 0; $s < $slotsToday; $s++) {
                    $serviceDef = $p['services'][$s % count($p['services'])];
                    $duration = $serviceDef['duration'];

                    $startsAt = $cursor->setTimezone('UTC');
                    $endsAt = $startsAt->addMinutes($duration);
                    $cursor = $cursor->addMinutes($duration + 15);

                    $client = $clients[(($s * 11) + ($dayIdx * 7) + ($pIdx * 13)) % count($clients)];

                    // Status based on whether slot is past, today, or future
                    if ($isPastDay) {
                        $status = ($s === 6 && ($pIdx % 3 === 0)) ? Appointment::STATUS_NO_SHOW : Appointment::STATUS_COMPLETED;
                    } elseif ($isToday) {
                        // Mix of completed (morning), checked-in (midday), scheduled (afternoon/evening)
                        if ($s < 2) {
                            $status = Appointment::STATUS_COMPLETED;
                        } elseif ($s === 2) {
                            $status = Appointment::STATUS_CHECKED_IN;
                        } else {
                            $status = Appointment::STATUS_SCHEDULED;
                        }
                    } else {
                        // Future days in current week
                        $status = ($s % 2 === 0) ? Appointment::STATUS_CONFIRMED : Appointment::STATUS_SCHEDULED;
                    }

                    $apt = Appointment::create([
                        'tenant_id' => $tenant->id,
                        'client_id' => $client->id,
                        'staff_membership_id' => $p['membership']->id,
                        'location_id' => $p['location_id'],
                        'room_id' => $p['room_id'],
                        'service_name' => $serviceDef['name'],
                        'starts_at' => $startsAt,
                        'ends_at' => $endsAt,
                        'status' => $status,
                        'created_at' => now()->subDays(4),
                    ]);

                    if ($status === Appointment::STATUS_COMPLETED) {
                        $completedAppointments[] = [
                            'appointment' => $apt,
                            'practitioner' => $p,
                            'client' => $client,
                            'service' => $serviceDef,
                            'date' => $dayDate,
                        ];
                    }
                }
            }
        }

        // 15. NEXT 3 WEEKS APPOINTMENTS (Scheduled / Confirmed)
        $this->info('Scheduling next 3 weeks future appointments...');
        for ($w = 1; $w <= 3; $w++) {
            for ($d = 0; $d < 6; $d++) {
                $futureDate = $startOfWeek->addWeeks($w)->addDays($d);
                foreach ($practitioners as $pIdx => $p) {
                    $dayName = strtolower($futureDate->format('l'));
                    if (! in_array($dayName, $p['working_days'], true)) {
                        continue;
                    }

                    // 5 slots booked per practitioner
                    $slotsToBook = 5;
                    $cursor = $futureDate->setTime(9, 0);

                    for ($s = 0; $s < $slotsToBook; $s++) {
                        $serviceDef = $p['services'][$s % count($p['services'])];
                        $duration = $serviceDef['duration'];

                        $startsAt = $cursor->setTimezone('UTC');
                        $endsAt = $startsAt->addMinutes($duration);
                        $cursor = $cursor->addMinutes($duration + 15);

                        $client = $clients[(($s * 5) + ($d * 9) + ($pIdx * 17) + ($w * 23)) % count($clients)];

                        Appointment::create([
                            'tenant_id' => $tenant->id,
                            'client_id' => $client->id,
                            'staff_membership_id' => $p['membership']->id,
                            'location_id' => $p['location_id'],
                            'room_id' => $p['room_id'],
                            'service_name' => $serviceDef['name'],
                            'starts_at' => $startsAt,
                            'ends_at' => $endsAt,
                            'status' => ($s % 2 === 0) ? Appointment::STATUS_CONFIRMED : Appointment::STATUS_SCHEDULED,
                            'created_at' => now()->subDays(2),
                        ]);
                    }
                }
            }
        }

        // 16. INVOICES & PAYMENTS FOR COMPLETED APPOINTMENTS
        $this->info("Creating patient invoices & payments for completed appointments (target Collection Efficiency ~92-94%)...");

        $paymentMethods = [Payment::METHOD_CARD, Payment::METHOD_CARD, Payment::METHOD_ETRANSFER, Payment::METHOD_CASH];

        $invoicesCreated = 0;
        $invoicesPaid = 0;
        $invoicesPartial = 0;
        $invoicesOpen = 0;

        foreach ($completedAppointments as $idx => $item) {
            $apt = $item['appointment'];
            $client = $item['client'];
            $service = $item['service'];
            $aptDate = $item['date'];

            $amount = $service['price'];
            $invNumber = InvoiceNumberAllocator::next($tenant->id);

            // Determine payment outcome:
            // ~92% paid in full
            // ~4% partially paid
            // ~4% open/unpaid
            $randOutcome = ($idx % 100);

            if ($randOutcome < 92) {
                // Paid in full
                $status = Invoice::STATUS_PAID;
                $paidAmount = $amount;
                $paidAt = $aptDate->setTime(random_int(12, 18), random_int(0, 59))->toDateTimeString();
                $invoicesPaid++;
            } elseif ($randOutcome < 96) {
                // Partially paid
                $status = Invoice::STATUS_OPEN;
                $paidAmount = (int) round($amount * 0.5);
                $paidAt = $aptDate->setTime(random_int(12, 18), random_int(0, 59))->toDateTimeString();
                $invoicesPartial++;
            } else {
                // Outstanding / overdue
                $status = Invoice::STATUS_OPEN;
                $paidAmount = 0;
                $paidAt = null;
                $invoicesOpen++;
            }

            $invoice = new Invoice([
                'client_id' => $client->id,
                'appointment_id' => $apt->id,
                'invoice_number' => $invNumber,
                'status' => $status,
                'currency' => 'cad',
                'subtotal_amount' => $amount,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'total_amount' => $amount,
                'amount_paid' => $paidAmount,
                'due_date' => $aptDate->addDays(14)->toDateString(),
                'issued_at' => $aptDate->toDateTimeString(),
                'paid_at' => $paidAt,
                'created_at' => $aptDate->toDateTimeString(),
                'updated_at' => $paidAt ?? $aptDate->toDateTimeString(),
            ]);
            $invoice->tenant_id = $tenant->id;
            $invoice->save();

            InvoiceLineItem::create([
                'tenant_id' => $tenant->id,
                'invoice_id' => $invoice->id,
                'description' => $service['name'],
                'quantity' => 1,
                'unit_amount' => $amount,
                'tax_amount' => 0,
                'total_amount' => $amount,
                'sort_order' => 0,
                'created_at' => $aptDate->toDateTimeString(),
            ]);

            if ($paidAmount > 0) {
                $method = $paymentMethods[$idx % count($paymentMethods)];
                Payment::create([
                    'tenant_id' => $tenant->id,
                    'invoice_id' => $invoice->id,
                    'method' => $method,
                    'status' => Payment::STATUS_SUCCEEDED,
                    'amount' => $paidAmount,
                    'currency' => 'cad',
                    'application_fee_amount' => 0,
                    'stripe_charge_id' => $method === Payment::METHOD_CARD ? 'ch_demo_'.\Illuminate\Support\Str::random(16) : null,
                    'notes' => $method === Payment::METHOD_CARD ? 'Stripe Terminal / Card reader' : 'Reception desk manual collection',
                    'processed_at' => $paidAt,
                    'created_at' => $paidAt,
                ]);
            }

            $invoicesCreated++;
        }

        // 16b. Prepaid Treatment Packages & Wellness Passes for Current Month
        $packageDefs = [
            ['name' => 'Acupuncture & TCM 10-Session Pass', 'amount' => 95000],
            ['name' => 'Comprehensive Physical Rehab 5-Pack', 'amount' => 60000],
            ['name' => 'Massage Therapy Wellness Bundle (5x 60m)', 'amount' => 55000],
            ['name' => 'Chiropractic Maintenance 6-Pack', 'amount' => 57000],
            ['name' => 'Clinical Nutrition & Metabolic Optimization Package', 'amount' => 45000],
        ];

        $currentMonthStart = now()->startOfMonth()->setTime(10, 0);
        $packagesCount = 18;
        for ($pkgIdx = 0; $pkgIdx < $packagesCount; $pkgIdx++) {
            $pkg = $packageDefs[$pkgIdx % count($packageDefs)];
            $pkgClient = $clients[($pkgIdx * 5 + 3) % count($clients)];
            $invNumber = InvoiceNumberAllocator::next($tenant->id);
            $pkgAmount = $pkg['amount'];
            $pkgPaidAt = $currentMonthStart->addHours($pkgIdx % 8)->toDateTimeString();

            $inv = new Invoice([
                'client_id' => $pkgClient->id,
                'appointment_id' => null,
                'invoice_number' => $invNumber,
                'status' => Invoice::STATUS_PAID,
                'currency' => 'cad',
                'subtotal_amount' => $pkgAmount,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'total_amount' => $pkgAmount,
                'amount_paid' => $pkgAmount,
                'due_date' => $currentMonthStart->toDateString(),
                'issued_at' => $pkgPaidAt,
                'paid_at' => $pkgPaidAt,
                'created_at' => $pkgPaidAt,
                'updated_at' => $pkgPaidAt,
            ]);
            $inv->tenant_id = $tenant->id;
            $inv->save();

            InvoiceLineItem::create([
                'tenant_id' => $tenant->id,
                'invoice_id' => $inv->id,
                'description' => $pkg['name'],
                'quantity' => 1,
                'unit_amount' => $pkgAmount,
                'tax_amount' => 0,
                'total_amount' => $pkgAmount,
                'sort_order' => 0,
                'created_at' => $pkgPaidAt,
            ]);

            Payment::create([
                'tenant_id' => $tenant->id,
                'invoice_id' => $inv->id,
                'method' => ($pkgIdx % 2 === 0) ? Payment::METHOD_CARD : Payment::METHOD_ETRANSFER,
                'status' => Payment::STATUS_SUCCEEDED,
                'amount' => $pkgAmount,
                'currency' => 'cad',
                'application_fee_amount' => 0,
                'stripe_charge_id' => ($pkgIdx % 2 === 0) ? 'ch_demo_'.\Illuminate\Support\Str::random(16) : null,
                'notes' => 'Prepaid wellness care pass',
                'processed_at' => $pkgPaidAt,
                'created_at' => $pkgPaidAt,
            ]);

            $invoicesPaid++;
            $invoicesCreated++;
        }

        $collectionEfficiency = $invoicesCreated > 0 ? round(($invoicesPaid / $invoicesCreated) * 100, 1) : 0;
        $this->info("Created {$invoicesCreated} patient invoices. Paid: {$invoicesPaid}, Partial: {$invoicesPartial}, Open: {$invoicesOpen}. Collection Efficiency: {$collectionEfficiency}%.");

        // 17. CLINICAL NOTES (Signed, Drafts, and Addended)
        $this->info('Generating clinical SOAP notes for completed encounters...');

        $clinicalTemplates = ClinicalNoteTemplate::where('tenant_id', $tenant->id)->get()->keyBy('discipline');

        $soapContents = [
            'acupuncture_tcm' => [
                'subjective' => 'Patient reports bilateral lumbar tension (5/10 pain scale) aggravated by prolonged sitting. Energy levels fair; mild sleep disturbance.',
                'objective' => 'Palpation revealed tenderness over bilateral UB23, UB25, and GB30. Tongue pale pink with thin white fur; pulse wiry in liver position.',
                'assessment' => 'Qi and Blood stagnation in the Taiyang and Shaoyang meridians with mild Spleen Qi deficiency.',
                'plan' => 'Administered 25 min electro-acupuncture to UB23, UB25, GB30, and BL40. TDP heat lamp applied. Rebook in 1 week.',
            ],
            'massage_therapy' => [
                'subjective' => 'Client reports chronic shoulder tightness, upper trapezius spasms, and postural tension after desk work.',
                'objective' => 'Hypertonicity and active trigger points palpated in bilateral upper trapezius and levator scapulae. Cervical rotation restricted to 65 deg bilaterally.',
                'assessment' => 'Postural myofascial strain and cervicothoracic muscular hypertonicity.',
                'plan' => '60 min deep tissue therapy, trigger point compression, and gentle neck traction. Prescribed levator scapulae doorway stretches. Rebook in 2 weeks.',
            ],
            'physiotherapy' => [
                'subjective' => 'Patient presents with right knee anterior pain when descending stairs and running. Denies clicking or giving way.',
                'objective' => 'Tenderness over patellar tendon insertion. Ober test positive bilaterally. Single leg squat demonstrates dynamic knee valgus. Quadriceps strength 4+/5.',
                'assessment' => 'Patellofemoral pain syndrome secondary to hip abductor weakness and quad dominance.',
                'plan' => 'Provided patellar mobilization, eccentric decline squat protocol, and gluteus medius strengthening exercises. Home exercise program updated.',
            ],
            'chiropractor' => [
                'subjective' => 'Patient reports dull aching across mid-thoracic spine and lower cervical junction following heavy lifting.',
                'objective' => 'Joint restriction palpated at T4-T7 segments and C5-C6. Paraspinal muscle guarding noted. Cervical Kemp test negative.',
                'assessment' => 'Thoracic segmental joint dysfunction with compensatory muscular spasm.',
                'plan' => 'High-velocity low-amplitude (HVLA) thoracic adjustments delivered at T5 and T7. Suboccipital myofascial release applied. Ergonomic review provided.',
            ],
            'nutrition' => [
                'subjective' => 'Client reports afternoon energy slumps, postprandial bloating, and cravings for refined carbohydrates.',
                'objective' => '3-day dietary recall reviewed: protein intake ~0.8g/kg/day, fiber ~14g/day, low intake of omega-3 fatty acids and fermented foods.',
                'assessment' => 'Suboptimal dietary macronutrient balance and low prebiotic fiber intake contributing to blood sugar instability.',
                'plan' => 'Tailored Mediterranean-style anti-inflammatory meal template established. Targeted 25g daily fiber goal. Follow-up consultation in 3 weeks.',
            ],
        ];

        $notesCount = 0;
        $draftsTarget = 8;
        $addendaTarget = 3;

        foreach ($completedAppointments as $idx => $item) {
            // Document note for ~80% of completed appointments
            if ($idx % 5 === 0 && $idx > 40) {
                continue; // Skip some so not 100% charted
            }

            $apt = $item['appointment'];
            $p = $item['practitioner'];
            $client = $item['client'];
            $discipline = $p['profession'];
            $aptDate = $item['date'];

            $template = $clinicalTemplates->get($discipline) ?? $clinicalTemplates->first();
            $soap = $soapContents[$discipline] ?? $soapContents['acupuncture_tcm'];

            $isDraft = ($notesCount < $draftsTarget);
            $isAddended = (! $isDraft && $notesCount >= 10 && $notesCount < 10 + $addendaTarget);

            $status = $isDraft
                ? ClinicalNote::STATUS_DRAFT
                : ($isAddended ? ClinicalNote::STATUS_ADDENDED : ClinicalNote::STATUS_FINALIZED);

            $note = ClinicalNote::create([
                'tenant_id' => $tenant->id,
                'client_id' => $client->id,
                'staff_membership_id' => $p['membership']->id,
                'appointment_id' => $apt->id,
                'clinical_note_template_id' => $template?->id,
                'discipline' => $discipline,
                'template_name' => $template?->name ?? 'Standard Clinical SOAP Record',
                'template_version' => 1,
                'schema_snapshot' => $template?->schema ?? ['sections' => []],
                'content' => $soap,
                'status' => $status,
                'signer_name' => $isDraft ? null : $p['name'],
                'signer_credentials' => $isDraft ? null : $p['credentials'],
                'attestation_text' => $isDraft ? null : 'I certify that I have conducted this clinical assessment and the documented interventions are accurate.',
                'signed_at' => $isDraft ? null : $aptDate->setTime(random_int(12, 19), 0)->toDateTimeString(),
                'finalized_at' => $isDraft ? null : $aptDate->setTime(random_int(12, 19), 0)->toDateTimeString(),
                'finalized_by_user_id' => $isDraft ? null : $p['user']->id,
                'created_at' => $aptDate->toDateTimeString(),
                'updated_at' => $aptDate->toDateTimeString(),
            ]);

            if ($isAddended) {
                ClinicalNoteAddendum::create([
                    'tenant_id' => $tenant->id,
                    'clinical_note_id' => $note->id,
                    'staff_membership_id' => $p['membership']->id,
                    'author_user_id' => $p['user']->id,
                    'author_name' => $p['name'],
                    'author_role' => 'Practitioner',
                    'reason' => 'Patient telephone check-in 24 hours post-treatment',
                    'content' => 'Patient called reporting 70% resolution of focal symptoms with mild transient soreness. Reassured and advised active hydration.',
                    'signed_at' => $aptDate->addDay()->setTime(10, 30)->toDateTimeString(),
                    'created_at' => $aptDate->addDay()->setTime(10, 30)->toDateTimeString(),
                ]);
            }

            $notesCount++;
        }

        $this->info("Created {$notesCount} clinical notes ({$draftsTarget} drafts, {$addendaTarget} with addenda).");

        // 18. AI SCRIBE SESSIONS (8-10 past sessions: 7 English + 2 Mandarin)
        $this->info('Seeding realistic AI Scribe encounters (English + Mandarin) and usage ledger...');

        // Each encounter is written per discipline and keyed to that discipline's
        // real clinical-note template field ids — the same shape ScribeDraftService
        // produces — so the draft renders field by field in the Scribe panel.
        // Dialogue uses {client}, so the transcript always names the client the
        // session is attached to. Mandarin encounters keep the original Chinese
        // with an English translation per line, and produce an English draft.
        // Draft rows: field_id => [provenance, evidence segment sequences, text].
        $cr = ScribeDraftItem::PROVENANCE_CLIENT_REPORTED;
        $ps = ScribeDraftItem::PROVENANCE_PRACTITIONER_STATED;
        $om = ScribeDraftItem::PROVENANCE_OBJECTIVE_MEASUREMENT;
        $ai = ScribeDraftItem::PROVENANCE_AI_GENERATED;

        $scribeSessionsData = [
            [ // Dr. Julian Hayes — Acupuncture & TCM
                'client_idx' => 0, 'practitioner_idx' => 0, 'lang' => 'en', 'mins' => 22,
                'dialogue' => [
                    ['practitioner', 'Good morning {client}. How has your lower back been this week?'],
                    ['client', 'It started about three weeks ago after moving boxes. The dull ache goes down my right leg when I sit for long.'],
                    ['client', 'I am also sleeping badly, and my energy drops in the afternoon.'],
                    ['practitioner', 'Your tongue is pale with a thin white coat, and the pulse is wiry on the left side.'],
                    ['practitioner', 'Today we will needle BL23, BL25, GB30 and BL40, retain for twenty minutes, and add cupping over the lower back.'],
                    ['practitioner', 'Keep walking daily, avoid long periods of sitting, and use a warm compress in the evening. Let us see you again next week.'],
                ],
                'draft' => [
                    'chief_complaint' => [$cr, [2], 'Right-sided low back pain for 3 weeks after lifting boxes, radiating to the right leg when sitting.'],
                    'systemic_symptoms' => [$cr, [3], 'Poor sleep and afternoon fatigue.'],
                    'tongue_diagnosis' => [$ps, [4], 'Pale, thin white coat.'],
                    'pulse_diagnosis' => [$ps, [4], 'Wiry, left side.'],
                    'pattern_differentiation' => [$ai, [2, 4], 'Qi and Blood stagnation in the lower back channels.'],
                    'acupoints_used' => [$ps, [5], 'BL23, BL25, GB30, BL40.'],
                    'adjunct_therapies' => [$ps, [5], 'Cupping over the lumbar region.'],
                    'lifestyle_herbal_advice' => [$ps, [6], 'Daily walking, avoid prolonged sitting, warm compress in the evening. Follow-up next week.'],
                ],
            ],
            [ // Elena Rostova — Massage Therapy
                'client_idx' => 1, 'practitioner_idx' => 1, 'lang' => 'en', 'mins' => 28,
                'dialogue' => [
                    ['practitioner', 'Hi {client}, how has your neck been since our last massage?'],
                    ['client', 'Better overall, but I still get tension headaches around 3 p.m. on long computer days.'],
                    ['client', 'Turning my head to the left is still a bit stiff.'],
                    ['practitioner', 'I can feel trigger points in both suboccipitals and in the right levator scapulae. Your shoulders are rolled forward.'],
                    ['practitioner', 'Today I will focus on suboccipital release, trigger point work on the upper traps, and pec lengthening.'],
                    ['practitioner', 'Do chin tucks three times a day and take a stretch break every hour. Let us book again in two weeks.'],
                ],
                'draft' => [
                    'chief_complaint' => [$cr, [2], 'Tension headaches around 3 p.m. on long computer days.'],
                    'changes_since_last_visit' => [$cr, [2, 3], 'Neck improved overall; left rotation still stiff.'],
                    'palpation_findings' => [$ps, [4], 'Trigger points in bilateral suboccipitals and right levator scapulae.'],
                    'rom_posture' => [$ps, [3, 4], 'Forward-rolled shoulders; restricted left cervical rotation.'],
                    'treatment_modalities' => [$ps, [5], 'Suboccipital release, upper trapezius trigger point therapy, pectoral lengthening.'],
                    'home_care' => [$ps, [6], 'Chin tucks 3x daily; hourly stretch breaks. Rebook in 2 weeks.'],
                ],
            ],
            [ // Marcus Vance — Physiotherapy
                'client_idx' => 2, 'practitioner_idx' => 2, 'lang' => 'en', 'mins' => 20,
                'dialogue' => [
                    ['practitioner', 'Hi {client}, tell me about the morning stiffness in your Achilles.'],
                    ['client', 'The first ten steps out of bed are the worst, and running five kilometres brings the pain back.'],
                    ['practitioner', 'Ankle dorsiflexion is 10 degrees on the right versus 15 on the left.'],
                    ['practitioner', 'There is thickening and tenderness about four centimetres above the heel. Single-leg heel raise gives 4 out of 10 pain, and you managed 12 reps.'],
                    ['practitioner', 'This looks like a midportion Achilles tendinopathy. Today we started heavy slow resistance calf raises.'],
                    ['practitioner', 'Do the calf raises, three sets of fifteen, slowly, every other day, and pause running for two weeks.'],
                ],
                'draft' => [
                    'chief_complaint' => [$cr, [2], 'Right Achilles morning stiffness; pain returns with 5 km runs.'],
                    'range_of_motion' => [$om, [3], 'Ankle dorsiflexion: right 10°, left 15°.'],
                    'strength_and_palpation' => [$ps, [4], 'Thickening and tenderness ~4 cm proximal to the calcaneus; single-leg heel raise 12 reps.'],
                    'special_tests' => [$om, [4], 'Single-leg heel raise reproduces 4/10 pain.'],
                    'clinical_assessment' => [$ai, [2, 4, 5], 'Right midportion Achilles tendinopathy.'],
                    'treatment_administered' => [$ps, [5], 'Introduced heavy slow resistance calf raises.'],
                    'home_exercise_program' => [$ps, [6], 'Calf raises 3x15, slow tempo, every other day; pause running for 2 weeks.'],
                ],
            ],
            [ // Dr. Chloe Bennett — Chiropractic
                'client_idx' => 3, 'practitioner_idx' => 3, 'lang' => 'en', 'mins' => 18,
                'dialogue' => [
                    ['practitioner', 'Hi {client}, what brings you in today?'],
                    ['client', 'My lower back has been sore on the left for about ten days, mostly after sitting at work.'],
                    ['client', 'It gets to about a 6 out of 10 in the evenings.'],
                    ['practitioner', 'I am finding restricted motion at L5 and the left sacroiliac joint, and the left hip sits slightly higher.'],
                    ['practitioner', 'I will do a side-posture adjustment at L5 and the left SI joint, then some soft tissue work.'],
                    ['practitioner', 'Use a lumbar roll at your desk, walk every hour, and come back in one week.'],
                ],
                'draft' => [
                    'chief_complaint' => [$cr, [2, 3], 'Left low back pain for 10 days, worse after sitting; 6/10 in the evenings.'],
                    'segmental_findings' => [$ps, [4], 'Restricted motion at L5 and the left SI joint.'],
                    'palpation_posture' => [$ps, [4], 'Elevated left iliac crest.'],
                    'clinical_assessment' => [$ai, [2, 4], 'Mechanical low back pain with left SI joint dysfunction.'],
                    'adjustments_performed' => [$ps, [5], 'Side-posture adjustment at L5 and left SI joint; soft tissue therapy.'],
                    'patient_recommendations' => [$ps, [6], 'Lumbar roll at desk; walk hourly. Follow-up in 1 week.'],
                ],
            ],
            [ // Priya Sharma — Nutrition & Dietetics
                'client_idx' => 4, 'practitioner_idx' => 4, 'lang' => 'en', 'mins' => 30,
                'dialogue' => [
                    ['practitioner', 'Hi {client}, walk me through a typical day of eating.'],
                    ['client', 'Coffee and a muffin for breakfast, a sandwich at lunch, chips around 3 p.m., and pasta for dinner most nights.'],
                    ['client', 'I crash in the afternoon, and I feel bloated after lunch most days.'],
                    ['practitioner', 'Today your weight is 82 kilograms and your waist is 94 centimetres.'],
                    ['practitioner', 'Your breakfast is low in protein, which may be adding to the afternoon dip.'],
                    ['practitioner', 'Let us aim for 25 grams of protein at breakfast, swap the afternoon chips for fruit and nuts, and check in again in three weeks.'],
                ],
                'draft' => [
                    'dietary_recall' => [$cr, [2], 'Breakfast: coffee and muffin. Lunch: sandwich. 3 p.m.: chips. Dinner: pasta.'],
                    'gi_symptoms' => [$cr, [3], 'Post-lunch bloating most days.'],
                    'clinical_diagnosis' => [$ai, [2, 3, 5], 'Low-protein breakfast pattern associated with afternoon energy dips.'],
                    'anthropometric_metrics' => [$om, [4], 'Weight 82 kg; waist 94 cm.'],
                    'actionable_goals' => [$ps, [6], '25 g protein at breakfast; swap afternoon chips for fruit and nuts. Review in 3 weeks.'],
                ],
            ],
            [ // Dr. Julian Hayes — Acupuncture & TCM, spoken in Mandarin, English draft
                'client_idx' => 5, 'practitioner_idx' => 0, 'lang' => 'zh', 'mins' => 25,
                'dialogue' => [
                    ['practitioner', '{client}，你好。最近两个星期睡眠和胃口怎么样？', 'Hello {client}. How have your sleep and appetite been over the past two weeks?'],
                    ['client', '晚上很难入睡，半夜常常醒来，早上起来身体很沉重。', 'It is hard to fall asleep, I often wake up in the night, and my body feels heavy in the morning.'],
                    ['client', '吃饭以后肚子胀，下午特别累。', 'My stomach feels bloated after meals, and I am especially tired in the afternoon.'],
                    ['practitioner', '舌头淡胖，有齿痕，舌苔白腻。脉象细弱。', 'The tongue is pale and swollen with teeth marks and a white, greasy coat. The pulse is thin and weak.'],
                    ['practitioner', '今天针刺足三里、三阴交、神门和百会，留针二十分钟，加艾灸。', 'Today I will needle ST36, SP6, HT7 and DU20, retain for twenty minutes, and add moxibustion.'],
                    ['practitioner', '晚上十一点前睡觉，少吃生冷的食物，一周后复诊。', 'Go to bed before 11 p.m., eat fewer raw and cold foods, and come back in one week.'],
                ],
                'draft' => [
                    'chief_complaint' => [$cr, [2], 'Difficulty falling asleep with night waking; heaviness on waking (2 weeks).'],
                    'systemic_symptoms' => [$cr, [3], 'Bloating after meals; marked afternoon fatigue.'],
                    'tongue_diagnosis' => [$ps, [4], 'Pale, swollen with teeth marks; white greasy coat.'],
                    'pulse_diagnosis' => [$ps, [4], 'Thin and weak.'],
                    'pattern_differentiation' => [$ai, [2, 3, 4], 'Spleen Qi deficiency with Heart and Spleen disharmony.'],
                    'acupoints_used' => [$ps, [5], 'ST36, SP6, HT7, DU20.'],
                    'adjunct_therapies' => [$ps, [5], 'Moxibustion.'],
                    'lifestyle_herbal_advice' => [$ps, [6], 'Sleep before 11 p.m.; reduce raw and cold foods. Follow-up in one week.'],
                ],
            ],
            [ // Dr. Julian Hayes — Acupuncture & TCM, spoken in Mandarin, English draft
                'client_idx' => 6, 'practitioner_idx' => 0, 'lang' => 'zh', 'mins' => 24,
                'dialogue' => [
                    ['practitioner', '{client}，你好。今天膝盖感觉怎么样？', 'Hello {client}. How does your knee feel today?'],
                    ['client', '右膝盖疼了一个多月，上下楼梯的时候最明显。', 'My right knee has hurt for over a month; it is worst going up and down stairs.'],
                    ['client', '天气冷的时候更疼，早上有点僵硬。', 'It hurts more when the weather is cold, and it is a little stiff in the morning.'],
                    ['practitioner', '舌淡，苔白，脉沉紧。膝盖周围有压痛。', 'The tongue is pale with a white coat, and the pulse is deep and tight. There is tenderness around the knee.'],
                    ['practitioner', '今天针刺犊鼻、内膝眼、阳陵泉和足三里，加温针灸。', 'Today I will needle ST35, medial Xiyan, GB34 and ST36, with warm-needle moxibustion.'],
                    ['practitioner', '注意膝盖保暖，避免长时间爬楼梯，一周后复诊。', 'Keep the knee warm, avoid long stair climbing, and come back in one week.'],
                ],
                'draft' => [
                    'chief_complaint' => [$cr, [2], 'Right knee pain for over a month, worse on stairs.'],
                    'systemic_symptoms' => [$cr, [3], 'Worse in cold weather; morning stiffness.'],
                    'tongue_diagnosis' => [$ps, [4], 'Pale, white coat.'],
                    'pulse_diagnosis' => [$ps, [4], 'Deep and tight.'],
                    'pattern_differentiation' => [$ai, [3, 4], 'Cold-Damp Bi syndrome of the right knee.'],
                    'acupoints_used' => [$ps, [5], 'ST35, medial Xiyan, GB34, ST36.'],
                    'adjunct_therapies' => [$ps, [5], 'Warm-needle moxibustion.'],
                    'lifestyle_herbal_advice' => [$ps, [6], 'Keep the knee warm; limit prolonged stair climbing. Follow-up in one week.'],
                ],
            ],
            [ // Elena Rostova — Massage Therapy
                'client_idx' => 7, 'practitioner_idx' => 1, 'lang' => 'en', 'mins' => 26,
                'dialogue' => [
                    ['practitioner', 'Welcome back, {client}. How is the right shoulder?'],
                    ['client', 'Reaching overhead still pinches, and I have had trouble sleeping on that side.'],
                    ['practitioner', 'Overhead flexion is limited at the end of range, and the posterior capsule feels tight.'],
                    ['practitioner', 'There is a tender band in the right infraspinatus and in the upper trapezius.'],
                    ['practitioner', 'I will do deep tissue work on the rotator cuff, cross-fibre friction on the infraspinatus, and gentle shoulder mobilisations.'],
                    ['practitioner', 'Try the sleeper stretch twice a day and put a pillow under the arm at night. Book again in ten days.'],
                ],
                'draft' => [
                    'chief_complaint' => [$cr, [2], 'Right shoulder pinch with overhead reaching; disturbed sleep on that side.'],
                    'palpation_findings' => [$ps, [4], 'Taut, tender band in right infraspinatus and upper trapezius.'],
                    'rom_posture' => [$ps, [3], 'End-range overhead flexion limited; tight posterior capsule.'],
                    'treatment_modalities' => [$ps, [5], 'Deep tissue to rotator cuff, cross-fibre friction to infraspinatus, gentle shoulder mobilisations.'],
                    'home_care' => [$ps, [6], 'Sleeper stretch 2x daily; pillow under arm at night. Rebook in 10 days.'],
                ],
            ],
            [ // Marcus Vance — Physiotherapy
                'client_idx' => 8, 'practitioner_idx' => 2, 'lang' => 'en', 'mins' => 21,
                'dialogue' => [
                    ['practitioner', 'Hi {client}, how is the ankle two weeks after the sprain?'],
                    ['client', 'Walking is fine now, but it feels unstable on uneven ground and I am nervous about going back to basketball.'],
                    ['practitioner', 'Swelling is down. Dorsiflexion is 12 degrees on the left compared with 16 on the right.'],
                    ['practitioner', 'Anterior drawer is negative, and single-leg balance is 15 seconds on the left versus 40 on the right.'],
                    ['practitioner', 'Today we did balance training on foam and resistance band work for the peroneals.'],
                    ['practitioner', 'Practise single-leg balance twice a day and do the band exercises daily. We will start hopping drills next session.'],
                ],
                'draft' => [
                    'chief_complaint' => [$cr, [2], 'Left ankle instability on uneven ground two weeks after a sprain; apprehensive about returning to basketball.'],
                    'range_of_motion' => [$om, [3], 'Dorsiflexion: left 12°, right 16°.'],
                    'strength_and_palpation' => [$ps, [3], 'Swelling reduced.'],
                    'special_tests' => [$om, [4], 'Anterior drawer negative. Single-leg balance: left 15 s, right 40 s.'],
                    'clinical_assessment' => [$ai, [2, 4], 'Subacute left lateral ankle sprain with reduced proprioception.'],
                    'treatment_administered' => [$ps, [5], 'Balance training on foam; resistance band peroneal strengthening.'],
                    'home_exercise_program' => [$ps, [6], 'Single-leg balance 2x daily; band exercises daily. Hopping drills next session.'],
                ],
            ],
        ];

        $totalRecordedMs = 0;
        $templatesByDiscipline = [];

        foreach ($scribeSessionsData as $sIdx => $sData) {
            $client = $clients[$sData['client_idx']];
            $p = $practitioners[$sData['practitioner_idx']];
            $durationMs = $sData['mins'] * 60 * 1000;
            $totalRecordedMs += $durationMs;
            $sessionDate = now()->subDays($sIdx + 1);
            $isTranslated = $sData['lang'] !== 'en';
            $fillName = fn (string $line) => str_replace('{client}', $client->first_name, $line);

            // The discipline's active template, snapshotted exactly as a real draft records it.
            if (! isset($templatesByDiscipline[$p['profession']])) {
                ClinicalNoteTemplate::ensureDefaultsForTenant($tenant->id, [$p['profession']]);
                $templatesByDiscipline[$p['profession']] = ClinicalNoteTemplate::where('tenant_id', $tenant->id)
                    ->where('discipline', $p['profession'])
                    ->where('is_active', true)
                    ->firstOrFail();
            }
            $template = $templatesByDiscipline[$p['profession']];
            $draftedAt = $sessionDate->copy()->setTime(10, $sData['mins'] + 2);

            $session = ScribeSession::create([
                'tenant_id' => $tenant->id,
                'client_id' => $client->id,
                'staff_membership_id' => $p['membership']->id,
                'created_by_user_id' => $p['user']->id,
                'discipline' => $p['profession'],
                'discipline_label' => $p['profile']->professionLabel(),
                'language' => $sData['lang'],
                'note_output_language' => 'en',
                'status' => ScribeSession::STATUS_DRAFT_READY,
                'transcription_provider' => 'assemblyai',
                'provider_model' => 'nano-medical',
                'recorded_ms' => $durationMs,
                'started_at' => $sessionDate->copy()->setTime(10, 0),
                'stopped_at' => $sessionDate->copy()->setTime(10, $sData['mins']),
                'transcript_ready_at' => $sessionDate->copy()->setTime(10, $sData['mins'] + 1),
                'draft_status' => ScribeSession::DRAFT_READY,
                'draft_version' => 1,
                'draft_generated_at' => $draftedAt,
                'is_translated' => $isTranslated,
                'translated_at' => $isTranslated ? $draftedAt : null,
                'created_at' => $sessionDate,
                'updated_at' => $sessionDate,
            ]);

            $session->forceFill([
                'clinical_note_template_id' => $template->id,
                'draft_template_snapshot' => [
                    'name' => $template->name,
                    'version' => $template->version,
                    'discipline' => $template->discipline,
                    'schema' => $template->schema,
                ],
            ])->save();

            // Audio chunk representation
            $chunk = ScribeAudioChunk::create([
                'tenant_id' => $tenant->id,
                'scribe_session_id' => $session->id,
                'sequence' => 1,
                'storage_path' => 'demo/audio/session_'.$session->id.'.webm',
                'duration_ms' => $durationMs,
                'byte_size' => 450000,
                'mime_type' => 'audio/webm',
                'status' => 'transcribed',
                'transcribed_at' => $sessionDate,
                'created_at' => $sessionDate,
            ]);

            // Transcript segments (Mandarin lines carry their own English translation)
            $segmentIds = [];
            $segmentStartMs = 0;
            $segDur = (int) ($durationMs / count($sData['dialogue']));
            foreach ($sData['dialogue'] as $segIdx => $line) {
                [$role, $text] = $line;
                $sequence = $segIdx + 1;
                $segment = ScribeTranscriptSegment::create([
                    'tenant_id' => $tenant->id,
                    'scribe_session_id' => $session->id,
                    'scribe_audio_chunk_id' => $chunk->id,
                    'sequence' => $sequence,
                    'text' => $fillName($text),
                    'translated_text' => $isTranslated ? $fillName($line[2]) : null,
                    'start_ms' => $segmentStartMs,
                    'end_ms' => $segmentStartMs + $segDur,
                    'source' => ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION,
                    'speaker_role' => $role,
                    'provider' => 'assemblyai',
                    'language' => $sData['lang'],
                    'detected_language' => $sData['lang'],
                    'translation_status' => $isTranslated ? 'completed' : null,
                    'created_at' => $sessionDate,
                ]);
                $segmentIds[$sequence] = $segment->id;
                $segmentStartMs += $segDur;
            }

            // Draft items, one per template field, each citing the transcript lines it came from
            $pos = 1;
            foreach ($sData['draft'] as $fieldId => [$provenance, $sequences, $text]) {
                ScribeDraftItem::create([
                    'tenant_id' => $tenant->id,
                    'scribe_session_id' => $session->id,
                    'draft_version' => 1,
                    'section_key' => $fieldId,
                    'provenance' => $provenance,
                    'content' => $text,
                    'evidence' => array_map(fn (int $seq) => ['sequence' => $seq, 'segment_id' => $segmentIds[$seq]], $sequences),
                    'generator' => ['model' => 'anthropic/claude-haiku-4.5', 'provider' => 'openrouter'],
                    'review_status' => ScribeDraftItem::REVIEW_PROPOSED,
                    'position' => $pos++,
                    'created_at' => $sessionDate,
                ]);
            }
        }

        // Record usage ledger for the current month so Scribe gauge shows partial usage
        // Signature plan has 600 min allowance. ~185 mins used => ~31% gauge!
        $tz = 'America/Toronto';
        $nowTz = Carbon::now($tz);
        $periodStart = $nowTz->copy()->startOfMonth()->toDateString();
        $periodEnd = $nowTz->copy()->endOfMonth()->toDateString();

        foreach ($practitioners as $p) {
            ScribeUsageLedger::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'staff_membership_id' => $p['membership']->id,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                ],
                [
                    'recorded_ms' => (int) round(($totalRecordedMs / count($practitioners))),
                    'session_count' => 2,
                ]
            );
        }

        $usedMinutes = round($totalRecordedMs / 60000, 1);
        $this->info("Recorded {$usedMinutes} minutes in ScribeUsageLedger (Scribe gauge reflects ~{$usedMinutes} / 600 min allowance).");

        // 19. PLATFORM ADMIN: 5 OTHER DEMO CLINICS (Approved, Pending Review, Rejected-can-reapply)
        $this->info('Seeding 5 other diverse demo clinics for Platform Admin dashboards & inspector...');

        $otherClinics = [
            [
                'name' => 'Elevate Physiotherapy & Sports Rehab',
                'subdomain' => 'elevate-physio',
                'slug' => 'elevate-physio',
                'status' => Tenant::STATUS_APPROVED,
                'plan' => $professionalPlan,
                'plan_tier' => 'professional',
                'billing_interval' => 'month',
                'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
                'contact_name' => 'Dr. Tyler Brooks',
                'contact_email' => 'tbrooks@example.com',
                'contact_phone' => '+1 (416) 555-0181',
                'disciplines' => ['physiotherapy'],
                'submitted_at' => now()->subMonths(4),
                'reviewed_at' => now()->subMonths(4),
                'reapply_count' => 1,
            ],
            [
                'name' => 'Harmony Holistic Health Clinic',
                'subdomain' => 'harmony-holistic',
                'slug' => 'harmony-holistic',
                'status' => Tenant::STATUS_APPROVED,
                'plan' => $essentialPlan,
                'plan_tier' => 'essential',
                'billing_interval' => 'year',
                'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
                'contact_name' => 'Mei-Ling Zhou, RAc',
                'contact_email' => 'meiling@example.com',
                'contact_phone' => '+1 (416) 555-0182',
                'disciplines' => ['acupuncture_tcm'],
                'submitted_at' => now()->subMonths(3),
                'reviewed_at' => now()->subMonths(3),
                'reapply_count' => 1,
            ],
            [
                'name' => 'Vitality Spine & Wellness Studio',
                'subdomain' => 'vitality-spine',
                'slug' => 'vitality-spine',
                'status' => Tenant::STATUS_PENDING_REVIEW,
                'plan' => $professionalPlan,
                'plan_tier' => 'professional',
                'billing_interval' => 'month',
                'subscription_status' => Tenant::SUBSCRIPTION_NONE,
                'contact_name' => 'Dr. Anthony Costa, DC',
                'contact_email' => 'anthony.costa@example.com',
                'contact_phone' => '+1 (416) 555-0183',
                'disciplines' => ['chiropractor', 'massage_therapy'],
                'submitted_at' => now()->subDays(3),
                'reviewed_at' => null,
                'reapply_count' => 1,
            ],
            [
                'name' => 'Apex Integrated Therapy Centre',
                'subdomain' => 'apex-therapy',
                'slug' => 'apex-therapy',
                'status' => Tenant::STATUS_PENDING_REVIEW,
                'plan' => $signaturePlan,
                'plan_tier' => 'signature',
                'billing_interval' => 'month',
                'subscription_status' => Tenant::SUBSCRIPTION_NONE,
                'contact_name' => 'Kavita Patel, PT',
                'contact_email' => 'kavita@example.com',
                'contact_phone' => '+1 (416) 555-0184',
                'disciplines' => ['physiotherapy', 'acupuncture_tcm', 'nutrition'],
                'submitted_at' => now()->subDay(),
                'reviewed_at' => null,
                'reapply_count' => 1,
            ],
            [
                'name' => 'Serenity Wellness Lounge',
                'subdomain' => 'serenity-wellness',
                'slug' => 'serenity-wellness',
                'status' => Tenant::STATUS_REJECTED,
                'plan' => $essentialPlan,
                'plan_tier' => 'essential',
                'billing_interval' => 'month',
                'subscription_status' => Tenant::SUBSCRIPTION_NONE,
                'contact_name' => 'Samantha Reed',
                'contact_email' => 'samantha.reed@example.com',
                'contact_phone' => '+1 (416) 555-0185',
                'disciplines' => ['massage_therapy'],
                'submitted_at' => now()->subDays(6),
                'reviewed_at' => now()->subDays(5),
                'review_note' => 'Please provide an updated Certificate of Professional Liability Insurance with commercial general liability coverage.',
                'reapply_count' => 1,
                'is_permanently_rejected' => false,
                'rejected_at' => now()->subDays(5),
            ],
        ];

        foreach ($otherClinics as $oc) {
            $otherTenant = Tenant::withoutGlobalScopes()->where('slug', $oc['slug'])->first();

            $ocData = [
                'name' => $oc['name'],
                'subdomain' => $oc['subdomain'],
                'slug' => $oc['slug'],
                'status' => $oc['status'],
                'plan_tier' => $oc['plan_tier'],
                'plan_id' => $oc['plan']->id,
                'billing_interval' => $oc['billing_interval'],
                'subscription_status' => $oc['subscription_status'],
                'currency' => 'CAD',
                'timezone' => 'America/Toronto',
                'email' => $oc['contact_email'],
                'phone' => $oc['contact_phone'],
                'primary_contact_name' => $oc['contact_name'],
                'primary_contact_email' => $oc['contact_email'],
                'primary_contact_phone' => $oc['contact_phone'],
                'requested_disciplines' => $oc['disciplines'],
                'submitted_at' => $oc['submitted_at'],
                'reviewed_at' => $oc['reviewed_at'],
                'review_note' => $oc['review_note'] ?? null,
                'reapply_count' => $oc['reapply_count'],
                'is_permanently_rejected' => $oc['is_permanently_rejected'] ?? false,
                'rejected_at' => $oc['rejected_at'] ?? null,
                'onboarding_completed_at' => $oc['status'] === Tenant::STATUS_APPROVED ? $oc['submitted_at'] : null,
                'address' => [
                    'line1' => '200 Bay St, Suite 1200',
                    'city' => 'Toronto',
                    'region' => 'ON',
                    'postal_code' => 'M5J 2J2',
                    'country' => 'CA',
                ],
            ];

            if (! $otherTenant) {
                $otherTenant = Tenant::create($ocData);
            } else {
                $otherTenant->update($ocData);
            }

            // Create owner user for each clinic
            $otherOwner = User::firstOrCreate(['email' => $oc['contact_email']], [
                'name' => $oc['contact_name'],
                'password' => $demoPasswordHash,
                'email_verified_at' => now(),
            ]);
            $otherOwner->update(['password' => $demoPasswordHash]);
            if (! $otherOwner->hasRole('Clinic Owner')) {
                $otherOwner->assignRole('Clinic Owner');
            }

            StaffMembership::firstOrCreate([
                'tenant_id' => $otherTenant->id,
                'user_id' => $otherOwner->id,
            ], [
                'role' => StaffMembership::ROLE_CLINIC_OWNER,
                'status' => StaffMembership::STATUS_ACTIVE,
                'joined_at' => $oc['submitted_at'],
            ]);
        }

        // 20. Print Output Summary Table & Login Details
        $this->newLine();
        $this->info('================================================================');
        $this->info('  DEMO DATASET SEEDING COMPLETE FOR "ASTROGEN WELLNESS CENTRE"  ');
        $this->info('================================================================');

        $summaryTable = [
            ['Clinics / Tenants', Tenant::count()],
            ['Total Users', User::count()],
            ['Staff Memberships (Astrogenapp)', StaffMembership::where('tenant_id', $tenant->id)->count()],
            ['Practitioners (5 Disciplines)', count($practitioners)],
            ['Locations & Rooms', Location::where('tenant_id', $tenant->id)->count().' Locations / '.Room::where('tenant_id', $tenant->id)->count().' Rooms'],
            ['Total Clients', Client::where('tenant_id', $tenant->id)->count().' (~'.Client::where('tenant_id', $tenant->id)->where('is_active', true)->count().' active)'],
            ['Appointments', Appointment::where('tenant_id', $tenant->id)->count().' (Completed: '.Appointment::where('tenant_id', $tenant->id)->where('status', Appointment::STATUS_COMPLETED)->count().')'],
            ['Patient Invoices', Invoice::where('tenant_id', $tenant->id)->count().' (Paid: '.Invoice::where('tenant_id', $tenant->id)->where('status', Invoice::STATUS_PAID)->count().', Collection: '.$collectionEfficiency.'%)'],
            ['Gross Payments Recorded', '$'.number_format(Payment::where('tenant_id', $tenant->id)->where('status', Payment::STATUS_SUCCEEDED)->sum('amount') / 100, 2).' CAD'],
            ['Client Consents', Consent::where('tenant_id', $tenant->id)->count()],
            ['Client Intakes (Completed & Flagged)', ClientIntake::where('tenant_id', $tenant->id)->count().' (4 Flagged)'],
            ['Clinical SOAP Notes', ClinicalNote::where('tenant_id', $tenant->id)->count().' ('.$draftsTarget.' Drafts, '.$addendaTarget.' Addended)'],
            ['AI Scribe Sessions', ScribeSession::where('tenant_id', $tenant->id)->count().' (7 English, 2 Mandarin)'],
            ['Scribe Recorded Usage', $usedMinutes.' min / 600 min allowance'],
            ['Admin Clinics Queue', Tenant::count().' Total (Approved, Pending Review, Rejected-Can-Reapply)'],
        ];

        $this->table(['Metric / Entity', 'Count / Value'], $summaryTable);

        $this->newLine();
        $this->info('================================================================');
        $this->info('  DEMO CREDENTIALS & LOGIN URLS (Password: '.$demoPasswordPlain.')  ');
        $this->info('================================================================');

        $credentialsTable = [
            ['Platform Admin', 'admin@umahz.com', 'http://lvh.me:8000/admin/dashboard', 'Superadmin control, clinics review, billing inspector'],
            ['Clinic Owner', 'astrogenapp@gmail.com', 'http://astrogenapp.lvh.me:8000/app/dashboard', 'Astrogen Wellness Centre owner dashboard & analytics'],
            ['Practitioner (Acupuncture)', 'practitioner@astrogenapp.com', 'http://astrogenapp.lvh.me:8000/app/dashboard', 'Dr. Julian Hayes - Calendar, notes, AI Scribe'],
            ['Receptionist', 'receptionist@astrogenapp.com', 'http://astrogenapp.lvh.me:8000/app/dashboard', 'Maya Torres - Check-in queue, booking, billing'],
        ];

        $this->table(['Role', 'Email', 'Login URL', 'Notes'], $credentialsTable);

        return Command::SUCCESS;
    }
}
