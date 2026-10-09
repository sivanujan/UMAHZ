<?php

namespace App\Console\Commands;

use App\Models\AuditEvent;
use App\Models\PlatformSetting;
use App\Models\PractitionerProfile;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PurgeRejectedDocumentsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'clinics:purge-rejected-documents';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Purge uploaded documents for permanently rejected and max-attempt rejected clinic applications after retention period';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $retentionDays = (int) PlatformSetting::get('clinic_rejected_document_retention_days', 90);
        $threshold = now()->subDays($retentionDays);

        $tenants = Tenant::query()
            ->whereIn('status', [Tenant::STATUS_REJECTED, Tenant::STATUS_PERMANENTLY_REJECTED])
            ->whereNull('documents_purged_at')
            ->where(function ($q) use ($threshold) {
                $q->where('rejected_at', '<=', $threshold)
                  ->orWhere(function ($q2) use ($threshold) {
                      $q2->whereNull('rejected_at')
                         ->where('reviewed_at', '<=', $threshold);
                  });
            })
            ->where(function ($q) {
                $q->where('is_permanently_rejected', true)
                  ->orWhere('reapply_count', '>=', (int) PlatformSetting::get('clinic_max_reapply_attempts', 3));
            })
            ->get();

        $count = 0;

        foreach ($tenants as $tenant) {
            $profiles = PractitionerProfile::whereHas('staffMembership', fn ($q) => $q->where('tenant_id', $tenant->id))
                ->whereNotNull('license_document_path')
                ->get();

            $purgedFiles = [];

            foreach ($profiles as $profile) {
                if ($profile->license_document_path) {
                    Storage::disk('local')->delete($profile->license_document_path);
                    $purgedFiles[] = $profile->license_document_original_name ?: $profile->license_document_path;

                    $profile->update([
                        'license_document_path' => null,
                        'license_document_original_name' => null,
                        'license_document_mime' => null,
                    ]);
                }
            }

            $tenant->update([
                'documents_purged_at' => now(),
            ]);

            AuditEvent::create([
                'tenant_id' => $tenant->id,
                'action' => 'clinic.documents_purged',
                'resource_type' => Tenant::class,
                'resource_id' => $tenant->id,
                'reason' => "Uploaded documents purged following {$retentionDays}-day retention policy for closed/rejected applications.",
                'metadata' => [
                    'purged_files_count' => count($purgedFiles),
                    'retention_days' => $retentionDays,
                ],
            ]);

            $count++;
        }

        $this->info("Purged documents for {$count} rejected clinic application(s).");

        return self::SUCCESS;
    }
}
