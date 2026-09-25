<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\Consent;
use App\Models\ConsentType;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Single path for capturing a signed, immutable Consent — used by the client
 * profile and by AI Scribe (which scopes the consent to one appointment).
 */
class ConsentRecorder
{
    /**
     * @param  array{signer_name: string, signature_type: string, signature_data: string}  $data
     */
    public function record(
        Client $client,
        ConsentType $consentType,
        array $data,
        User $witness,
        ?string $ipAddress,
        ?string $appointmentId = null,
    ): Consent {
        $this->assertConfigured($consentType);

        $tenantId = $client->tenant_id;

        $consent = DB::transaction(function () use ($client, $consentType, $data, $witness, $ipAddress, $appointmentId, $tenantId) {
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
                'appointment_id' => $appointmentId,
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
                'witnessed_by_user_id' => $witness->id,
                'agreed_at' => now(),
                'status' => Consent::STATUS_ACTIVE,
                'ip_address' => $ipAddress,
            ]);

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $witness->id,
                'action' => 'consent.recorded',
                'resource_type' => Consent::class,
                'resource_id' => $consent->id,
                'ip_address' => $ipAddress,
                'metadata' => [
                    'client_id' => $client->id,
                    'appointment_id' => $appointmentId,
                    'consent_type' => $consentType->name,
                    'agreement_source' => $consent->agreement_source,
                    'consent_version' => $consent->consent_version,
                    'has_signed_pdf' => (bool) $consent->signed_pdf_path,
                    'signature_type' => $data['signature_type'],
                ],
            ]);

            return $consent;
        });

        if ($consent->isPdfSource() && $consent->signed_pdf_path) {
            ConsentPdfSigner::sign($consent);
        }

        return $consent;
    }

    /**
     * Mark a consent withdrawn (consents are never edited or deleted).
     */
    public function withdraw(Consent $consent, User $user, string $reason, ?string $ipAddress): void
    {
        DB::transaction(function () use ($consent, $user, $reason, $ipAddress) {
            $consent->update([
                'status' => Consent::STATUS_WITHDRAWN,
                'withdrawn_at' => now(),
                'withdrawn_by_user_id' => $user->id,
                'withdrawal_reason' => trim($reason),
            ]);

            AuditEvent::create([
                'tenant_id' => $consent->tenant_id,
                'user_id' => $user->id,
                'action' => 'consent.withdrawn',
                'resource_type' => Consent::class,
                'resource_id' => $consent->id,
                'ip_address' => $ipAddress,
                'reason' => trim($reason),
                'metadata' => [
                    'client_id' => $consent->client_id,
                ],
            ]);
        });
    }

    private function assertConfigured(ConsentType $consentType): void
    {
        if (! $consentType->isConfigured()) {
            $msg = $consentType->isPdfSource()
                ? 'This consent type requires an uploaded consent PDF document. A clinic administrator must upload the agreement PDF under Settings before it can be signed.'
                : 'This consent type does not have consent text configured. A clinic administrator must enter the consent agreement text before it can be signed.';

            throw ValidationException::withMessages(['consent_type_id' => $msg]);
        }

        if ($consentType->isPdfSource() && (! $consentType->pdf_path || ! Storage::disk('local')->exists($consentType->pdf_path))) {
            throw ValidationException::withMessages([
                'consent_type_id' => 'The uploaded agreement PDF file could not be found on storage. Please re-upload it under Settings.',
            ]);
        }
    }
}
