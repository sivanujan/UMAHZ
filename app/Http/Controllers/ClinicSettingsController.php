<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Models\IntakeFormTemplate;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use App\Support\ClinicOptions;
use App\Support\Disciplines;
use App\Support\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
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

    /**
     * Show the clinic's public home page settings editor.
     */
    public function showHomepage(Request $request): Response
    {
        $tenant = $this->currentTenant($request);

        return Inertia::render('Settings/Homepage', [
            'tenant' => $tenant,
        ]);
    }

    /**
     * Save the clinic's public home page content settings.
     */
    public function updateHomepage(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);

        $data = $request->validate([
            'tagline'             => ['nullable', 'string', 'max:120'],
            'description'         => ['nullable', 'string', 'max:1000'],
            'show_hours'          => ['boolean'],
            'show_address'        => ['boolean'],
            'cover_image'         => ['nullable', 'image', 'max:4096'],
            'social.instagram'    => ['nullable', 'url', 'max:255'],
            'social.facebook'     => ['nullable', 'url', 'max:255'],
            'social.twitter'      => ['nullable', 'url', 'max:255'],
            'social.linkedin'     => ['nullable', 'url', 'max:255'],
            'social.tiktok'       => ['nullable', 'url', 'max:255'],
            'social.youtube'      => ['nullable', 'url', 'max:255'],
            'social.website'      => ['nullable', 'url', 'max:255'],
            'custom_buttons'              => ['nullable', 'array', 'max:3'],
            'custom_buttons.*.label'      => ['required_with:custom_buttons.*', 'string', 'max:40'],
            'custom_buttons.*.url'        => ['required_with:custom_buttons.*', 'url', 'max:255'],
        ]);

        $existing = $tenant->homepage_settings ?? [];

        $coverImageUrl = $existing['cover_image_url'] ?? null;
        if ($request->hasFile('cover_image')) {
            // Delete old cover if present
            if ($coverImageUrl) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $coverImageUrl));
            }
            $path = $request->file('cover_image')->store('homepage-covers', 'public');
            $coverImageUrl = Storage::url($path);
        }

        // Filter out empty custom buttons
        $customButtons = [];
        foreach ($data['custom_buttons'] ?? [] as $btn) {
            if (! empty($btn['label']) && ! empty($btn['url'])) {
                $customButtons[] = [
                    'label' => $btn['label'],
                    'url'   => $btn['url'],
                ];
            }
        }

        $tenant->update([
            'homepage_settings' => [
                'tagline'         => $data['tagline'] ?? null,
                'description'     => $data['description'] ?? null,
                'cover_image_url' => $coverImageUrl,
                'show_hours'      => (bool) ($data['show_hours'] ?? true),
                'show_address'    => (bool) ($data['show_address'] ?? true),
                'social'          => [
                    'instagram' => $data['social']['instagram'] ?? null,
                    'facebook'  => $data['social']['facebook'] ?? null,
                    'twitter'   => $data['social']['twitter'] ?? null,
                    'linkedin'  => $data['social']['linkedin'] ?? null,
                    'tiktok'    => $data['social']['tiktok'] ?? null,
                    'youtube'   => $data['social']['youtube'] ?? null,
                    'website'   => $data['social']['website'] ?? null,
                ],
                'custom_buttons' => $customButtons,
            ],
        ]);

        return back()->with('success', 'Home page updated.');
    }

    /**
     * Show the GrapesJS drag-drop page builder for the clinic's public home page.
     */
    public function showPageBuilder(Request $request): Response
    {
        $tenant = $this->currentTenant($request);
        $hp = $tenant->homepage_settings ?? [];

        return Inertia::render('Settings/PageBuilder', [
            'tenant' => [
                'id'                      => $tenant->id,
                'name'                    => $tenant->name,
                'subdomain'               => $tenant->subdomain,
                'logo_url'                => $tenant->logo_url,
                'brand_color'             => $tenant->brand_color ?: '#6d28d9',
                'email'                   => $tenant->email ?: $tenant->primary_contact_email,
                'phone'                   => $tenant->phone ?: $tenant->primary_contact_phone,
                'address'                 => $tenant->address,
                'business_hours'          => $tenant->business_hours,
                'offeredDisciplineLabels' => $tenant->offeredDisciplineLabels(),
                'gjs_project'             => $hp['gjs_project'] ?? null,
                'gjs_html'                => $hp['gjs_html'] ?? null,
                'gjs_css'                 => $hp['gjs_css'] ?? null,
            ],
        ]);
    }

    /**
     * Persist the GrapesJS page layout (project JSON data, HTML, CSS) to the database.
     */
    public function saveLayout(Request $request): JsonResponse
    {
        try {
            $tenant = $this->currentTenant($request);

            $data = $request->validate([
                'gjs_project' => ['nullable'],
                'gjs_html'    => ['nullable', 'string'],
                'gjs_css'     => ['nullable', 'string'],
            ]);

            $cleanHtml = HtmlSanitizer::sanitize($data['gjs_html'] ?? '');
            $cleanCss  = HtmlSanitizer::sanitizeCss($data['gjs_css'] ?? '');

            DB::transaction(function () use ($tenant, $data, $cleanHtml, $cleanCss) {
                $existing = $tenant->homepage_settings ?? [];
                $existing['gjs_project'] = $data['gjs_project'] ?? null;
                $existing['gjs_html']    = $cleanHtml;
                $existing['gjs_css']     = $cleanCss;

                $tenant->update(['homepage_settings' => $existing]);
            });

            return response()->json([
                'ok' => true,
                'message' => 'Page layout saved successfully.',
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Page builder save layout failed: ' . $e->getMessage(), [
                'exception' => $e,
            ]);

            return response()->json([
                'ok' => false,
                'error' => 'Failed to save page layout: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload an image for use in GrapesJS Asset Manager.
     * Returns { data: [ 'url' ], url: '...' } for GrapesJS compatibility.
     */
    public function uploadBuilderImage(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);

        // If a direct URL was submitted, return it
        if ($request->filled('url') || $request->filled('src')) {
            $url = $request->input('url') ?? $request->input('src');
            return response()->json([
                'data' => [$url],
                'url'  => $url,
            ]);
        }

        // Flexibly handle 'file', 'image', 'files', or any uploaded file in request
        $file = $request->file('file') ?? $request->file('image');
        if (! $file && $request->hasFile('files')) {
            $files = $request->file('files');
            $file = is_array($files) ? ($files[0] ?? null) : $files;
        }
        if (! $file) {
            $allFiles = $request->allFiles();
            if (! empty($allFiles)) {
                $first = reset($allFiles);
                $file = is_array($first) ? ($first[0] ?? null) : $first;
            }
        }

        if (! $file || ! ($file instanceof \Illuminate\Http\UploadedFile) || ! $file->isValid()) {
            return response()->json(['error' => 'No valid image file provided.'], 422);
        }

        $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
        $origName = $file->getClientOriginalName();
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        if (! $ext) {
            $ext = strtolower($file->guessExtension() ?? 'png');
        }

        if (! in_array($ext, $allowedExts, true)) {
            return response()->json(['error' => 'Invalid file format. Allowed formats: JPG, PNG, GIF, WEBP, SVG.'], 422);
        }

        if ($file->getSize() > 10 * 1024 * 1024) {
            return response()->json(['error' => 'File size exceeds 10MB limit.'], 422);
        }

        try {
            if (class_exists('finfo')) {
                $validator = Validator::make(['file' => $file], [
                    'file' => ['required', 'file', 'max:10240'],
                ]);

                if ($validator->fails()) {
                    return response()->json(['error' => $validator->errors()->first()], 422);
                }
            }
        } catch (\Throwable $e) {
            // Ignore finfo issues if standard validation throws
        }

        $filename = Str::random(40) . '.' . $ext;
        $path = "builder/{$tenant->id}/{$filename}";
        Storage::disk('public')->put($path, file_get_contents($file->getRealPath()));
        $url = Storage::url($path);

        return response()->json([
            'data' => [$url],
            'url'  => $url,
            'name' => $origName,
        ]);
    }

    /**
     * List all uploaded images for the current tenant.
     * Enforces tenant isolation (only files in builder/{tenant_id}/).
     */
    public function listBuilderAssets(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $directory = "builder/{$tenant->id}";

        $assets = [];

        // Include tenant logo if set
        if ($tenant->logo_url) {
            $assets[] = [
                'src'  => $tenant->logo_url,
                'name' => 'Clinic Logo',
                'type' => 'image',
            ];
        }

        if (Storage::disk('public')->exists($directory)) {
            $files = Storage::disk('public')->files($directory);
            foreach ($files as $file) {
                $assets[] = [
                    'src'  => Storage::url($file),
                    'name' => basename($file),
                    'type' => 'image',
                ];
            }
        }

        return response()->json([
            'assets' => $assets,
        ]);
    }

    protected function currentTenant(Request $request): Tenant
    {
        $membership = $request->attributes->get('staffMembership');

        return $membership?->tenant ?? Tenant::findOrFail(TenantScope::getTenantId());
    }
}
