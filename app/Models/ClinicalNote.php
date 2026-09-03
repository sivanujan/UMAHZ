<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClinicalNote extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_FINALIZED = 'finalized';
    public const STATUS_ADDENDED = 'addended';

    protected $fillable = [
        'tenant_id',
        'client_id',
        'staff_membership_id',
        'appointment_id',
        'clinical_note_template_id',
        'discipline',
        'template_name',
        'template_version',
        'schema_snapshot',
        'content',
        'status',
        'signer_name',
        'signer_credentials',
        'attestation_text',
        'signed_at',
        'finalized_at',
        'finalized_by_user_id',
        'pdf_path',
    ];

    protected function casts(): array
    {
        return [
            'schema_snapshot' => 'array',
            'content' => 'array',
            'template_version' => 'integer',
            'signed_at' => 'datetime',
            'finalized_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function staffMembership(): BelongsTo
    {
        return $this->belongsTo(StaffMembership::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ClinicalNoteTemplate::class, 'clinical_note_template_id');
    }

    public function finalizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by_user_id');
    }

    public function addenda(): HasMany
    {
        return $this->hasMany(ClinicalNoteAddendum::class)->orderBy('signed_at', 'asc');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isFinalized(): bool
    {
        return $this->status === self::STATUS_FINALIZED;
    }

    public function isAddended(): bool
    {
        return $this->status === self::STATUS_ADDENDED;
    }

    public function isImmutable(): bool
    {
        return ! $this->isDraft();
    }
}
