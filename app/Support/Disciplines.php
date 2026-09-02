<?php

namespace App\Support;

use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Models\PractitionerProfile;
use Illuminate\Support\Str;

class Disciplines
{
    public const FIXED_LABELS = [
        PractitionerProfile::PROFESSION_MASSAGE_THERAPY => 'Massage Therapy',
        PractitionerProfile::PROFESSION_ACUPUNCTURE_TCM => 'Acupuncture & TCM',
        PractitionerProfile::PROFESSION_PERSONAL_TRAINING => 'Personal Training',
        PractitionerProfile::PROFESSION_NUTRITION => 'Dietetics & Nutrition',
        PractitionerProfile::PROFESSION_COLON_HYDROTHERAPY => 'Colon Hydrotherapy',
    ];

    /**
     * The fixed 5 discipline codes supported by the platform.
     *
     * @return array<int, string>
     */
    public static function fixedCodes(): array
    {
        return ClinicRegistrationController::DISCIPLINES;
    }

    /**
     * Map of code => display label for the fixed 5 disciplines.
     *
     * @return array<string, string>
     */
    public static function fixedLabels(): array
    {
        return self::FIXED_LABELS;
    }

    /**
     * Determine if a discipline code is one of the fixed 5.
     */
    public static function isFixed(string $code): bool
    {
        return in_array($code, self::fixedCodes(), true);
    }

    /**
     * Normalize a custom discipline name into a stable snake_case slug.
     */
    public static function slugify(string $label): string
    {
        return Str::slug(trim($label), '_');
    }

    /**
     * Sanitize a custom discipline display label.
     */
    public static function sanitizeLabel(string $label): string
    {
        return trim(strip_tags($label));
    }
}
