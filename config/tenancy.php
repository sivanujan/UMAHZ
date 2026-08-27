<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Central domain
    |--------------------------------------------------------------------------
    |
    | The root domain that serves the marketing site, the clinic registration
    | wizard and the super-admin area. Clinic staff subdomains are formed as
    | "{subdomain}.{central_domain}". Locally this is "lvh.me" (which, along
    | with all of its subdomains, resolves to 127.0.0.1); in production it is
    | your real apex domain, e.g. "umahz.com".
    |
    | Domain matching ignores the port, so "lvh.me" matches "lvh.me:8000".
    |
    */

    'central_domain' => env('APP_CENTRAL_DOMAIN', 'umahz.com'),

    /*
    |--------------------------------------------------------------------------
    | Patient portal host
    |--------------------------------------------------------------------------
    |
    | Patients/clients live on a single common host (NOT a per-clinic
    | subdomain). Their tenant is resolved from their linked client account,
    | exactly as before. Defaults to "portal." in front of the central domain.
    |
    */

    'portal_host' => env('APP_PORTAL_HOST', 'portal.'.env('APP_CENTRAL_DOMAIN', 'umahz.com')),

    /*
    |--------------------------------------------------------------------------
    | Subdomain validation
    |--------------------------------------------------------------------------
    |
    | Rules applied to a clinic's chosen subdomain, everywhere it is validated
    | (the live availability endpoint, the registration store, the backfill).
    | Lowercase letters/numbers/hyphens only, no leading/trailing hyphen,
    | length 3-40.
    |
    */

    'subdomain_min' => 3,
    'subdomain_max' => 40,

    // ^ starts alnum, then 1-38 of [a-z0-9-], ends alnum  => total length 3-40.
    'subdomain_pattern' => '/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/',

    /*
    |--------------------------------------------------------------------------
    | Reserved subdomains
    |--------------------------------------------------------------------------
    |
    | Hostnames that can never be claimed by a clinic because they collide with
    | platform infrastructure (the portal, the API, mail, etc.).
    |
    */

    'reserved_subdomains' => [
        'www', 'app', 'api', 'admin', 'portal', 'mail', 'smtp', 'ftp',
        'ns1', 'ns2', 'support', 'help', 'status', 'staging', 'dev',
        'test', 'blog', 'cdn', 'assets', 'static',
    ],

];
