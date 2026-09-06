<?php

namespace App\PatientBilling;

use Illuminate\Support\Facades\DB;

/**
 * Allocates sequential, gap-free invoice numbers PER TENANT (spec §15).
 *
 * A dedicated per-tenant counter row is locked (SELECT ... FOR UPDATE) so that
 * concurrent invoice creation can never hand out a duplicate or skip a number.
 * Must run inside a DB transaction (the caller's write transaction is fine).
 */
class InvoiceNumberAllocator
{
    public static function next(string $tenantId): int
    {
        // Ensure the counter row exists without racing (unique PK on tenant_id).
        DB::table('tenant_invoice_sequences')->insertOrIgnore([
            'tenant_id' => $tenantId,
            'next_number' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Lock the row for the remainder of the transaction.
        $row = DB::table('tenant_invoice_sequences')
            ->where('tenant_id', $tenantId)
            ->lockForUpdate()
            ->first();

        $number = (int) $row->next_number;

        DB::table('tenant_invoice_sequences')
            ->where('tenant_id', $tenantId)
            ->update([
                'next_number' => $number + 1,
                'updated_at' => now(),
            ]);

        return $number;
    }
}
