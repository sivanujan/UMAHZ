<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\ConsentType;
use App\Scopes\TenantScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ConsentTypeController extends Controller
{
    /**
     * Display the clinic's consent types, text, and PDF document configuration.
     */
    public function index(Request $request): Response
    {
        $tenantId = TenantScope::getTenantId();
        ConsentType::ensureDefaultsForTenant($tenantId);

        $consentTypes = ConsentType::where('tenant_id', $tenantId)
            ->withCount('consents')
            ->orderBy('name')
            ->get()
            ->map(fn (ConsentType $type) => [
                'id' => $type->id,
                'name' => $type->name,
                'code' => $type->code,
                'description' => $type->description,
                'agreement_source' => $type->agreement_source ?? ConsentType::SOURCE_TEXT,
                'body' => $type->body,
                'pdf_path' => $type->pdf_path,
                'pdf_original_name' => $type->pdf_original_name,
                'pdf_file_size' => $type->pdf_file_size,
                'version' => $type->version ?? 1,
                'is_active' => $type->is_active,
                'is_configured' => $type->isConfigured(),
                'consents_count' => $type->consents_count,
                'pdf_url' => $type->pdf_path ? route('consent_types.document', $type->id) : null,
            ]);

        return Inertia::render('Settings/Consents', [
            'consentTypes' => $consentTypes,
        ]);
    }

    /**
     * Store a new custom consent type for the clinic (typed text or uploaded PDF).
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = TenantScope::getTenantId();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'agreement_source' => ['sometimes', 'string', 'in:text,pdf'],
            'body' => ['nullable', 'string', 'max:50000'],
            'pdf_file' => ['nullable', 'file', 'extensions:pdf', 'max:10240'],
        ]);

        $agreementSource = $data['agreement_source'] ?? ConsentType::SOURCE_TEXT;
        $code = Str::slug($data['name'], '_');

        $pdfPath = null;
        $pdfOriginalName = null;
        $pdfFileSize = null;

        if ($agreementSource === ConsentType::SOURCE_PDF && $request->hasFile('pdf_file')) {
            $file = $request->file('pdf_file');
            $pdfPath = $file->storeAs(
                "consents/types/{$tenantId}",
                Str::uuid().'.'.$file->getClientOriginalExtension(),
                'local'
            );
            $pdfOriginalName = $file->getClientOriginalName();
            $pdfFileSize = $file->getSize();
        }

        $consentType = ConsentType::create([
            'tenant_id' => $tenantId,
            'name' => trim($data['name']),
            'code' => $code,
            'description' => $data['description'] ?? null,
            'agreement_source' => $agreementSource,
            'body' => $agreementSource === ConsentType::SOURCE_TEXT ? ($data['body'] ?? null) : null,
            'pdf_path' => $pdfPath,
            'pdf_original_name' => $pdfOriginalName,
            'pdf_file_size' => $pdfFileSize,
            'version' => 1,
            'is_active' => true,
        ]);

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'consent_type.created',
            'resource_type' => ConsentType::class,
            'resource_id' => $consentType->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'agreement_source' => $consentType->agreement_source,
                'has_pdf' => (bool) $consentType->pdf_path,
            ],
        ]);

        return back()->with('success', "Consent type \"{$consentType->name}\" created.");
    }

    /**
     * Update an existing consent type's name, description, legal agreement body text, or uploaded PDF.
     */
    public function update(Request $request, ConsentType $consentType): RedirectResponse
    {
        abort_unless($consentType->tenant_id === TenantScope::getTenantId(), 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'agreement_source' => ['sometimes', 'string', 'in:text,pdf'],
            'body' => ['nullable', 'string', 'max:50000'],
            'pdf_file' => ['nullable', 'file', 'extensions:pdf', 'max:10240'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $data['agreement_source'] = $data['agreement_source'] ?? $consentType->agreement_source ?? ConsentType::SOURCE_TEXT;

        $previousSource = $consentType->agreement_source;
        $previousBody = $consentType->body;
        $previousPdf = $consentType->pdf_path;
        $shouldBumpVersion = false;

        if ($data['agreement_source'] === ConsentType::SOURCE_PDF) {
            if ($request->hasFile('pdf_file')) {
                $file = $request->file('pdf_file');
                $data['pdf_path'] = $file->storeAs(
                    "consents/types/{$consentType->tenant_id}",
                    Str::uuid().'.'.$file->getClientOriginalExtension(),
                    'local'
                );
                $data['pdf_original_name'] = $file->getClientOriginalName();
                $data['pdf_file_size'] = $file->getSize();
                $shouldBumpVersion = true;
            }
        } else {
            // Text source
            if (isset($data['body']) && trim((string) $data['body']) !== trim((string) $previousBody)) {
                $shouldBumpVersion = true;
            }
        }

        if ($previousSource !== $data['agreement_source']) {
            $shouldBumpVersion = true;
        }

        if ($shouldBumpVersion) {
            $data['version'] = ($consentType->version ?? 1) + 1;
        }

        $consentType->update($data);

        AuditEvent::create([
            'tenant_id' => TenantScope::getTenantId(),
            'user_id' => $request->user()->id,
            'action' => 'consent_type.updated',
            'resource_type' => ConsentType::class,
            'resource_id' => $consentType->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'agreement_source' => $consentType->agreement_source,
                'version' => $consentType->version,
                'has_pdf' => (bool) $consentType->pdf_path,
            ],
        ]);

        return back()->with('success', "Consent settings for \"{$consentType->name}\" saved.");
    }

    /**
     * Securely stream the active PDF template for a consent type to authorized staff.
     */
    public function document(Request $request, ConsentType $consentType): StreamedResponse
    {
        abort_unless($consentType->tenant_id === TenantScope::getTenantId(), 404);
        abort_unless($consentType->pdf_path && Storage::disk('local')->exists($consentType->pdf_path), 404);

        AuditEvent::create([
            'tenant_id' => TenantScope::getTenantId(),
            'user_id' => $request->user()->id,
            'action' => 'consent_type.document_viewed',
            'resource_type' => ConsentType::class,
            'resource_id' => $consentType->id,
            'ip_address' => $request->ip(),
        ]);

        return Storage::disk('local')->response(
            $consentType->pdf_path,
            $consentType->pdf_original_name ?? 'consent.pdf',
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="'.($consentType->pdf_original_name ?? 'consent.pdf').'"',
            ]
        );
    }
}
