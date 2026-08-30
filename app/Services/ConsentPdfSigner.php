<?php

namespace App\Services;

use App\Models\Consent;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

class ConsentPdfSigner
{
    /**
     * Append an official signature & execution certificate page to the signed consent PDF.
     */
    public static function sign(Consent $consent, ?string $sourcePdfPath = null, ?string $destinationPdfPath = null): bool
    {
        if (! $consent->isPdfSource() || ! $consent->signed_pdf_path) {
            return false;
        }

        $sourceFile = $sourcePdfPath ?? Storage::disk('local')->path($consent->signed_pdf_path);
        $destFile = $destinationPdfPath ?? Storage::disk('local')->path($consent->signed_pdf_path);

        if (! file_exists($sourceFile)) {
            Log::warning("ConsentPdfSigner: Source file not found at {$sourceFile}");
            return false;
        }

        $clinicName = $consent->tenant?->name ?? 'Clinical Practice';
        $witnessName = $consent->witnessedBy?->name ?? 'Clinical Staff';

        $payload = [
            'templatePdfPath' => $sourceFile,
            'outputPdfPath' => $destFile,
            'clinicName' => $clinicName,
            'consentTypeName' => $consent->consent_type_name,
            'signerName' => $consent->signer_name,
            'signatureType' => $consent->signature_type,
            'signatureData' => $consent->signature_data,
            'agreedAt' => $consent->agreed_at ? $consent->agreed_at->toIso8601String() : now()->toIso8601String(),
            'witnessedBy' => $witnessName,
            'consentId' => $consent->id,
            'originalFileName' => $consent->signed_pdf_original_name ?? 'Consent Document.pdf',
            'version' => $consent->consent_version ?? 1,
        ];

        $scriptPath = base_path('scripts/sign-consent-pdf.cjs');
        if (! file_exists($scriptPath)) {
            Log::error("ConsentPdfSigner: Script not found at {$scriptPath}");
            return false;
        }

        try {
            $nodeBinary = file_exists('C:\\Program Files\\nodejs\\node.exe')
                ? 'C:\\Program Files\\nodejs\\node.exe'
                : 'node';

            $systemRoot = getenv('SystemRoot') ?: (getenv('windir') ?: 'C:\\Windows');
            $env = [
                'SystemRoot' => $systemRoot,
                'WINDIR' => $systemRoot,
                'windir' => $systemRoot,
                'PATH' => getenv('PATH') ?: ('C:\\Program Files\\nodejs;' . $systemRoot . '\\system32;' . $systemRoot),
                'TEMP' => sys_get_temp_dir(),
                'TMP' => sys_get_temp_dir(),
            ];

            $process = new Process([$nodeBinary, $scriptPath], base_path(), $env);
            $process->setInput(json_encode($payload));
            $process->setTimeout(30);
            $process->run();

            if (! $process->isSuccessful()) {
                Log::error('ConsentPdfSigner failed: ' . $process->getErrorOutput());
                return false;
            }

            if (file_exists($destFile)) {
                $newSize = filesize($destFile);
                if ($consent->signed_pdf_file_size !== $newSize) {
                    $consent->forceFill(['signed_pdf_file_size' => $newSize])->saveQuietly();
                }
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('ConsentPdfSigner exception: ' . $e->getMessage());
            return false;
        }
    }
}
