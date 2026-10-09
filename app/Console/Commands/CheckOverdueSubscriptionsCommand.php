<?php

namespace App\Console\Commands;

use App\Models\AuditEvent;
use App\Models\PlatformSetting;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckOverdueSubscriptionsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'billing:check-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Transition past_due clinic subscriptions to restricted_overdue once their grace period expires.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $graceDays = (int) PlatformSetting::get('billing.past_due_grace_days', 14);
        $threshold = Carbon::now()->subDays($graceDays);

        $this->info("Checking past_due subscriptions older than {$graceDays} days (before {$threshold->toIso8601String()})...");

        $tenants = Tenant::withoutGlobalScopes()
            ->where('subscription_status', Tenant::SUBSCRIPTION_PAST_DUE)
            ->get();

        $count = 0;
        foreach ($tenants as $tenant) {
            $failedAt = $tenant->payment_failed_at ?? $tenant->updated_at;

            if ($failedAt && Carbon::parse($failedAt)->lte($threshold)) {
                $tenant->subscription_status = Tenant::SUBSCRIPTION_RESTRICTED_OVERDUE;
                $tenant->save();

                $count++;
                $this->warn("Clinic [{$tenant->slug}] (ID: {$tenant->id}) moved to restricted_overdue (payment failed at {$failedAt}).");

                Log::info("Tenant {$tenant->slug} transitioned to restricted_overdue after {$graceDays} day grace period.");

                try {
                    AuditEvent::create([
                        'tenant_id' => $tenant->id,
                        'user_id' => null,
                        'action' => 'subscription.restricted_overdue',
                        'resource_type' => Tenant::class,
                        'resource_id' => $tenant->id,
                        'reason' => "Grace period of {$graceDays} days expired without successful payment.",
                        'metadata' => [
                            'payment_failed_at' => $failedAt,
                            'grace_days' => $graceDays,
                        ],
                    ]);
                } catch (\Throwable $e) {
                    // Ignore audit failures during scheduled run
                }
            }
        }

        $this->info("Completed check. {$count} clinic(s) transitioned to restricted_overdue.");

        return Command::SUCCESS;
    }
}
