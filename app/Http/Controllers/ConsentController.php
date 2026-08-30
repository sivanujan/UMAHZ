<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\Consent;
use App\Models\ConsentType;
use App\Scopes\TenantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ConsentController extends Controller
{
    /**
     * Capture and store a signed consent for a client.
     */
    public function store(Request $request, Client $client): RedirectResponse
    {
        $this->authorizeClient($client);
        Gate::authorize('create', Consent::class);

        $tenantId = TenantScope::getTenantId();

        $data = $request->validate([
            'consent_type_id' => [
                'required',
                Rule::exists('consent_types', 'id')->where('tenant_id', $tenantId)->where('is_active', true),
            ],
            'signer_name' => ['required', 'string', 'max:255'],
            'signature_type' => ['required', Rule::in(['draw', 'typed'])],
            'signature_data' => ['required', 'string'],
        ]);

        $consentType = ConsentType::where('tenant_id', $tenantId)
            ->findOrFail($data['consent_type_id']);

        if (! $consentType->isConfigured()) {
            $msg = $consentType->isPdfSource()
                ? 'This consent type requires an uploaded consent PDF document. A clinic administrator must upload the agreement PDF under Settings before it can be signed.'
                : 'This consent type does not have consent text configured. A clinic administrator must enter the consent agreement text before it can be signed.';

            throw ValidationException::withMessages([
                'consent_type_id' => $msg,
            ]);
        }

        if ($consentType->isPdfSource() && (! $consentType->pdf_path || ! Storage::disk('local')->exists($consentType->pdf_path))) {
            throw ValidationException::withMessages([
                'consent_type_id' => 'The uploaded agreement PDF file could not be found on storage. Please re-upload it under Settings.',
            ]);
        }

        $consent = DB::transaction(function () use ($request, $client, $consentType, $data, $tenantId) {
            $signedPdfPath = null;
            $signedPdfOriginalName = null;
            $signedPdfFileSize = null;

            if ($consentType->isPdfSource()) {
                $ext = pathinfo($consentType->pdf_path, PATHINFO_EXTENSION) ?: 'pdf';
                $signedPdfPath = "consents/signed/{$tenantId}/".Str::uuid().".{$ext}";
                Storage::disk('local')->copy($consentType->pdf_path, $signedPdfPath);
                $signedPdfOriginalName = $consentType->pdf_original_name;
                $signedPdfFileSize = $consentType->pdf_file_size;
            }

            $consentBody = $consentType->isPdfSource()
                ? "[PDF Agreement: {$consentType->pdf_original_name} (v{$consentType->version})]"
                : $consentType->body;

            $consent = Consent::create([
                'tenant_id' => $tenantId,
                'client_id' => $client->id,
                'consent_type_id' => $consentType->id,
                'consent_type_name' => $consentType->name,
                'agreement_source' => $consentType->agreement_source ?? ConsentType::SOURCE_TEXT,
                'consent_body' => $consentBody, // Immutable snapshot
                'signed_pdf_path' => $signedPdfPath, // Immutable PDF snapshot
                'signed_pdf_original_name' => $signedPdfOriginalName,
                'signed_pdf_file_size' => $signedPdfFileSize,
                'consent_version' => $consentType->version ?? 1,
                'signer_name' => trim($data['signer_name']),
                'signature_type' => $data['signature_type'],
                'signature_data' => $data['signature_data'],
                'witnessed_by_user_id' => $request->user()->id,
                'agreed_at' => now(),
                'status' => Consent::STATUS_ACTIVE,
                'ip_address' => $request->ip(),
            ]);

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()->id,
                'action' => 'consent.recorded',
                'resource_type' => Consent::class,
                'resource_id' => $consent->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'client_id' => $client->id,
                    'consent_type' => $consentType->name,
                    'agreement_source' => $consent->agreement_source,
                    'consent_version' => $consent->consent_version,
                    'has_signed_pdf' => (bool) $consent->signed_pdf_path,
                    'signature_type' => $data['signature_type'],
                ],
            ]);

            return $consent;
        });

        return back()->with('success', "Consent \"{$consentType->name}\" recorded for {$client->full_name}.");
    }

    /**
     * Retrieve signed consent document details (audits view access).
     */
    public function show(Request $request, Consent $consent): JsonResponse
    {
        $this->authorizeConsent($consent);
        Gate::authorize('view', $consent);

        AuditEvent::create([
            'tenant_id' => TenantScope::getTenantId(),
            'user_id' => $request->user()->id,
            'action' => 'consent.viewed',
            'resource_type' => Consent::class,
            'resource_id' => $consent->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'client_id' => $consent->client_id,
            ],
        ]);

        $consent->loadMissing(['witnessedBy', 'withdrawnBy', 'client']);

        return response()->json([
            'consent' => [
                'id' => $consent->id,
                'client_name' => $consent->client?->full_name,
                'consent_type_name' => $consent->consent_type_name,
                'agreement_source' => $consent->agreement_source ?? Consent::SOURCE_TEXT,
                'consent_body' => $consent->consent_body,
                'signed_pdf_path' => $consent->signed_pdf_path,
                'signed_pdf_original_name' => $consent->signed_pdf_original_name,
                'signed_pdf_file_size' => $consent->signed_pdf_file_size,
                'consent_version' => $consent->consent_version ?? 1,
                'pdf_url' => $consent->signed_pdf_path ? url("/app/consents/{$consent->id}/document") : null,
                'signer_name' => $consent->signer_name,
                'signature_type' => $consent->signature_type,
                'signature_data' => $consent->signature_data,
                'agreed_at' => $consent->agreed_at->toIso8601String(),
                'witnessed_by' => $consent->witnessedBy?->name ?? 'Staff User',
                'status' => $consent->status,
                'withdrawn_at' => $consent->withdrawn_at?->toIso8601String(),
                'withdrawn_by' => $consent->withdrawnBy?->name,
                'withdrawal_reason' => $consent->withdrawal_reason,
            ],
        ]);
    }

    /**
     * Securely stream the immutable signed consent PDF to authorized staff/client.
     */
    public function document(Request $request, Consent $consent): StreamedResponse
    {
        $this->authorizeConsent($consent);
        Gate::authorize('view', $consent);

        abort_unless($consent->signed_pdf_path && Storage::disk('local')->exists($consent->signed_pdf_path), 404);

        AuditEvent::create([
            'tenant_id' => TenantScope::getTenantId(),
            'user_id' => $request->user()->id,
            'action' => 'consent.document_viewed',
            'resource_type' => Consent::class,
            'resource_id' => $consent->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'client_id' => $consent->client_id,
            ],
        ]);

        return Storage::disk('local')->response(
            $consent->signed_pdf_path,
            $consent->signed_pdf_original_name ?? 'signed_consent.pdf',
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="'.($consent->signed_pdf_original_name ?? 'signed_consent.pdf').'"',
            ]
        );
    }

    /**
     * Mark an existing consent as withdrawn.
     */
    public function withdraw(Request $request, Consent $consent): RedirectResponse
    {
        $this->authorizeConsent($consent);
        Gate::authorize('withdraw', $consent);

        if ($consent->status === Consent::STATUS_WITHDRAWN) {
            return back()->with('error', 'This consent has already been withdrawn.');
        }

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($request, $consent, $data) {
            $consent->update([
                'status' => Consent::STATUS_WITHDRAWN,
                'withdrawn_at' => now(),
                'withdrawn_by_user_id' => $request->user()->id,
                'withdrawal_reason' => trim($data['reason']),
            ]);

            AuditEvent::create([
                'tenant_id' => TenantScope::getTenantId(),
                'user_id' => $request->user()->id,
                'action' => 'consent.withdrawn',
                'resource_type' => Consent::class,
                'resource_id' => $consent->id,
                'ip_address' => $request->ip(),
                'reason' => trim($data['reason']),
                'metadata' => [
                    'client_id' => $consent->client_id,
                ],
            ]);
        });

        return back()->with('success', 'Consent has been marked as withdrawn.');
    }

    private function authorizeClient(Client $client): void
    {
        abort_unless($client->tenant_id === TenantScope::getTenantId(), 404);
    }

    private function authorizeConsent(Consent $consent): void
    {
        abort_unless($consent->tenant_id === TenantScope::getTenantId(), 404);
    }
}
