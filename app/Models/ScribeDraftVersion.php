<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Historical record of a specific Scribe AI draft generation version.
 * Supports version switching, soft-discarding, and selective handoff.
 */
class ScribeDraftVersion extends Model
{
    use BelongsToTenant, HasUuids;

    protected $fillable = [
        'tenant_id',
        'scribe_session_id',
        'version',
        'clinical_note_template_id',
        'template_name',
        'template_snapshot',
        'draft_status',
        'generated_at',
        'discarded_at',
        'discarded_by',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'template_snapshot' => 'array',
            'generated_at' => 'datetime',
            'discarded_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ScribeSession::class, 'scribe_session_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ClinicalNoteTemplate::class, 'clinical_note_template_id');
    }

    public function discardedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'discarded_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ScribeDraftItem::class, 'scribe_session_id', 'scribe_session_id')
            ->where('draft_version', $this->version)
            ->orderBy('position');
    }

    public function isDiscarded(): bool
    {
        return $this->discarded_at !== null;
    }
}

