<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use App\Support\ClinicOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The owner's post-onboarding "Clinic Settings" page: edit clinic profile,
 * branding, and the disciplines the clinic offers. Owner-only (gated by the
 * route group); the tenant is the current subdomain tenant.
 */
class ClinicSettingsController extends Controller
{
    public function show(Request $request): Response
    {
        $tenant = $this->currentTenant($request);

        return Inertia::render('Settings/Clinic', [
            'tenant' => $tenant,
            'timezones' => ClinicOptions::TIMEZONES,
            'currencies' => ClinicOptions::CURRENCIES,
            'provinces' => ClinicOptions::PROVINCES,
            'countries' => ClinicOptions::COUNTRIES,
            'cities' => ClinicOptions::CITIES,
            'allDisciplines' => ClinicOptions::disciplines(),
        ]);
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_city' => ['required', 'string', 'max:120'],
            'address_region' => ['required', Rule::in(ClinicOptions::PROVINCES)],
            'address_country' => ['required', Rule::in(ClinicOptions::COUNTRIES)],
            'address_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'address_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'timezone' => ['required', Rule::in(ClinicOptions::TIMEZONES)],
            'currency' => ['required', Rule::in(ClinicOptions::CURRENCIES)],
        ]);

        $tenant->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'address' => [
                'line1' => $data['address_line1'],
                'city' => $data['address_city'],
                'region' => $data['address_region'],
                'country' => $data['address_country'],
                'lat' => $data['address_lat'] ?? null,
                'lng' => $data['address_lng'] ?? null,
            ],
            'timezone' => $data['timezone'],
            'currency' => $data['currency'],
        ]);

        return back()->with('success', 'Clinic profile updated.');
    }

    public function updateDisciplines(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);

        $data = $request->validate([
            'disciplines' => ['required', 'array', 'min:1'],
            'disciplines.*' => [Rule::in(ClinicRegistrationController::DISCIPLINES)],
        ]);

        $tenant->update(['requested_disciplines' => array_values($data['disciplines'])]);

        return back()->with('success', 'Disciplines updated.');
    }

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

        return back()->with('success', 'Branding updated.');
    }

    protected function currentTenant(Request $request): Tenant
    {
        $membership = $request->attributes->get('staffMembership');

        return $membership?->tenant ?? Tenant::findOrFail(TenantScope::getTenantId());
    }
}
