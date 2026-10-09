<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ScribeLanguage extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_BETA = 'beta';

    public const STATUS_HIDDEN = 'hidden';

    protected $fillable = [
        'code',
        'label',
        'native_name',
        'provider',
        'provider_code',
        'supports_transcription',
        'supports_note_output',
        'status',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'supports_transcription' => 'boolean',
            'supports_note_output' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function isBeta(): bool
    {
        return $this->status === self::STATUS_BETA;
    }

    public function isVisible(): bool
    {
        return in_array($this->status, [self::STATUS_ACTIVE, self::STATUS_BETA], true);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_ACTIVE, self::STATUS_BETA]);
    }

    public function scopeForEncounter(Builder $query): Builder
    {
        return $query->visible()->where('supports_transcription', true)->orderBy('sort_order')->orderBy('label');
    }

    public function scopeForNoteOutput(Builder $query): Builder
    {
        return $query->visible()->where('supports_note_output', true)->orderBy('sort_order')->orderBy('label');
    }
}
