<?php

namespace App\Console\Commands;

use App\Models\Consent;
use App\Services\ConsentPdfSigner;
use Illuminate\Console\Command;

class SignExistingConsents extends Command
{
    protected $signature = 'app:sign-existing-consents';
    protected $description = 'Ensure all signed PDF consents have their official signature certificate page attached';

    public function handle(): int
    {
        $consents = Consent::where('agreement_source', 'pdf')->whereNotNull('signed_pdf_path')->get();
        $this->info("Found {$consents->count()} PDF consents.");

        foreach ($consents as $consent) {
            $success = ConsentPdfSigner::sign($consent);
            $this->line("Consent {$consent->id} ({$consent->signer_name}): " . ($success ? 'SUCCESS' : 'FAILED'));
        }

        return 0;
    }
}
