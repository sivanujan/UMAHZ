<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ClinicalNoteTemplate extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const DISCIPLINE_MASSAGE_THERAPY = PractitionerProfile::PROFESSION_MASSAGE_THERAPY;
    public const DISCIPLINE_ACUPUNCTURE_TCM = PractitionerProfile::PROFESSION_ACUPUNCTURE_TCM;
    public const DISCIPLINE_PERSONAL_TRAINING = PractitionerProfile::PROFESSION_PERSONAL_TRAINING;
    public const DISCIPLINE_NUTRITION = PractitionerProfile::PROFESSION_NUTRITION;
    public const DISCIPLINE_COLON_HYDROTHERAPY = PractitionerProfile::PROFESSION_COLON_HYDROTHERAPY;

    protected $fillable = [
        'tenant_id',
        'discipline',
        'name',
        'description',
        'version',
        'schema',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'schema' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function clinicalNotes(): HasMany
    {
        return $this->hasMany(ClinicalNote::class);
    }

    /**
     * Ensure default starter templates exist for all offered disciplines of a tenant.
     * Fixed 5 get clearly-labeled editable starter sections; custom disciplines get an empty template.
     *
     * @param array<int, string> $offeredDisciplines
     */
    public static function ensureDefaultsForTenant(string $tenantId, array $offeredDisciplines): void
    {
        $existingDisciplines = static::where('tenant_id', $tenantId)
            ->pluck('discipline')
            ->all();

        foreach ($offeredDisciplines as $discipline) {
            if (in_array($discipline, $existingDisciplines, true)) {
                continue;
            }

            $defaults = static::starterTemplateForDiscipline($discipline);

            static::create([
                'tenant_id' => $tenantId,
                'discipline' => $discipline,
                'name' => $defaults['name'],
                'description' => $defaults['description'],
                'version' => 1,
                'schema' => $defaults['schema'],
                'is_active' => true,
            ]);
        }
    }

    /**
     * Get starter template schema for a given discipline.
     */
    public static function starterTemplateForDiscipline(string $discipline): array
    {
        return match ($discipline) {
            self::DISCIPLINE_MASSAGE_THERAPY => [
                'name' => 'Massage Therapy Clinical SOAP Note',
                'description' => 'Standard SOAP note template (Subjective, Objective, Assessment, Plan). Editable placeholder for clinic customization.',
                'schema' => [
                    'sections' => [
                        [
                            'id' => 'subjective',
                            'title' => 'Subjective (Client Report)',
                            'description' => 'Current complaints, changes since last visit, pain scale, and goals for today.',
                            'fields' => [
                                [
                                    'id' => 'chief_complaint',
                                    'label' => 'Chief Complaint / Primary Focus',
                                    'type' => 'long_text',
                                    'placeholder' => 'Patient reports pain, stiffness, or functional limitation...',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'pain_level',
                                    'label' => 'Current Pain Scale (0-10)',
                                    'type' => 'select',
                                    'options' => ['0 - None', '1-2 - Mild', '3-5 - Moderate', '6-8 - Severe', '9-10 - Extreme'],
                                    'required' => false,
                                ],
                                [
                                    'id' => 'changes_since_last_visit',
                                    'label' => 'Changes Since Last Visit',
                                    'type' => 'long_text',
                                    'placeholder' => 'Improvements, symptom aggravations, or new activities...',
                                    'required' => false,
                                ],
                            ],
                        ],
                        [
                            'id' => 'objective',
                            'title' => 'Objective (Practitioner Assessment)',
                            'description' => 'Palpation findings, posture, range of motion, and tissue texture.',
                            'fields' => [
                                [
                                    'id' => 'palpation_findings',
                                    'label' => 'Palpation & Tissue Findings',
                                    'type' => 'long_text',
                                    'placeholder' => 'Hypertonicity, trigger points, adhesions observed in...',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'rom_posture',
                                    'label' => 'Range of Motion & Posture Observations',
                                    'type' => 'long_text',
                                    'placeholder' => 'Cervical / lumbar ROM, posture deviations...',
                                    'required' => false,
                                ],
                            ],
                        ],
                        [
                            'id' => 'assessment',
                            'title' => 'Assessment & Treatment Provided',
                            'description' => 'Modalities used, areas treated, client tolerance, and immediate response.',
                            'fields' => [
                                [
                                    'id' => 'treatment_modalities',
                                    'label' => 'Treatment Modalities & Areas Treated',
                                    'type' => 'long_text',
                                    'placeholder' => 'Deep tissue, trigger point therapy, myofascial release applied to...',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'client_tolerance',
                                    'label' => 'Client Tolerance & Response',
                                    'type' => 'select',
                                    'options' => ['Tolerated Well', 'Tolerated with Moderate Discomfort', 'Required Modification', 'Sensitive / Reduced Pressure'],
                                    'required' => true,
                                ],
                            ],
                        ],
                        [
                            'id' => 'plan',
                            'title' => 'Plan & Recommendations',
                            'description' => 'Recommended follow-up frequency, home care, and self-management.',
                            'fields' => [
                                [
                                    'id' => 'home_care',
                                    'label' => 'Home Care & Exercises Given',
                                    'type' => 'long_text',
                                    'placeholder' => 'Hydration, stretching, heat/ice protocol recommended...',
                                    'required' => false,
                                ],
                                [
                                    'id' => 'recommended_frequency',
                                    'label' => 'Recommended Return / Frequency',
                                    'type' => 'select',
                                    'options' => ['1 week', '2 weeks', '3-4 weeks', '6 weeks', 'As needed (PRN)'],
                                    'required' => true,
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            self::DISCIPLINE_ACUPUNCTURE_TCM => [
                'name' => 'Acupuncture & TCM Clinical Encounter Record',
                'description' => 'TCM assessment, tongue, pulse, pattern differentiation, points, and modalities. Editable placeholder.',
                'schema' => [
                    'sections' => [
                        [
                            'id' => 'tcm_subjective',
                            'title' => 'Chief Complaint & Symptoms',
                            'description' => 'Main concern, onset, duration, emotional/energy state, sleep and digestion.',
                            'fields' => [
                                [
                                    'id' => 'chief_complaint',
                                    'label' => 'Primary Complaint & History of Present Illness',
                                    'type' => 'long_text',
                                    'placeholder' => 'Describe onset, location, nature of pain or imbalance...',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'systemic_symptoms',
                                    'label' => 'Systemic Signs (Sleep, Energy, Digestion, Temperature)',
                                    'type' => 'long_text',
                                    'placeholder' => 'Appetite, bowel movements, thermoregulation, sleep quality...',
                                    'required' => false,
                                ],
                            ],
                        ],
                        [
                            'id' => 'tcm_objective',
                            'title' => 'TCM Diagnosis (Tongue & Pulse)',
                            'description' => 'Tongue body color, shape, coating, and radial pulse qualities.',
                            'fields' => [
                                [
                                    'id' => 'tongue_diagnosis',
                                    'label' => 'Tongue (Color, Shape, Coating)',
                                    'type' => 'short_text',
                                    'placeholder' => 'e.g. Pale red, thin white coat, scalloped edges',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'pulse_diagnosis',
                                    'label' => 'Pulse (Rate, Strength, Quality)',
                                    'type' => 'short_text',
                                    'placeholder' => 'e.g. Wiry, slippery, deep, thready in Cun/Guan/Chi',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'pattern_differentiation',
                                    'label' => 'TCM Pattern Differentiation / Syndrome',
                                    'type' => 'short_text',
                                    'placeholder' => 'e.g. Liver Qi Stagnation with Spleen Deficiency, Bi Syndrome',
                                    'required' => true,
                                ],
                            ],
                        ],
                        [
                            'id' => 'treatment_protocol',
                            'title' => 'Acupuncture Points & Modalities',
                            'description' => 'Point prescription, needle retention time, and adjunct therapies.',
                            'fields' => [
                                [
                                    'id' => 'acupoints_used',
                                    'label' => 'Acupoints Prescribed & Needling Technique',
                                    'type' => 'long_text',
                                    'placeholder' => 'e.g. LI4, LV3, ST36, SP6, GB34 (De-Qi obtained, even method)',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'retention_time',
                                    'label' => 'Needle Retention Time (Minutes)',
                                    'type' => 'select',
                                    'options' => ['15 minutes', '20 minutes', '25 minutes', '30 minutes', '40 minutes'],
                                    'required' => true,
                                ],
                                [
                                    'id' => 'adjunct_therapies',
                                    'label' => 'Adjunct Therapies (Cupping, Moxa, Gua Sha, Electro)',
                                    'type' => 'long_text',
                                    'placeholder' => 'e.g. Stationary cupping upper back 10 min, TDP heat lamp',
                                    'required' => false,
                                ],
                            ],
                        ],
                        [
                            'id' => 'tcm_plan',
                            'title' => 'Clinical Plan & Recommendations',
                            'description' => 'Treatment course, herbal/dietary lifestyle guidance, return frequency.',
                            'fields' => [
                                [
                                    'id' => 'lifestyle_herbal_advice',
                                    'label' => 'Dietary / Lifestyle Advice',
                                    'type' => 'long_text',
                                    'placeholder' => 'Warm foods, stress management, hydration...',
                                    'required' => false,
                                ],
                                [
                                    'id' => 'next_session',
                                    'label' => 'Follow-Up Interval',
                                    'type' => 'select',
                                    'options' => ['1-2 days', '1 week', '2 weeks', 'Monthly maintenance'],
                                    'required' => true,
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            self::DISCIPLINE_PERSONAL_TRAINING => [
                'name' => 'Personal Training Session & Programming Note',
                'description' => 'Client readiness, workout completed, loads/reps, assessment metrics, and next session progression.',
                'schema' => [
                    'sections' => [
                        [
                            'id' => 'pt_readiness',
                            'title' => 'Client Readiness & Subjective Check-in',
                            'description' => 'Soreness, recovery, energy levels, and session goals.',
                            'fields' => [
                                [
                                    'id' => 'readiness_energy',
                                    'label' => 'Energy & Soreness Level (1-10)',
                                    'type' => 'select',
                                    'options' => ['1-3 (Low / Fatigued)', '4-6 (Moderate)', '7-8 (Good)', '9-10 (Optimal)'],
                                    'required' => true,
                                ],
                                [
                                    'id' => 'injuries_or_restrictions',
                                    'label' => 'Any Current Pain / Movement Restrictions',
                                    'type' => 'long_text',
                                    'placeholder' => 'None reported, or slight lower back tightness...',
                                    'required' => false,
                                ],
                            ],
                        ],
                        [
                            'id' => 'workout_executed',
                            'title' => 'Programming & Exercises Executed',
                            'description' => 'Sets, reps, weights, cardiovascular conditioning, and biomechanical form notes.',
                            'fields' => [
                                [
                                    'id' => 'exercise_breakdown',
                                    'label' => 'Workout Breakdown (Exercises, Sets, Reps, Loads)',
                                    'type' => 'long_text',
                                    'placeholder' => '1. Barbell Squat 3x8 @ 135lbs\n2. Romanian Deadlift 3x10 @ 95lbs\n3. Plank 3x45s...',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'form_movement_quality',
                                    'label' => 'Movement Quality & Technique Cues',
                                    'type' => 'long_text',
                                    'placeholder' => 'Improved hip hinge mechanics, cued knee tracking...',
                                    'required' => false,
                                ],
                            ],
                        ],
                        [
                            'id' => 'pt_progression',
                            'title' => 'Progression & Next Session Target',
                            'description' => 'Cooldown, recovery notes, and targets for the next workout.',
                            'fields' => [
                                [
                                    'id' => 'client_homework',
                                    'label' => 'Assigned Mobility / Recovery Homework',
                                    'type' => 'long_text',
                                    'placeholder' => 'Daily hip flexor stretch 2x30s, 8000 steps target...',
                                    'required' => false,
                                ],
                                [
                                    'id' => 'next_workout_focus',
                                    'label' => 'Next Session Focus',
                                    'type' => 'short_text',
                                    'placeholder' => 'Upper body push/pull strength progression',
                                    'required' => true,
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            self::DISCIPLINE_NUTRITION => [
                'name' => 'Dietetics & Nutrition Clinical Consultation',
                'description' => 'Dietary intake review, anthropometrics, clinical assessment, and nutritional plan.',
                'schema' => [
                    'sections' => [
                        [
                            'id' => 'nutrition_assessment',
                            'title' => 'Subjective & Dietary Intake Review',
                            'description' => 'Food log review, compliance with previous goals, digestive symptoms.',
                            'fields' => [
                                [
                                    'id' => 'dietary_recall',
                                    'label' => '24-Hour Food Recall / Nutrition Habits',
                                    'type' => 'long_text',
                                    'placeholder' => 'Breakfast: Oats with berries, Lunch: Chicken salad, Dinner: Salmon with rice...',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'gi_symptoms',
                                    'label' => 'GI Symptoms / Energy Post-Meals',
                                    'type' => 'long_text',
                                    'placeholder' => 'Bloating, regularity, energy slumps...',
                                    'required' => false,
                                ],
                            ],
                        ],
                        [
                            'id' => 'nutritional_diagnosis',
                            'title' => 'Nutritional Diagnosis & Clinical Observations',
                            'description' => 'Nutrient adequacy, hydration, macronutrient distribution, and barrier identification.',
                            'fields' => [
                                [
                                    'id' => 'clinical_diagnosis',
                                    'label' => 'Nutritional Diagnosis / Focus Area',
                                    'type' => 'long_text',
                                    'placeholder' => 'Inadequate protein distribution across meals, insufficient dietary fiber...',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'anthropometric_metrics',
                                    'label' => 'Weight / Body Composition (Optional)',
                                    'type' => 'short_text',
                                    'placeholder' => 'e.g. Current weight, waist circumference, body fat % if tracked',
                                    'required' => false,
                                ],
                            ],
                        ],
                        [
                            'id' => 'nutrition_intervention',
                            'title' => 'Intervention & Agreed SMART Goals',
                            'description' => 'Specific actionable nutrition steps agreed upon with the client.',
                            'fields' => [
                                [
                                    'id' => 'actionable_goals',
                                    'label' => 'Client Action Goals Until Next Visit',
                                    'type' => 'long_text',
                                    'placeholder' => '1. Include 25-30g protein at breakfast\n2. Drink 2.5L water daily\n3. Add 1 serving leafy greens to dinner',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'follow_up_timeline',
                                    'label' => 'Follow-Up Consultation Schedule',
                                    'type' => 'select',
                                    'options' => ['1 week', '2 weeks', '3-4 weeks', '6-8 weeks'],
                                    'required' => true,
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            self::DISCIPLINE_COLON_HYDROTHERAPY => [
                'name' => 'Colon Hydrotherapy Clinical Session Record',
                'description' => 'Pre-session assessment, water flow/tolerance, observations, and aftercare guidance.',
                'schema' => [
                    'sections' => [
                        [
                            'id' => 'pre_session_check',
                            'title' => 'Pre-Session Check & Contraindication Screen',
                            'description' => 'Review of recent changes, bowel habits, and immediate pre-session comfort.',
                            'fields' => [
                                [
                                    'id' => 'pre_session_symptoms',
                                    'label' => 'Current Bowel Patterns & Sensation',
                                    'type' => 'long_text',
                                    'placeholder' => 'Last bowel movement, bloating, hydration status...',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'contraindication_recheck',
                                    'label' => 'Contraindications Re-screened and Cleared',
                                    'type' => 'select',
                                    'options' => ['Confirmed No Contraindications', 'Session Modified / Low Pressure', 'Contraindication Present (Cancelled)'],
                                    'required' => true,
                                ],
                            ],
                        ],
                        [
                            'id' => 'session_parameters',
                            'title' => 'Session Observations & Parameters',
                            'description' => 'Duration, water temperature, fills, releases, and client comfort.',
                            'fields' => [
                                [
                                    'id' => 'session_observations',
                                    'label' => 'Clinical Observations During Session',
                                    'type' => 'long_text',
                                    'placeholder' => 'Gas release, fecal matter characteristics, abdominal palpation response...',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'client_tolerance_hydro',
                                    'label' => 'Client Tolerance & Comfort Level',
                                    'type' => 'select',
                                    'options' => ['Comfortable / Relaxed', 'Mild Cramping Relieved with Release', 'Moderate Sensitivity', 'Terminated Early on Request'],
                                    'required' => true,
                                ],
                            ],
                        ],
                        [
                            'id' => 'aftercare_plan',
                            'title' => 'Post-Session Instructions & Aftercare',
                            'description' => 'Electrolytes, probiotic replenishment, diet recommendations.',
                            'fields' => [
                                [
                                    'id' => 'aftercare_given',
                                    'label' => 'Aftercare Instructions & Recommendations Provided',
                                    'type' => 'long_text',
                                    'placeholder' => 'Electrolyte replenishment, warm broths/light meals, probiotic guidance...',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'next_appointment',
                                    'label' => 'Recommended Return Schedule',
                                    'type' => 'select',
                                    'options' => ['1 week', '2 weeks', 'Series complete / As needed (PRN)'],
                                    'required' => true,
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            // Custom disciplines get an empty starter template ready for clinic configuration
            default => [
                'name' => Str::title(str_replace('_', ' ', $discipline)).' Clinical Documentation',
                'description' => 'Customizable clinical encounter note template for '.Str::title(str_replace('_', ' ', $discipline)).'.',
                'schema' => [
                    'sections' => [
                        [
                            'id' => 'clinical_notes',
                            'title' => 'Clinical Encounter Notes',
                            'description' => 'Patient subjective report, clinical assessment, treatment administered, and future plan.',
                            'fields' => [
                                [
                                    'id' => 'treatment_summary',
                                    'label' => 'Encounter Summary & Notes',
                                    'type' => 'long_text',
                                    'placeholder' => 'Enter clinical documentation for this encounter...',
                                    'required' => true,
                                ],
                                [
                                    'id' => 'next_steps',
                                    'label' => 'Plan / Next Steps',
                                    'type' => 'long_text',
                                    'placeholder' => 'Follow-up recommendations and care plan...',
                                    'required' => false,
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        };
    }
}
