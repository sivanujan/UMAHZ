<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\Consent;
use App\Models\ConsentType;
use App\Scopes\TenantScope;
use App\Services\ConsentPdfSigner;
use App\Services\ConsentRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
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

        app(ConsentRecorder::class)->record($client, $consentType, $data, $request->user(), $request->ip());

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
    public function document(Request $request, Consent $consent): \Symfony\Component\HttpFoundation\Response
    {
        $this->authorizeConsent($consent);
        Gate::authorize('view', $consent);

        abort_unless($consent->signed_pdf_path && Storage::disk('local')->exists($consent->signed_pdf_path), 404);

        if ($consent->isPdfSource()) {
            ConsentPdfSigner::sign($consent);
        }

        $fullPath = Storage::disk('local')->path($consent->signed_pdf_path);

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

        return response()->file(
            $fullPath,
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

        app(ConsentRecorder::class)->withdraw($consent, $request->user(), $data['reason'], $request->ip());

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
