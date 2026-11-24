<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AssessmentTest extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_REVIEWED = 'reviewed';
    public const STATUS_ARCHIVED = 'archived';

    public const BODY_REGIONS = [
        'shoulder' => 'Shoulder',
        'elbow' => 'Elbow',
        'wrist_hand' => 'Wrist & Hand',
        'cervical' => 'Cervical Spine',
        'thoracic' => 'Thoracic Spine',
        'lumbar' => 'Lumbar Spine',
        'hip' => 'Hip & Pelvis',
        'knee' => 'Knee',
        'ankle_foot' => 'Ankle & Foot',
        'other' => 'Other / General',
    ];

    public const DISCIPLINES = [
        'physio' => 'Physiotherapy',
        'massage' => 'Massage Therapy',
        'chiro' => 'Chiropractic',
        'personal_training' => 'Personal Training',
        'acupuncture' => 'Acupuncture',
        'other' => 'Other',
    ];

    /**
     * Return body regions as a 0-indexed list of ['value' => ..., 'label' => ...]
     *
     * @return array<int, array{value: string, label: string}>
     */
    public static function bodyRegionsList(): array
    {
        return array_values(array_map(
            fn ($value, $label) => ['value' => $value, 'label' => $label],
            array_keys(self::BODY_REGIONS),
            self::BODY_REGIONS
        ));
    }

    /**
     * Return disciplines as a 0-indexed list of ['value' => ..., 'label' => ...]
     *
     * @return array<int, array{value: string, label: string}>
     */
    public static function disciplinesList(): array
    {
        return array_values(array_map(
            fn ($value, $label) => ['value' => $value, 'label' => $label],
            array_keys(self::DISCIPLINES),
            self::DISCIPLINES
        ));
    }

    protected $fillable = [
        'tenant_id',
        'body_region',
        'name',
        'aliases',
        'purpose',
        'procedure',
        'positive_finding',
        'interpretation_notes',
        'disciplines',
        'image_path',
        'video_url',
        'references',
        'status',
        'reviewed_by',
        'reviewer_name',
        'reviewer_credential',
        'reviewed_at',
        'sort_order',
    ];

    protected $appends = [
        'reviewer_display',
    ];

    public function getReviewerDisplayAttribute(): ?string
    {
        if (! empty($this->reviewer_name)) {
            return ! empty($this->reviewer_credential)
                ? "{$this->reviewer_name}, {$this->reviewer_credential}"
                : $this->reviewer_name;
        }

        if ($this->relationLoaded('reviewer') && $this->reviewer) {
            return ! empty($this->reviewer_credential)
                ? "{$this->reviewer->name}, {$this->reviewer_credential}"
                : $this->reviewer->name;
        }

        return null;
    }

    protected function casts(): array
    {
        return [
            'aliases' => 'array',
            'disciplines' => 'array',
            'reviewed_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function testResults(): HasMany
    {
        return $this->hasMany(ClinicalNoteTestResult::class);
    }

    public function isPlatform(): bool
    {
        return is_null($this->tenant_id);
    }

    public function isReviewed(): bool
    {
        return $this->status === self::STATUS_REVIEWED;
    }

    public function bodyRegionLabel(): string
    {
        return self::BODY_REGIONS[$this->body_region] ?? ucfirst($this->body_region);
    }

    /**
     * Scope to platform tests only.
     */
    public function scopePlatform(Builder $query): Builder
    {
        return $query->whereNull('tenant_id');
    }

    /**
     * Scope to tests visible to a clinic/practitioner:
     * Reviewed platform tests + active tests owned by the clinic.
     */
    public function scopeVisibleToPractitioner(Builder $query, ?string $tenantId): Builder
    {
        return $query->where(function (Builder $q) use ($tenantId) {
            $q->where(function (Builder $platformQ) {
                $platformQ->whereNull('tenant_id')
                    ->where('status', self::STATUS_REVIEWED);
            });

            if ($tenantId) {
                $q->orWhere(function (Builder $tenantQ) use ($tenantId) {
                    $tenantQ->where('tenant_id', $tenantId)
                        ->where('status', '!=', self::STATUS_ARCHIVED);
                });
            }
        });
    }

    /**
     * Scope to reviewed tests.
     */
    public function scopeReviewed(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_REVIEWED);
    }
}
