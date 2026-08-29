<?php

namespace App\Models;

use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IntakeFormTemplate extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const DISCIPLINE_MASSAGE_THERAPY = PractitionerProfile::PROFESSION_MASSAGE_THERAPY;
    public const DISCIPLINE_ACUPUNCTURE_TCM = PractitionerProfile::PROFESSION_ACUPUNCTURE_TCM;
    public const DISCIPLINE_PERSONAL_TRAINING = PractitionerProfile::PROFESSION_PERSONAL_TRAINING;
    public const DISCIPLINE_NUTRITION = PractitionerProfile::PROFESSION_NUTRITION;
    public const DISCIPLINE_COLON_HYDROTHERAPY = PractitionerProfile::PROFESSION_COLON_HYDROTHERAPY;

    public const APPLIES_TO_ALL = 'all';
    public const APPLIES_TO_FEMALE = 'female_only';
    public const APPLIES_TO_MALE = 'male_only';
    public const APPLIES_TO_OPTIONS = [
        self::APPLIES_TO_ALL,
        self::APPLIES_TO_FEMALE,
        self::APPLIES_TO_MALE,
    ];

    protected $fillable = [
        'tenant_id',
        'discipline',
        'name',
        'description',
        'schema',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'schema' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function clientIntakes(): HasMany
    {
        return $this->hasMany(ClientIntake::class);
    }

    /**
     * Seed baseline generic starter templates for a clinic based on the disciplines it offers.
     */
    public static function ensureDefaultsForTenant(string $tenantId, ?array $disciplines = null): void
    {
        $tenant = Tenant::find($tenantId);
        $offered = $disciplines ?? $tenant?->requested_disciplines ?? ClinicRegistrationController::DISCIPLINES;

        foreach ($offered as $disc) {
            $templateData = self::starterTemplateFor($disc);
            if (! $templateData) {
                continue;
            }

            static::firstOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'discipline' => $disc,
                ],
                [
                    'name' => $templateData['name'],
                    'description' => $templateData['description'],
                    'schema' => $templateData['schema'],
                    'is_active' => true,
                ]
            );
        }
    }

    /**
     * Starter question schemas for each discipline (clearly labeled as editable placeholders).
     */
    public static function starterTemplateFor(string $discipline): ?array
    {
        $disclaimer = 'Notice to Clinic: This is a starter questionnaire provided as a template placeholder. The clinic and its registered practitioners are solely responsible for reviewing, customizing, and ensuring all questions meet your jurisdictional regulatory and clinical standards before use.';

        return match ($discipline) {
            self::DISCIPLINE_MASSAGE_THERAPY => [
                'name' => 'Massage Therapy Health History & Intake',
                'description' => 'Musculoskeletal assessment, chief complaint, pressure preference, and clinical contraindication screening.',
                'schema' => [
                    'disclaimer' => $disclaimer,
                    'sections' => [
                        [
                            'title' => 'Chief Complaint & Symptoms',
                            'fields' => [
                                [
                                    'id' => 'chief_complaint',
                                    'label' => 'Primary reason for visit / Areas of pain or tension',
                                    'type' => 'textarea',
                                    'required' => true,
                                    'placeholder' => 'Describe where you are feeling tension, pain, or limited mobility...',
                                ],
                                [
                                    'id' => 'pain_severity',
                                    'label' => 'Current Pain / Discomfort Severity (1-10)',
                                    'type' => 'select',
                                    'required' => true,
                                    'options' => ['1-3 (Mild)', '4-6 (Moderate)', '7-8 (Severe)', '9-10 (Extremely Severe)'],
                                ],
                                [
                                    'id' => 'pressure_preference',
                                    'label' => 'Massage Pressure Preference',
                                    'type' => 'select',
                                    'required' => true,
                                    'options' => ['Light Pressure', 'Medium Pressure', 'Firm / Deep Tissue', 'Variable by Area'],
                                ],
                            ],
                        ],
                        [
                            'title' => 'Medical History & Surgeries',
                            'fields' => [
                                [
                                    'id' => 'medical_conditions',
                                    'label' => 'List any major medical conditions, recent injuries, or surgeries',
                                    'type' => 'textarea',
                                    'required' => false,
                                    'placeholder' => 'e.g. Recent fractures, joint replacements, disc herniations...',
                                ],
                                [
                                    'id' => 'current_medications',
                                    'label' => 'Current Medications or Supplements',
                                    'type' => 'textarea',
                                    'required' => false,
                                    'placeholder' => 'e.g. Blood thinners, painkillers, muscle relaxants...',
                                ],
                            ],
                        ],
                        [
                            'title' => 'Safety & Contraindication Screening',
                            'fields' => [
                                [
                                    'id' => 'has_blood_clots',
                                    'label' => 'Do you have a history of blood clots, deep vein thrombosis (DVT), or pulmonary embolism?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Blood Clot / DVT history reported. Direct deep massage may be contraindicated in affected extremities.',
                                ],
                                [
                                    'id' => 'is_pregnant',
                                    'label' => 'Are you currently pregnant?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'applies_to' => self::APPLIES_TO_FEMALE,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Pregnancy indicated. Requires specialized prenatal positioning, pillowing, and avoidance of contraindicated acupressure points.',
                                ],
                                [
                                    'id' => 'contagious_skin_condition',
                                    'label' => 'Do you currently have an open wound, active rash, or contagious skin infection?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Active skin condition reported. Practitioner must inspect area and avoid direct contact.',
                                ],
                                [
                                    'id' => 'uncontrolled_blood_pressure',
                                    'label' => 'Do you have uncontrolled high blood pressure (hypertension)?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Uncontrolled hypertension. Circulatory-intensive techniques must be adjusted.',
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            self::DISCIPLINE_ACUPUNCTURE_TCM => [
                'name' => 'Acupuncture & TCM Health History & Intake',
                'description' => 'Traditional Chinese Medicine assessment, organ systems review, and safety screening.',
                'schema' => [
                    'disclaimer' => $disclaimer,
                    'sections' => [
                        [
                            'title' => 'Chief Health Concerns',
                            'fields' => [
                                [
                                    'id' => 'chief_complaint',
                                    'label' => 'Primary health condition or symptoms you want to address',
                                    'type' => 'textarea',
                                    'required' => true,
                                    'placeholder' => 'e.g. Chronic migraines, lower back pain, anxiety, digestive issues...',
                                ],
                                [
                                    'id' => 'symptom_duration',
                                    'label' => 'How long have you experienced these symptoms?',
                                    'type' => 'text',
                                    'required' => false,
                                    'placeholder' => 'e.g. 3 weeks, 6 months, 2 years...',
                                ],
                            ],
                        ],
                        [
                            'title' => 'Systemic & Constitutional Health',
                            'fields' => [
                                [
                                    'id' => 'temperature_tendency',
                                    'label' => 'Do you generally tend to feel:',
                                    'type' => 'select',
                                    'required' => true,
                                    'options' => ['Comfortable / Normal', 'Always Cold / Cold extremities', 'Always Warm / Hot flashes / Night sweats', 'Fluctuating'],
                                ],
                                [
                                    'id' => 'sleep_pattern',
                                    'label' => 'How would you describe your sleep?',
                                    'type' => 'select',
                                    'required' => true,
                                    'options' => ['Good & Restful', 'Difficulty falling asleep', 'Wake up frequently during the night', 'Vivid / Restless dreams'],
                                ],
                            ],
                        ],
                        [
                            'title' => 'Acupuncture Safety & Contraindication Screening',
                            'fields' => [
                                [
                                    'id' => 'has_pacemaker',
                                    'label' => 'Do you have a cardiac pacemaker or other implanted electrical device?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Cardiac pacemaker reported. Electro-acupuncture is strictly contraindicated.',
                                ],
                                [
                                    'id' => 'bleeding_disorder_or_anticoagulants',
                                    'label' => 'Do you have a bleeding disorder (e.g. hemophilia) or take blood-thinning medications (e.g. Warfarin, Eliquis)?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Bleeding disorder or anticoagulant therapy reported. Requires extra hemostasis precautions and fine gauge needles.',
                                ],
                                [
                                    'id' => 'is_pregnant_tcm',
                                    'label' => 'Are you currently pregnant or suspect you might be?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'applies_to' => self::APPLIES_TO_FEMALE,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Pregnancy indicated. Strictly avoid points that induce uterine contractions (e.g. LI4, SP6, BL60, BL67, lower abdomen/sacrum).',
                                ],
                                [
                                    'id' => 'history_of_fainting',
                                    'label' => 'Have you ever experienced fainting, lightheadedness, or needle shock during acupuncture or injections?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'History of vasovagal response / needle dizziness. Client must receive treatment in supine or comfortable reclining position.',
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            self::DISCIPLINE_PERSONAL_TRAINING => [
                'name' => 'Fitness Assessment & PAR-Q+ Readiness Intake',
                'description' => 'Physical activity readiness, cardiovascular screening, musculoskeletal injuries, and fitness goals.',
                'schema' => [
                    'disclaimer' => $disclaimer,
                    'sections' => [
                        [
                            'title' => 'Fitness Goals & Lifestyle',
                            'fields' => [
                                [
                                    'id' => 'primary_fitness_goals',
                                    'label' => 'What are your primary training objectives?',
                                    'type' => 'textarea',
                                    'required' => true,
                                    'placeholder' => 'e.g. Strength building, weight loss, marathon prep, mobility recovery...',
                                ],
                                [
                                    'id' => 'activity_level',
                                    'label' => 'Current Exercise Frequency',
                                    'type' => 'select',
                                    'required' => true,
                                    'options' => ['Sedentary (0 days/week)', 'Light (1-2 days/week)', 'Moderate (3-4 days/week)', 'Very Active (5+ days/week)'],
                                ],
                            ],
                        ],
                        [
                            'title' => 'PAR-Q+ Physical Activity Readiness Screening',
                            'fields' => [
                                [
                                    'id' => 'heart_condition',
                                    'label' => 'Has your doctor ever told you that you have a heart condition or high blood pressure?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Heart condition reported. Medical clearance from physician recommended before high-intensity training.',
                                ],
                                [
                                    'id' => 'chest_pain_during_exercise',
                                    'label' => 'Do you feel pain or pressure in your chest when performing physical activity?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Chest pain during exertion reported. Immediate physician consultation required prior to exercise testing.',
                                ],
                                [
                                    'id' => 'dizziness_or_loss_of_consciousness',
                                    'label' => 'Do you ever lose balance because of dizziness or lose consciousness during or after exercise?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Dizziness / syncope reported during exertion. Exercise intensity must be strictly moderated.',
                                ],
                                [
                                    'id' => 'bone_or_joint_problem',
                                    'label' => 'Do you have a bone, joint, or spinal problem that could be aggravated by physical activity?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Musculoskeletal joint/spinal issue indicated. Movement screening and load modification necessary.',
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            self::DISCIPLINE_NUTRITION => [
                'name' => 'Nutritional Health & Dietary Intake',
                'description' => 'Dietary patterns, allergies, lifestyle factors, and metabolic considerations.',
                'schema' => [
                    'disclaimer' => $disclaimer,
                    'sections' => [
                        [
                            'title' => 'Nutritional Goals & Current Diet',
                            'fields' => [
                                [
                                    'id' => 'nutrition_goals',
                                    'label' => 'What are your primary nutrition goals?',
                                    'type' => 'textarea',
                                    'required' => true,
                                    'placeholder' => 'e.g. Blood sugar management, weight management, digestion improvement, athletic performance...',
                                ],
                                [
                                    'id' => 'water_intake',
                                    'label' => 'Approximate Daily Water Intake',
                                    'type' => 'select',
                                    'required' => true,
                                    'options' => ['Less than 1 Liter', '1 to 2 Liters', '2 to 3 Liters', 'More than 3 Liters'],
                                ],
                            ],
                        ],
                        [
                            'title' => 'Allergies & Clinical Screening',
                            'fields' => [
                                [
                                    'id' => 'food_allergies_text',
                                    'label' => 'List any diagnosed food allergies or severe intolerances',
                                    'type' => 'textarea',
                                    'required' => false,
                                    'placeholder' => 'e.g. Peanuts, tree nuts, shellfish, dairy, gluten...',
                                ],
                                [
                                    'id' => 'anaphylaxis_risk',
                                    'label' => 'Do you carry an epinephrine auto-injector (EpiPen) for severe anaphylactic allergies?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Anaphylactic allergy risk. Strict allergen elimination protocols must be observed in all dietary plans.',
                                ],
                                [
                                    'id' => 'eating_disorder_history',
                                    'label' => 'Do you have a current or past history of a diagnosed eating disorder?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Eating disorder history indicated. Avoid restrictive meal plans or calorie-counting without psychological co-management.',
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            self::DISCIPLINE_COLON_HYDROTHERAPY => [
                'name' => 'Colon Hydrotherapy Health History & Intake',
                'description' => 'Digestive history, gastrointestinal assessment, and strict contraindication screening.',
                'schema' => [
                    'disclaimer' => $disclaimer,
                    'sections' => [
                        [
                            'title' => 'Digestive & Elimination History',
                            'fields' => [
                                [
                                    'id' => 'digestive_goals',
                                    'label' => 'Reason for seeking colon hydrotherapy',
                                    'type' => 'textarea',
                                    'required' => true,
                                    'placeholder' => 'e.g. Chronic constipation, detoxification, sluggish bowel...',
                                ],
                                [
                                    'id' => 'bowel_movement_frequency',
                                    'label' => 'Usual Bowel Movement Frequency',
                                    'type' => 'select',
                                    'required' => true,
                                    'options' => ['Multiple times daily', 'Once daily', 'Every 2 to 3 days', 'Less than twice weekly'],
                                ],
                            ],
                        ],
                        [
                            'title' => 'Mandatory Clinical Contraindications',
                            'fields' => [
                                [
                                    'id' => 'ibd_or_diverticulitis',
                                    'label' => 'Do you have Crohn\'s disease, Ulcerative Colitis, or active Diverticulitis?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'ABSOLUTE CONTRAINDICATION: Active IBD (Crohn\'s, Ulcerative Colitis, or Diverticulitis) precludes colon hydrotherapy.',
                                ],
                                [
                                    'id' => 'recent_colon_rectal_surgery',
                                    'label' => 'Have you had abdominal, colon, or rectal surgery within the past 6 months?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'ABSOLUTE CONTRAINDICATION: Colon hydrotherapy is strictly contraindicated within 6 months of abdominal or bowel surgery.',
                                ],
                                [
                                    'id' => 'severe_cardiac_or_aneurysm',
                                    'label' => 'Do you have severe congestive heart failure, severe hypertension, or a diagnosed aneurysm?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'ABSOLUTE CONTRAINDICATION: Severe cardiac disease, uncontrolled hypertension, or aneurysm.',
                                ],
                                [
                                    'id' => 'rectal_bleeding_or_fissures',
                                    'label' => 'Do you currently have active rectal bleeding, severe painful hemorrhoids, or anal fissures?',
                                    'type' => 'radio',
                                    'options' => ['no', 'yes'],
                                    'required' => true,
                                    'is_contraindication' => true,
                                    'flag_trigger' => 'yes',
                                    'flag_warning' => 'Active rectal bleeding or severe fissures. Requires physician clearance and symptom resolution prior to treatment.',
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            default => null,
        };
    }

    /**
     * Conditionally filter schema questions based on client's explicitly set sex.
     * Fails open (shows all questions) if sex is unset, unspecified, or non-binary.
     */
    public static function filterSchemaForSex(?array $schema, ?string $sex): array
    {
        if (! $schema || empty($schema['sections'])) {
            return $schema ?? [];
        }

        // If sex is not strictly male or female, fail open (show all questions for safety)
        if ($sex !== Client::SEX_FEMALE && $sex !== Client::SEX_MALE) {
            return $schema;
        }

        $filteredSections = [];
        foreach ($schema['sections'] as $section) {
            $filteredFields = [];
            foreach ($section['fields'] ?? [] as $field) {
                $appliesTo = $field['applies_to'] ?? self::APPLIES_TO_ALL;

                if ($sex === Client::SEX_MALE && $appliesTo === self::APPLIES_TO_FEMALE) {
                    continue; // Skip female-only questions for male patients
                }

                if ($sex === Client::SEX_FEMALE && $appliesTo === self::APPLIES_TO_MALE) {
                    continue; // Skip male-only questions for female patients
                }

                $filteredFields[] = $field;
            }

            if (! empty($filteredFields)) {
                $section['fields'] = $filteredFields;
                $filteredSections[] = $section;
            }
        }

        $schema['sections'] = $filteredSections;

        return $schema;
    }
}
