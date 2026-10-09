<?php

namespace Database\Seeders;

use App\Models\AddOn;
use App\Models\Feature;
use App\Models\Plan;
use App\Models\PlanPrice;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SubscriptionPlansSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Seed All 20 Platform Features
        $features = [
            // Standard / Base features
            'online_booking' => ['name' => 'Online Booking', 'category' => 'operations', 'description' => 'Client online booking and self-scheduling'],
            'client_management' => ['name' => 'Client Management', 'category' => 'clinical', 'description' => 'Unified client charts and records'],
            'intake_custom_forms' => ['name' => 'Intake & Custom Forms', 'category' => 'clinical', 'description' => 'Customizable intake forms and questionnaires'],
            'consent_signatures' => ['name' => 'Consent & Signatures', 'category' => 'clinical', 'description' => 'Digital consent signing and audit trail'],
            'clinical_notes' => ['name' => 'Clinical Notes', 'category' => 'clinical', 'description' => 'SOAP and clinical note charting'],
            'billing_invoices' => ['name' => 'Billing & Invoices', 'category' => 'billing', 'description' => 'Patient invoicing and receipt generation'],
            'basic_reporting' => ['name' => 'Basic Reporting', 'category' => 'operations', 'description' => 'Standard appointment and patient reports'],
            'client_portal' => ['name' => 'Client Portal', 'category' => 'operations', 'description' => 'Self-service client portal for appointments and documents'],
            'website_builder' => ['name' => 'Visual Drag-and-Drop Page Builder', 'category' => 'marketing', 'description' => 'Visual drag-and-drop clinic website builder'],
            'automation' => ['name' => 'Automation', 'category' => 'operations', 'description' => 'Automated reminders and notifications'],
            'priority_support' => ['name' => 'Priority Support', 'category' => 'support', 'description' => 'Dedicated priority clinical helpdesk'],

            // Professional & Signature only
            'staff_receptionist_management' => ['name' => 'Staff / Receptionist Management', 'category' => 'operations', 'description' => 'Multiple staff and front desk management'],
            'rooms_resources' => ['name' => 'Rooms & Resources', 'category' => 'operations', 'description' => 'Multi-room and equipment resource scheduling'],
            'advanced_scheduling' => ['name' => 'Advanced Scheduling', 'category' => 'operations', 'description' => 'Complex multi-practitioner scheduling rules'],
            'advanced_financial_reporting' => ['name' => 'Advanced / Financial Reporting', 'category' => 'billing', 'description' => 'Detailed financial breakdowns and revenue analytics'],

            // Signature only
            'advanced_roles' => ['name' => 'Advanced Roles', 'category' => 'operations', 'description' => 'Custom granular staff permission roles'],
            'advanced_analytics' => ['name' => 'Advanced Analytics', 'category' => 'marketing', 'description' => 'Clinic retention and patient lifetime value metrics'],
            'enhanced_website' => ['name' => 'Enhanced Website', 'category' => 'marketing', 'description' => 'Custom branding, white-label, and custom domains'],
            'priority_onboarding' => ['name' => 'Priority Onboarding', 'category' => 'support', 'description' => 'Dedicated 1-on-1 clinic setup and onboarding'],
            'data_migration' => ['name' => 'Data Migration Assistance', 'category' => 'support', 'description' => 'White-glove patient and chart data migration'],
        ];

        $featureModels = [];
        foreach ($features as $key => $meta) {
            $featureModels[$key] = Feature::firstOrCreate(
                ['key' => $key],
                [
                    'name' => $meta['name'],
                    'category' => $meta['category'],
                    'description' => $meta['description'],
                    'is_implemented' => true,
                ]
            );
        }

        // 2. Define Plans, Prices & Limits (Seed Values + Placeholders)
        $plansDefinition = [
            'essential' => [
                'name' => 'Essential',
                'tagline' => 'For solo practitioners starting out',
                'description' => 'Everything you need to run your solo practice smoothly.',
                'badge' => 'Solo',
                'display_order' => 1,
                'included_practitioners' => 1,
                'max_practitioners' => 1,
                'allows_extra_practitioners' => false,
                'appointment_limit_monthly' => 50,
                'appointment_limit_behavior' => 'warn',
                'location_limit' => 1,
                'support_level' => 'Standard support',
                'scribe_allowance_unit' => 'minutes',
                'scribe_allowance_amount' => 60, // Placeholder
                'scribe_limit_behavior' => 'warn',
                'needs_review' => true,
                'needs_review_fields' => ['scribe_allowance_amount'],
                'prices' => [
                    'month' => ['base' => 39.00, 'extra' => 0.00, 'needs_review' => false, 'needs_review_fields' => null],
                    'year' => ['base' => 390.00, 'extra' => 0.00, 'needs_review' => false, 'needs_review_fields' => null],
                ],
                'features' => [
                    'online_booking',
                    'client_management',
                    'intake_custom_forms',
                    'consent_signatures',
                    'clinical_notes',
                    'billing_invoices',
                    'basic_reporting',
                    'client_portal',
                    'website_builder',
                ],
                'feature_labels' => [],
            ],

            'professional' => [
                'name' => 'Professional',
                'tagline' => 'For growing clinics with multiple practitioners',
                'description' => 'Unlimited appointments and multi-practitioner team collaboration.',
                'badge' => 'Clinic',
                'display_order' => 2,
                'included_practitioners' => 1,
                'max_practitioners' => null, // Unlimited
                'allows_extra_practitioners' => true,
                'appointment_limit_monthly' => null, // Unlimited
                'appointment_limit_behavior' => 'warn',
                'location_limit' => 3, // Placeholder value 3 per client requirement
                'support_level' => null,
                'scribe_allowance_unit' => 'minutes',
                'scribe_allowance_amount' => 180, // Placeholder
                'scribe_limit_behavior' => 'warn',
                'needs_review' => true,
                'needs_review_fields' => ['location_limit', 'scribe_allowance_amount'],
                'prices' => [
                    'month' => ['base' => 69.00, 'extra' => 35.00, 'needs_review' => false, 'needs_review_fields' => null],
                    'year' => ['base' => 690.00, 'extra' => 350.00, 'needs_review' => false, 'needs_review_fields' => null],
                ],
                'features' => [
                    'online_booking',
                    'client_management',
                    'intake_custom_forms',
                    'consent_signatures',
                    'clinical_notes',
                    'billing_invoices',
                    'basic_reporting',
                    'client_portal',
                    'website_builder',
                    'automation',
                    'priority_support',
                    'staff_receptionist_management',
                    'rooms_resources',
                    'advanced_scheduling',
                    'advanced_financial_reporting',
                ],
                'feature_labels' => [
                    'automation' => 'More automation',
                ],
            ],

            'signature' => [
                'name' => 'Signature',
                'tagline' => 'For high-volume multi-disciplinary practices',
                'description' => 'Advanced roles, priority onboarding, and white-glove migration assistance.',
                'badge' => 'Full Featured',
                'display_order' => 3,
                'included_practitioners' => 3, // 3 practitioners included
                'max_practitioners' => null, // Unlimited
                'allows_extra_practitioners' => true,
                'appointment_limit_monthly' => null, // Unlimited
                'appointment_limit_behavior' => 'warn',
                'location_limit' => null, // Unlimited locations
                'support_level' => null,
                'scribe_allowance_unit' => 'minutes',
                'scribe_allowance_amount' => 600, // Placeholder
                'scribe_limit_behavior' => 'warn',
                'needs_review' => true,
                'needs_review_fields' => ['scribe_allowance_amount'],
                'prices' => [
                    'month' => ['base' => 90.00, 'extra' => 30.00, 'needs_review' => false, 'needs_review_fields' => null],
                    'year' => ['base' => 900.00, 'extra' => 300.00, 'needs_review' => false, 'needs_review_fields' => null],
                ],
                'features' => array_keys($features), // All 20 features enabled
                'feature_labels' => [
                    'automation' => 'Advanced automation',
                ],
            ],
        ];

        foreach ($plansDefinition as $slug => $def) {
            $plan = Plan::where('slug', $slug)->first();
            $isNewPlan = false;

            if (! $plan) {
                $isNewPlan = true;
                $plan = Plan::create([
                    'slug' => $slug,
                    'name' => $def['name'],
                    'tagline' => $def['tagline'],
                    'description' => $def['description'],
                    'badge' => $def['badge'],
                    'is_active' => true,
                    'display_order' => $def['display_order'],
                    'trial_days' => 0,
                    'included_practitioners' => $def['included_practitioners'],
                    'max_practitioners' => $def['max_practitioners'],
                    'allows_extra_practitioners' => $def['allows_extra_practitioners'],
                    'appointment_limit_monthly' => $def['appointment_limit_monthly'],
                    'appointment_limit_behavior' => $def['appointment_limit_behavior'],
                    'location_limit' => $def['location_limit'],
                    'support_level' => $def['support_level'],
                    'scribe_allowance_unit' => $def['scribe_allowance_unit'],
                    'scribe_allowance_amount' => $def['scribe_allowance_amount'],
                    'scribe_limit_behavior' => $def['scribe_limit_behavior'],
                    'needs_review' => $def['needs_review'],
                    'needs_review_fields' => $def['needs_review_fields'],
                ]);
            } else {
                // Ensure support_level and badge are updated on existing plan
                $plan->update([
                    'support_level' => $def['support_level'],
                    'badge' => $def['badge'],
                ]);
            }

            // Prices (Monthly & Annual)
            foreach ($def['prices'] as $interval => $pDef) {
                $existingPrice = PlanPrice::where('plan_id', $plan->id)
                    ->where('interval', $interval)
                    ->where('is_active', true)
                    ->first();

                if (! $existingPrice) {
                    PlanPrice::create([
                        'plan_id' => $plan->id,
                        'interval' => $interval,
                        'currency' => 'CAD',
                        'base_price' => $pDef['base'],
                        'extra_practitioner_price' => $pDef['extra'],
                        'is_active' => true,
                        'needs_review' => $pDef['needs_review'],
                        'needs_review_fields' => $pDef['needs_review_fields'],
                    ]);
                }
            }

            // Sync Plan Features and display_label overrides (only attach features enabled for this plan)
            $syncData = [];
            foreach ($def['features'] as $fKey) {
                if (! isset($featureModels[$fKey])) {
                    continue;
                }
                $label = $def['feature_labels'][$fKey] ?? null;
                $syncData[$featureModels[$fKey]->id] = [
                    'is_enabled' => true,
                    'display_label' => $label,
                ];
            }
            $plan->features()->sync($syncData);
        }

        // 3. Seed Add-on: Scribe+ (only if not exists)
        if (! AddOn::where('slug', 'scribe_plus')->exists()) {
            AddOn::create([
                'slug' => 'scribe_plus',
                'name' => 'Scribe+',
                'description' => 'Unlimited AI Scribe transcription and clinical note generation for your practitioners.',
                'billing_type' => 'per_seat',
                'price_monthly' => 15.00,
                'price_annual' => 150.00, // Annual placeholder
                'config' => [
                    'unlocks' => 'unlimited_scribe',
                    'unit' => 'unlimited',
                ],
                'is_active' => true,
                'needs_review' => true,
                'needs_review_fields' => ['price_annual'],
            ]);
        }

        // 4. Seed Platform Setting: Automatic Tax (default OFF, only if not exists)
        if (! DB::table('platform_settings')->where('key', 'billing.stripe_automatic_tax')->exists()) {
            DB::table('platform_settings')->insert([
                'key' => 'billing.stripe_automatic_tax',
                'value' => json_encode(['enabled' => false]),
                'group' => 'billing',
                'description' => 'Whether Stripe Automatic Tax is enabled for clinic platform subscriptions.',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
