<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PractitionerProfile extends Model
{
    use HasFactory, HasUuids;

    public const PROFESSION_MASSAGE_THERAPY = 'massage_therapy';
    public const PROFESSION_ACUPUNCTURE_TCM = 'acupuncture_tcm';
    public const PROFESSION_PERSONAL_TRAINING = 'personal_training';
    public const PROFESSION_NUTRITION = 'nutrition';
    public const PROFESSION_COLON_HYDROTHERAPY = 'colon_hydrotherapy';

    public const VERIFICATION_PENDING = 'pending';
    public const VERIFICATION_VERIFIED = 'verified';
    public const VERIFICATION_REJECTED = 'rejected';

    protected $fillable = [
        'staff_membership_id',
        'profession',
        'credentials',
        'registration_number',
        'biography',
        'photo_url',
        'calendar_color',
        'verification_status',
        'license_number',
        'licensing_body',
        'license_document_path',
        'license_document_original_name',
        'license_document_mime',
        'is_primary_contact',
        'reviewed_at',
        'reviewed_by',
        'review_note',
    ];

    protected function casts(): array
    {
        return [
            'is_primary_contact' => 'boolean',
            'reviewed_at' => 'datetime',
        ];
    }

    public function staffMembership(): BelongsTo
    {
        return $this->belongsTo(StaffMembership::class);
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopePendingVerification(Builder $query): Builder
    {
        return $query->where('verification_status', self::VERIFICATION_PENDING);
    }
}
