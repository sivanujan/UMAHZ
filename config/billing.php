<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Clinic Subscription Tiers & Pricing (Jane-style)
    |--------------------------------------------------------------------------
    | All prices are monthly, recurring in CAD.
    | Stripe Price IDs are loaded from environment variables and never hardcoded.
    */
    'tiers' => [
        'balance' => [
            'name' => 'Balance',
            'tagline' => 'For solo practitioners starting out',
            'base_price' => 54.00,
            'stripe_price_id' => env('STRIPE_PRICE_BALANCE_BASE'),
            'included_full_time' => 1,
            'max_practitioners' => 1,
            'max_appointments_per_month' => 20,
            'allows_addons' => false,
            'addon_price_ft' => 0.0,
            'addon_price_pt' => 0.0,
            'stripe_addon_price_ft_id' => null,
            'stripe_addon_price_pt_id' => null,
            'features' => [
                '1 practitioner only',
                'Up to 20 appointments / month',
                'Online booking & calendar',
                'Charting & intake forms',
                'Billing & invoicing',
            ],
        ],

        'practice' => [
            'name' => 'Practice',
            'tagline' => 'For growing clinics with multiple practitioners',
            'base_price' => 79.00,
            'stripe_price_id' => env('STRIPE_PRICE_PRACTICE_BASE'),
            'included_full_time' => 1,
            'max_practitioners' => null, // unlimited
            'max_appointments_per_month' => null, // unlimited
            'allows_addons' => true,
            'addon_price_ft' => 35.00,
            'addon_price_pt' => 17.50,
            'stripe_addon_price_ft_id' => env('STRIPE_PRICE_PRACTICE_ADDON_FT'),
            'stripe_addon_price_pt_id' => env('STRIPE_PRICE_PRACTICE_ADDON_PT'),
            'features' => [
                'Includes 1 full-time practitioner',
                'Unlimited appointments',
                '+$35/mo per extra full-time practitioner',
                '+$17.50/mo per extra part-time practitioner',
                'Custom disciplines & intake templates',
                'Multi-practitioner scheduling',
            ],
        ],

        'thrive' => [
            'name' => 'Thrive',
            'tagline' => 'For high-volume multi-disciplinary practices',
            'base_price' => 99.00,
            'stripe_price_id' => env('STRIPE_PRICE_THRIVE_BASE'),
            'included_full_time' => 1,
            'max_practitioners' => null, // unlimited
            'max_appointments_per_month' => null, // unlimited
            'allows_addons' => true,
            'addon_price_ft' => 40.00,
            'addon_price_pt' => 20.00,
            'stripe_addon_price_ft_id' => env('STRIPE_PRICE_THRIVE_ADDON_FT'),
            'stripe_addon_price_pt_id' => env('STRIPE_PRICE_THRIVE_ADDON_PT'),
            'features' => [
                'Includes 1 full-time practitioner',
                'Unlimited appointments',
                '+$40/mo per extra full-time practitioner',
                '+$20/mo per extra part-time practitioner',
                'Priority support & advanced analytics',
                'Custom branding & white-label options',
            ],
        ],
    ],

    /*
    | Legacy/fallback single monthly price ID
    */
    'price_monthly' => env('STRIPE_PRICE_MONTHLY'),

    /*
    | How long a pending clinic registration (card not yet saved) holds its
    | subdomain reservation before it expires and is pruned.
    */
    'pending_registration_ttl_minutes' => (int) env('PENDING_REGISTRATION_TTL_MINUTES', 30),
];

