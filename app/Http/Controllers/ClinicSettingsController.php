<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Models\IntakeFormTemplate;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use App\Support\ClinicOptions;
use App\Support\Disciplines;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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
            'customDisciplines' => $tenant->customDisciplinesList(),
            'disciplineLabels' => $tenant->allDisciplineLabels(),
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
            'disciplines.*' => ['required', 'string', 'max:60'],
            'custom_disciplines' => ['nullable', 'array', 'max:30'],
            'custom_disciplines.*' => ['nullable'],
        ]);

        $customDisciplines = [];
        $customSlugs = [];
        $fixedCodes = ClinicRegistrationController::DISCIPLINES;
        $fixedLabelsLower = array_map('strtolower', Disciplines::FIXED_LABELS);

        // Include any custom disciplines sent in request
        $incomingCustom = $data['custom_disciplines'] ?? $tenant->customDisciplinesList();

        if (is_array($incomingCustom)) {
            foreach ($incomingCustom as $item) {
                $rawLabel = is_array($item) ? ($item['label'] ?? '') : (string) $item;
                $label = Disciplines::sanitizeLabel($rawLabel);
                if (empty($label)) {
                    continue;
                }
                if (mb_strlen($label) > 50) {
                    throw ValidationException::withMessages([
                        'custom_disciplines' => 'Custom discipline name may not be greater than 50 characters.',
                    ]);
                }
                $slug = is_array($item) && ! empty($item['slug'])
                    ? Disciplines::slugify((string) $item['slug'])
                    : Disciplines::slugify($label);

                if (empty($slug)) {
                    continue;
                }

                if (in_array($slug, $fixedCodes, true) || in_array(strtolower($label), $fixedLabelsLower, true)) {
                    throw ValidationException::withMessages([
                        'custom_disciplines' => "The discipline \"{$label}\" is already a standard platform discipline.",
                    ]);
                }

                if (in_array($slug, $customSlugs, true)) {
                    throw ValidationException::withMessages([
                        'custom_disciplines' => "Duplicate custom discipline \"{$label}\" provided.",
                    ]);
                }

                $customSlugs[] = $slug;
                $customDisciplines[] = [
                    'slug' => $slug,
                    'label' => $label,
                ];
            }
        }

        // Strict tenant scope: all selected disciplines must belong to fixed 5 or this tenant's custom disciplines
        $allowedCodes = array_merge($fixedCodes, $customSlugs);
        foreach ($data['disciplines'] as $d) {
            if (! in_array($d, $allowedCodes, true)) {
                throw ValidationException::withMessages([
                    'disciplines' => "Invalid discipline selected: {$d}.",
                ]);
            }
        }

        DB::transaction(function () use ($tenant, $data, $customDisciplines) {
            $tenant->update([
                'requested_disciplines' => array_values($data['disciplines']),
                'custom_disciplines' => $customDisciplines,
            ]);

            // Ensure baseline starter templates or empty custom templates exist
            IntakeFormTemplate::ensureDefaultsForTenant($tenant->id, $tenant->requested_disciplines);
        });

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
