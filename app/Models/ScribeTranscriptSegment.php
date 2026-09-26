<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Machine transcription of one audio chunk. Provenance is fixed to
 * "ai_transcription": it is what the provider heard, not a clinical finding,
 * and it is never merged with practitioner-entered or objective data.
 */
class ScribeTranscriptSegment extends Model
{
    use BelongsToTenant, HasUuids;

    public const SOURCE_AI_TRANSCRIPTION = 'ai_transcription';

    protected $fillable = [
        'tenant_id',
        'scribe_session_id',
        'scribe_audio_chunk_id',
        'sequence',
        'text',
        'start_ms',
        'end_ms',
        'source',
        'speaker_role',
        'provider',
        'provider_model',
        'language',
    ];

    protected function casts(): array
    {
        return [
            'text' => 'encrypted',
            'sequence' => 'integer',
            'start_ms' => 'integer',
            'end_ms' => 'integer',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ScribeSession::class, 'scribe_session_id');
    }
}
