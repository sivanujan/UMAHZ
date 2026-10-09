<?php

namespace App\Console\Commands;

use App\Models\AuditEvent;
use App\Models\PlatformSetting;
use App\Models\Tenant;
use Illuminate\Console\Command;

class ReleaseRejectedSubdomainsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'clinics:release-subdomains';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Release held subdomains for rejected clinics after the configured hold window has expired';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $holdDays = (int) PlatformSetting::get('clinic_subdomain_hold_days', 30);
        $threshold = now()->subDays($holdDays);

        $tenants = Tenant::query()
            ->whereIn('status', [Tenant::STATUS_REJECTED, Tenant::STATUS_PERMANENTLY_REJECTED])
            ->whereNotNull('subdomain')
            ->whereNull('subdomain_released_at')
            ->where(function ($q) use ($threshold) {
                $q->where('rejected_at', '<=', $threshold)
                  ->orWhere(function ($q2) use ($threshold) {
                      $q2->whereNull('rejected_at')
                         ->where('reviewed_at', '<=', $threshold);
                  });
            })
            ->get();

        $count = 0;

        foreach ($tenants as $tenant) {
            $releasedSubdomain = $tenant->subdomain;

            $tenant->update([
                'subdomain' => null,
                'subdomain_released_at' => now(),
            ]);

            AuditEvent::create([
                'tenant_id' => $tenant->id,
                'action' => 'clinic.subdomain_released',
                'resource_type' => Tenant::class,
                'resource_id' => $tenant->id,
                'reason' => "Subdomain '{$releasedSubdomain}' released after {$holdDays}-day rejection hold window.",
                'metadata' => [
                    'released_subdomain' => $releasedSubdomain,
                    'hold_days' => $holdDays,
                ],
            ]);

            $count++;
        }

        $this->info("Released {$count} expired clinic subdomain(s).");

        return self::SUCCESS;
    }
}
