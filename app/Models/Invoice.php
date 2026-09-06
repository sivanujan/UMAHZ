<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A patient-billing invoice: the CLINIC billing a CLIENT. Money is stored in
 * integer minor units (spec §15) — never floats. Numbering is sequential and
 * unique PER TENANT. Posted (open/paid) invoices are never deleted; a void
 * keeps its reason. Strictly tenant-scoped via BelongsToTenant.
 *
 * This is separate from the clinic -> UMAHZ platform subscription (Cashier).
 */
class Invoice extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_OPEN = 'open';

    public const STATUS_PAID = 'paid';

    public const STATUS_VOID = 'void';

    protected $fillable = [
        'tenant_id',
        'client_id',
        'appointment_id',
        'invoice_number',
        'status',
        'currency',
        'subtotal_amount',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'amount_paid',
        'notes',
        'due_date',
        'issued_at',
        'paid_at',
        'voided_at',
        'void_reason',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'invoice_number' => 'integer',
            'subtotal_amount' => 'integer',
            'tax_amount' => 'integer',
            'discount_amount' => 'integer',
            'total_amount' => 'integer',
            'amount_paid' => 'integer',
            'due_date' => 'date',
            'issued_at' => 'datetime',
            'paid_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(InvoiceLineItem::class)->orderBy('sort_order');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    public function isVoid(): bool
    {
        return $this->status === self::STATUS_VOID;
    }

    /** Whether a payment can still be taken against this invoice. */
    public function isPayable(): bool
    {
        return in_array($this->status, [self::STATUS_OPEN], true)
            && $this->amountDue() > 0;
    }

    /** Outstanding balance in minor units. */
    public function amountDue(): int
    {
        return max(0, (int) $this->total_amount - (int) $this->amount_paid);
    }

    /** Formatted, human-facing invoice number, e.g. "INV-000042". */
    public function reference(): string
    {
        return 'INV-'.str_pad((string) $this->invoice_number, 6, '0', STR_PAD_LEFT);
    }
}
