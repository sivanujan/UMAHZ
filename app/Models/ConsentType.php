<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConsentType extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const CODE_GENERAL_TREATMENT = 'general_treatment';

    public const CODE_SENSITIVE_AREA = 'sensitive_area';

    public const SOURCE_TEXT = 'text';

    public const SOURCE_PDF = 'pdf';

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'description',
        'agreement_source',
        'body',
        'pdf_path',
        'pdf_original_name',
        'pdf_file_size',
        'version',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'version' => 'integer',
            'pdf_file_size' => 'integer',
        ];
    }

    public function isPdfSource(): bool
    {
        return $this->agreement_source === self::SOURCE_PDF;
    }

    public function isTextSource(): bool
    {
        return $this->agreement_source !== self::SOURCE_PDF;
    }

    public function isConfigured(): bool
    {
        if ($this->isPdfSource()) {
            return ! empty($this->pdf_path);
        }

        return ! empty(trim((string) $this->body));
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function consents(): HasMany
    {
        return $this->hasMany(Consent::class);
    }

    /**
     * Ensure the baseline data-driven consent types exist for a given tenant,
     * without fabricating legal wording (body defaults to null until clinic provides it).
     */
    public static function ensureDefaultsForTenant(string $tenantId): void
    {
        $defaults = [
            [
                'code' => self::CODE_GENERAL_TREATMENT,
                'name' => 'General Treatment Consent',
                'description' => 'Standard client agreement for therapy and care assessment.',
            ],
            [
                'code' => self::CODE_SENSITIVE_AREA,
                'name' => 'Sensitive-Area Consent',
                'description' => 'Specific consent required prior to treating sensitive anatomical areas.',
            ],
        ];

        foreach ($defaults as $def) {
            static::firstOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'code' => $def['code'],
                ],
                [
                    'name' => $def['name'],
                    'description' => $def['description'],
                    'body' => null, // Placeholder: Must be supplied by clinic administration
                    'is_active' => true,
                ]
            );
        }
    }
}
