<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Models\AuditEvent;
use App\Models\ConsentType;
use App\Models\IntakeFormTemplate;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use App\Support\ClinicOptions;
use App\Support\Disciplines;
use App\Support\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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
            'scribeSettings' => $tenant->scribeSettings(),
            'scribeConsentConfigured' => ConsentType::ensureScribeTypeForTenant($tenant->id)->isConfigured(),
            'scribeProvider' => config('scribe.transcription.driver'),
            'scribeMaxRetentionHours' => (int) config('scribe.max_retention_hours'),
        ]);
    }

    /**
     * AI Scribe: enable/disable for the clinic and set raw-audio retention.
     */
    public function updateScribe(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'audio_retention_mode' => ['required', Rule::in(['delete_after_transcription', 'retain_window'])],
            'audio_retention_hours' => ['required', 'integer', 'min:1', 'max:'.config('scribe.max_retention_hours')],
        ]);

        DB::transaction(function () use ($tenant, $data, $request) {
            $before = $tenant->scribeSettings();

            $tenant->update(['scribe_settings' => [
                'enabled' => (bool) $data['enabled'],
                'audio_retention_mode' => $data['audio_retention_mode'],
                'audio_retention_hours' => (int) $data['audio_retention_hours'],
            ]]);

            AuditEvent::create([
                'tenant_id' => $tenant->id,
                'user_id' => $request->user()->id,
                'action' => 'scribe.settings_updated',
                'resource_type' => Tenant::class,
                'resource_id' => $tenant->id,
                'ip_address' => $request->ip(),
                'metadata' => ['before' => $before, 'after' => $tenant->scribeSettings()],
            ]);
        });

        return back()->with('success', 'AI Scribe settings updated.');
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

        if ($tenant->subdomain) {
            Cache::forget("tenant_login_branding_{$tenant->subdomain}");
        }

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

        if ($tenant->subdomain) {
            Cache::forget("tenant_login_branding_{$tenant->subdomain}");
        }

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

        if ($tenant->subdomain) {
            Cache::forget("tenant_login_branding_{$tenant->subdomain}");
        }

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
    /**
     * Upload one or multiple images for use in Page Builder.
     * Enforces strict multi-tenant isolation, MIME validation, and metadata tracking.
     */
    public function uploadBuilderImage(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $tenantId = $tenant->id;

        // If a direct URL was submitted, return it
        if ($request->filled('url') || $request->filled('src')) {
            $url = trim($request->input('url') ?? $request->input('src'));
            return response()->json([
                'ok'    => true,
                'data'  => [$url],
                'url'   => $url,
                'asset' => [
                    'src'            => $url,
                    'filename'       => basename(parse_url($url, PHP_URL_PATH) ?: 'image'),
                    'name'           => $request->input('name') ?: basename(parse_url($url, PHP_URL_PATH) ?: 'External Image'),
                    'size'           => null,
                    'size_formatted' => null,
                    'dimensions'     => null,
                    'updated_at'     => time(),
                    'type'           => 'image',
                ],
            ]);
        }

        // Gather all uploaded files (supports 'files[]', 'file', 'image', or any file key)
        $filesToProcess = [];
        if ($request->hasFile('files')) {
            $inputFiles = $request->file('files');
            if (is_array($inputFiles)) {
                $filesToProcess = $inputFiles;
            } else {
                $filesToProcess = [$inputFiles];
            }
        } elseif ($request->hasFile('file')) {
            $filesToProcess = [$request->file('file')];
        } elseif ($request->hasFile('image')) {
            $filesToProcess = [$request->file('image')];
        } else {
            $all = $request->allFiles();
            foreach ($all as $item) {
                if (is_array($item)) {
                    $filesToProcess = array_merge($filesToProcess, $item);
                } elseif ($item instanceof \Illuminate\Http\UploadedFile) {
                    $filesToProcess[] = $item;
                }
            }
        }

        if (empty($filesToProcess)) {
            return response()->json(['error' => 'No valid image files provided for upload.'], 422);
        }

        $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
        $metadata = $this->getBuilderMetadata($tenantId);
        $uploadedAssets = [];

        foreach ($filesToProcess as $file) {
            if (! ($file instanceof \Illuminate\Http\UploadedFile) || ! $file->isValid()) {
                continue;
            }

            $origName = $file->getClientOriginalName();
            $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
            if (! $ext) {
                $ext = strtolower($file->guessExtension() ?? 'png');
            }

            if (! in_array($ext, $allowedExts, true)) {
                return response()->json([
                    'error' => "Invalid file format for \"{$origName}\". Allowed: JPG, PNG, GIF, WEBP, SVG, AVIF.",
                ], 422);
            }

            if ($file->getSize() > 10 * 1024 * 1024) {
                return response()->json([
                    'error' => "File \"{$origName}\" exceeds the 10MB limit.",
                ], 422);
            }

            $filename = Str::random(40) . '.' . $ext;
            $path = "builder/{$tenantId}/{$filename}";

            // Read image dimensions if applicable
            $dimensions = null;
            try {
                $imageInfo = @getimagesize($file->getRealPath());
                if ($imageInfo) {
                    $dimensions = [
                        'width'  => $imageInfo[0],
                        'height' => $imageInfo[1],
                    ];
                }
            } catch (\Throwable $e) {}

            try {
                Storage::disk('public')->put($path, file_get_contents($file->getRealPath()));
                $url = Storage::url($path);
                $fileSize = $file->getSize();

                // Track metadata
                $metadata[$filename] = [
                    'name'        => $origName,
                    'alt'         => '',
                    'uploaded_at' => time(),
                    'dimensions'  => $dimensions,
                ];

                $uploadedAssets[] = [
                    'src'            => $url,
                    'filename'       => $filename,
                    'name'           => $origName,
                    'alt'            => '',
                    'size'           => $fileSize,
                    'size_formatted' => $this->formatBytes($fileSize),
                    'dimensions'     => $dimensions,
                    'updated_at'     => time(),
                    'type'           => 'image',
                ];
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Upload image error: ' . $e->getMessage(), ['file' => $origName, 'exception' => $e]);
                return response()->json(['error' => 'Storage error: ' . $e->getMessage()], 500);
            }
        }

        try {
            $this->saveBuilderMetadata($tenantId, $metadata);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to save builder metadata: ' . $e->getMessage());
        }

        if (empty($uploadedAssets)) {
            return response()->json(['error' => 'Failed to process uploaded file(s).'], 422);
        }

        $firstUrl = $uploadedAssets[0]['src'];

        return response()->json([
            'ok'     => true,
            'assets' => $uploadedAssets,
            'asset'  => $uploadedAssets[0],
            'url'    => $firstUrl,
            'data'   => [$firstUrl],
            'name'   => $uploadedAssets[0]['name'],
        ]);
    }

    /**
     * List all uploaded images for the current tenant.
     * Enforces tenant isolation (only files in builder/{tenant_id}/).
     */
    public function listBuilderAssets(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $tenantId = $tenant->id;
        $directory = "builder/{$tenantId}";

        $metadata = $this->getBuilderMetadata($tenantId);
        $assets = [];

        // Include tenant logo if set
        if ($tenant->logo_url) {
            $assets[] = [
                'src'            => $tenant->logo_url,
                'filename'       => 'clinic-logo',
                'name'           => 'Clinic Logo',
                'alt'            => $tenant->name . ' Logo',
                'size'           => null,
                'size_formatted' => 'Preset',
                'dimensions'     => null,
                'updated_at'     => time() + 1000,
                'type'           => 'image',
                'is_preset'      => true,
            ];
        }

        if (Storage::disk('public')->exists($directory)) {
            $files = Storage::disk('public')->files($directory);
            foreach ($files as $file) {
                $base = basename($file);
                if ($base === 'metadata.json') {
                    continue;
                }

                $meta = $metadata[$base] ?? [];
                $size = Storage::disk('public')->size($file);
                $updatedAt = Storage::disk('public')->lastModified($file);

                $dimensions = $meta['dimensions'] ?? null;
                if (! $dimensions) {
                    try {
                        $fullPath = Storage::disk('public')->path($file);
                        $info = @getimagesize($fullPath);
                        if ($info) {
                            $dimensions = ['width' => $info[0], 'height' => $info[1]];
                        }
                    } catch (\Throwable $e) {}
                }

                $assets[] = [
                    'src'            => Storage::url($file),
                    'filename'       => $base,
                    'name'           => $meta['name'] ?? $base,
                    'alt'            => $meta['alt'] ?? '',
                    'size'           => $size,
                    'size_formatted' => $this->formatBytes($size),
                    'dimensions'     => $dimensions,
                    'updated_at'     => $updatedAt,
                    'type'           => 'image',
                    'is_preset'      => false,
                ];
            }
        }

        // Sort newest first
        usort($assets, function ($a, $b) {
            return ($b['updated_at'] ?? 0) <=> ($a['updated_at'] ?? 0);
        });

        return response()->json([
            'ok'     => true,
            'assets' => $assets,
        ]);
    }

    /**
     * Delete an uploaded asset.
     * Enforces tenant isolation — only files in builder/{tenant_id}/ can be deleted.
     */
    public function deleteBuilderAsset(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $tenantId = $tenant->id;

        $target = $request->input('filename') ?: $request->input('url') ?: $request->input('src');
        if (! $target) {
            return response()->json(['error' => 'Filename or image URL is required.'], 422);
        }

        if (str_contains($target, '..') || str_contains($target, '\\')) {
            return response()->json(['error' => 'Invalid file identifier.'], 422);
        }

        $filename = basename(parse_url($target, PHP_URL_PATH) ?: $target);

        // Security check: strictly disallow traversal, invalid names, or metadata.json
        if (empty($filename) || $filename === '.' || $filename === '..' || str_contains($filename, '/') || str_contains($filename, '\\') || $filename === 'metadata.json') {
            return response()->json(['error' => 'Invalid file identifier.'], 422);
        }

        $path = "builder/{$tenantId}/{$filename}";

        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        // Remove from metadata
        $metadata = $this->getBuilderMetadata($tenantId);
        if (isset($metadata[$filename])) {
            unset($metadata[$filename]);
            $this->saveBuilderMetadata($tenantId, $metadata);
        }

        return response()->json([
            'ok'       => true,
            'message'  => 'Image deleted successfully.',
            'filename' => $filename,
        ]);
    }

    /**
     * Rename or update alt text for an uploaded asset.
     */
    public function renameBuilderAsset(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $tenantId = $tenant->id;

        $request->validate([
            'filename' => 'required|string',
            'name'     => 'required|string|max:255',
            'alt'      => 'nullable|string|max:255',
        ]);

        $filename = basename($request->input('filename'));
        if (empty($filename) || $filename === 'metadata.json' || str_contains($filename, '/') || str_contains($filename, '\\')) {
            return response()->json(['error' => 'Invalid file identifier.'], 422);
        }

        $path = "builder/{$tenantId}/{$filename}";
        if (! Storage::disk('public')->exists($path)) {
            return response()->json(['error' => 'File does not exist in clinic media storage.'], 404);
        }

        $metadata = $this->getBuilderMetadata($tenantId);
        if (! isset($metadata[$filename])) {
            $metadata[$filename] = [
                'name'        => $filename,
                'alt'         => '',
                'uploaded_at' => time(),
            ];
        }

        $metadata[$filename]['name'] = trim($request->input('name'));
        if ($request->has('alt')) {
            $metadata[$filename]['alt'] = trim($request->input('alt') ?? '');
        }

        $this->saveBuilderMetadata($tenantId, $metadata);

        return response()->json([
            'ok'    => true,
            'asset' => [
                'filename' => $filename,
                'name'     => $metadata[$filename]['name'],
                'alt'      => $metadata[$filename]['alt'],
            ],
        ]);
    }

    private function getBuilderMetadata(string|int $tenantId): array
    {
        $path = "builder/{$tenantId}/metadata.json";
        if (Storage::disk('public')->exists($path)) {
            $json = Storage::disk('public')->get($path);
            $decoded = json_decode($json, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
        return [];
    }

    private function saveBuilderMetadata(string|int $tenantId, array $metadata): void
    {
        $path = "builder/{$tenantId}/metadata.json";
        Storage::disk('public')->put($path, json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    private function formatBytes(int $bytes, int $precision = 1): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    protected function currentTenant(Request $request): Tenant
    {
        $membership = $request->attributes->get('staffMembership');

        return $membership?->tenant ?? Tenant::findOrFail(TenantScope::getTenantId());
    }
}
