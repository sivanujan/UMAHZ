<?php

namespace App\Insurance;

class InsuranceProfessions
{
    /**
     * Recognized professions reference list for Canadian health insurance billing.
     *
     * @var array<string, string>
     */
    public const PROFESSIONS = [
        'physiotherapy' => 'Physiotherapy',
        'massage_therapy' => 'Massage Therapy',
        'chiropractic' => 'Chiropractic',
        'naturopathy' => 'Naturopathy',
        'acupuncture' => 'Acupuncture',
        'psychology' => 'Psychology',
        'psychotherapy' => 'Psychotherapy',
        'counselling' => 'Counselling',
        'dietitian' => 'Dietitian',
        'occupational_therapy' => 'Occupational Therapy',
        'osteopathy' => 'Osteopathy',
        'podiatry_chiropody' => 'Podiatry / Chiropody',
        'speech_therapy' => 'Speech Therapy',
        'social_work' => 'Social Work',
        'optometry_optician' => 'Optometry / Optician',
    ];

    /**
     * Default mapping from standard platform disciplines to recognized professions.
     * Null means the discipline is typically not insurance billable (e.g. personal training).
     *
     * @var array<string, string|null>
     */
    public const STANDARD_DISCIPLINE_MAP = [
        'physiotherapy' => 'physiotherapy',
        'massage_therapy' => 'massage_therapy',
        'chiropractor' => 'chiropractic',
        'acupuncture_tcm' => 'acupuncture',
        'nutrition' => null,
        'personal_training' => null,
        'colon_hydrotherapy' => null,
    ];

    /**
     * Get all recognized professions with their display labels.
     *
     * @return array<string, string>
     */
    public static function all(): array
    {
        return self::PROFESSIONS;
    }

    /**
     * Get array of options suitable for frontend dropdowns:
     * [['code' => 'physiotherapy', 'label' => 'Physiotherapy'], ...]
     *
     * @return array<int, array{code: string, label: string}>
     */
    public static function options(): array
    {
        $options = [];
        foreach (self::PROFESSIONS as $code => $label) {
            $options[] = [
                'code' => $code,
                'label' => $label,
            ];
        }

        return $options;
    }

    /**
     * Determine if a profession code is recognized.
     */
    public static function isValid(?string $code): bool
    {
        if ($code === null) {
            return false;
        }

        return array_key_exists($code, self::PROFESSIONS);
    }

    /**
     * Get display label for a profession code.
     */
    public static function label(?string $code): ?string
    {
        if (! $code) {
            return null;
        }

        return self::PROFESSIONS[$code] ?? null;
    }

    /**
     * Map a standard discipline code to its recognized profession.
     */
    public static function forStandardDiscipline(string $discipline): ?string
    {
        return self::STANDARD_DISCIPLINE_MAP[$discipline] ?? null;
    }
}

