<?php

namespace App\Http\Controllers\Onboarding;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    protected const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    protected const TIMEZONES = [
        'America/St_Johns', 'America/Halifax', 'America/Toronto', 'America/Winnipeg',
        'America/Regina', 'America/Edmonton', 'America/Vancouver', 'America/New_York',
        'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    ];

    protected const CURRENCIES = ['CAD', 'USD'];

    /** This is a Canada-based platform: provinces/territories are a fixed set. */
    protected const CANADIAN_PROVINCES = [
        'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
        'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
        'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
        'Saskatchewan', 'Yukon',
    ];

    protected const COUNTRIES = ['Canada'];

    /** Suggestions only (a <datalist>) — the city field still accepts free text. */
    protected const CANADIAN_CITIES = [
        'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa',
        'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener', 'London', 'Victoria',
        'Halifax', 'Oshawa', 'Windsor', 'Saskatoon', 'Regina', "St. John's",
        'Barrie', 'Kelowna', 'Guelph', 'Kingston', 'Mississauga', 'Brampton',
        'Surrey', 'Burnaby', 'Richmond', 'Markham', 'Vaughan', 'Gatineau',
        'Longueuil', 'Burlington', 'Sherbrooke', 'Oakville', 'Waterloo',
        'Cambridge', 'Abbotsford', 'Sudbury', 'Trois-Rivières', 'Fredericton',
        'Moncton', 'Charlottetown', 'Whitehorse', 'Yellowknife', 'Iqaluit',
    ];

    /**
     * Show the setup wizard. The current tenant is resolved from the
     * owner's staff membership (set by EnsureStaffRole).
     */
    public function show(Request $request): Response
    {
        $tenant = $this->currentTenant($request);

        return Inertia::render('Onboarding/Setup', [
            'tenant' => $tenant,
            'timezones' => self::TIMEZONES,
            'currencies' => self::CURRENCIES,
            'provinces' => self::CANADIAN_PROVINCES,
            'countries' => self::COUNTRIES,
            'cities' => self::CANADIAN_CITIES,
            'days' => self::DAYS,
        ]);
    }

    /**
     * Step 1 — clinic profile.
     */
    public function updateProfile(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_city' => ['required', 'string', 'max:120'],
            'address_region' => ['required', Rule::in(self::CANADIAN_PROVINCES)],
            'address_country' => ['required', Rule::in(self::COUNTRIES)],
            'timezone' => ['required', Rule::in(self::TIMEZONES)],
            'currency' => ['required', Rule::in(self::CURRENCIES)],
        ]);

        $tenant->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'address' => [
                'line1' => $data['address_line1'] ?? null,
                'city' => $data['address_city'] ?? null,
                'region' => $data['address_region'] ?? null,
                'country' => $data['address_country'] ?? null,
            ],
            'timezone' => $data['timezone'],
            'currency' => $data['currency'],
        ]);

        return back()->with('success', 'Clinic profile saved.');
    }

    /**
     * Step 2 — branding (logo upload + brand colour).
     */
    public function updateBranding(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);

        $data = $request->validate([
            'logo' => ['nullable', 'image', 'max:2048'],
            'brand_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $updates = ['brand_color' => $data['brand_color'] ?? $tenant->brand_color];

        if ($request->hasFile('logo')) {
            if ($tenant->logo_url) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $tenant->logo_url));
            }

            $path = $request->file('logo')->store('logos', 'public');
            $updates['logo_url'] = Storage::url($path);
        }

        $tenant->update($updates);

        return back()->with('success', 'Branding saved.');
    }

    /**
     * Step 3 — business hours. Completes onboarding.
     */
    public function updateHours(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);

        $data = $request->validate([
            'business_hours' => ['required', 'array'],
            'business_hours.*.closed' => ['required', 'boolean'],
            'business_hours.*.open' => ['required_if:business_hours.*.closed,false', 'nullable', 'date_format:H:i'],
            'business_hours.*.close' => ['required_if:business_hours.*.closed,false', 'nullable', 'date_format:H:i'],
        ]);

        $tenant->update([
            'business_hours' => $data['business_hours'],
            'onboarding_completed_at' => now(),
        ]);

        return redirect('/app/dashboard')->with('success', 'Your clinic is all set up!');
    }

    protected function currentTenant(Request $request): Tenant
    {
        $membership = $request->attributes->get('staffMembership');

        return $membership?->tenant ?? Tenant::findOrFail(TenantScope::getTenantId());
    }
}
