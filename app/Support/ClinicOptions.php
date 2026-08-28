<?php

namespace App\Support;

use App\Http\Controllers\Onboarding\ClinicRegistrationController;

/**
 * Shared option lists for clinic profile/settings forms (onboarding wizard and
 * the owner's Clinic Settings page). Single source so the two stay in sync.
 * This is a Canada-based platform, so provinces/country are a fixed set.
 */
class ClinicOptions
{
    public const PROVINCES = [
        'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
        'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
        'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
        'Saskatchewan', 'Yukon',
    ];

    public const COUNTRIES = ['Canada'];

    /** Suggestions only (a <datalist>) — the city field still accepts free text. */
    public const CITIES = [
        'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa',
        'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener', 'London', 'Victoria',
        'Halifax', 'Oshawa', 'Windsor', 'Saskatoon', 'Regina', "St. John's",
        'Barrie', 'Kelowna', 'Guelph', 'Kingston', 'Mississauga', 'Brampton',
        'Surrey', 'Burnaby', 'Richmond', 'Markham', 'Vaughan', 'Gatineau',
        'Longueuil', 'Burlington', 'Sherbrooke', 'Oakville', 'Waterloo',
        'Cambridge', 'Abbotsford', 'Sudbury', 'Trois-Rivières', 'Fredericton',
        'Moncton', 'Charlottetown', 'Whitehorse', 'Yellowknife', 'Iqaluit',
    ];

    public const TIMEZONES = [
        'America/St_Johns', 'America/Halifax', 'America/Toronto', 'America/Winnipeg',
        'America/Regina', 'America/Edmonton', 'America/Vancouver', 'America/New_York',
        'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    ];

    public const CURRENCIES = ['CAD', 'USD'];

    /**
     * The wellness disciplines the platform supports (single source lives on
     * the registration controller).
     *
     * @return array<int, string>
     */
    public static function disciplines(): array
    {
        return ClinicRegistrationController::DISCIPLINES;
    }
}
