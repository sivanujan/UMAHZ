<?php

namespace App\Console\Commands;

use App\Billing\PlatformBilling;
use App\Models\PendingRegistration;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Delete abandoned clinic registrations whose card was never saved. This
 * releases the reserved subdomain, removes the temporary license upload, and
 * discards the orphan Stripe customer — so an abandoned attempt leaves no junk
 * record, no held subdomain, and nothing billable.
 */
class PruneExpiredRegistrations extends Command
{
    protected $signature = 'registrations:prune-expired';

    protected $description = 'Delete expired pending clinic registrations and release their subdomain reservations.';

    public function handle(PlatformBilling $billing): int
    {
        $count = 0;

        PendingRegistration::query()->expired()->chunkById(100, function ($rows) use (&$count, $billing) {
            foreach ($rows as $pending) {
                if ($pending->license_document_path) {
                    Storage::disk('local')->delete($pending->license_document_path);
                }

                // The card was never charged; drop the orphan customer + card.
                if ($pending->stripe_customer_id) {
                    $billing->discardPaymentMethod($pending->stripe_customer_id, $pending->stripe_payment_method_id);
                }

                $pending->delete();
                $count++;
            }
        });

        $this->info("Pruned {$count} expired pending registration(s).");

        return self::SUCCESS;
    }
}
