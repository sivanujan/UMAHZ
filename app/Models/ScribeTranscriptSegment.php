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
    public const SOURCE_AI_STREAMING = 'ai_streaming';

    protected $fillable = [
        'tenant_id',
        'scribe_session_id',
        'scribe_audio_chunk_id',
        'sequence',
        'text',
        'translated_text',
        'start_ms',
        'end_ms',
        'source',
        'speaker_role',
        'provider',
        'provider_model',
        'language',
        'detected_language',
        'translation_status',
    ];

    protected function casts(): array
    {
        return [
            'text' => 'encrypted',
            'translated_text' => 'encrypted',
            'sequence' => 'integer',
            'start_ms' => 'integer',
            'end_ms' => 'integer',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ScribeSession::class, 'scribe_session_id');
    }

    /**
     * Deduplicate segments that come from both the realtime stream and chunk fallback.
     * Uses turn ID or normalized text + overlapping time range.
     *
     * @param  \Illuminate\Support\Collection<int, ScribeTranscriptSegment>  $segments
     * @return \Illuminate\Support\Collection<int, ScribeTranscriptSegment>
     */
    public static function deduplicateSegments(\Illuminate\Support\Collection $segments): \Illuminate\Support\Collection
    {
        $sorted = $segments->sortBy([
            ['start_ms', 'asc'],
            ['sequence', 'asc'],
        ])->values();

        $deduped = collect();

        foreach ($sorted as $segment) {
            $normalizedCurrent = self::normalizeText($segment->text);
            if ($normalizedCurrent === '') {
                continue;
            }

            $isDuplicate = $deduped->contains(function (ScribeTranscriptSegment $existing) use ($segment, $normalizedCurrent) {
                if ($existing->id && $segment->id && $existing->id === $segment->id) {
                    return true;
                }

                if ($existing->sequence === $segment->sequence && $existing->source === $segment->source) {
                    return true;
                }

                $normalizedExisting = self::normalizeText($existing->text);
                $textMatches = ($normalizedExisting === $normalizedCurrent)
                    || (mb_strlen($normalizedExisting) > 10 && mb_strlen($normalizedCurrent) > 10 && (
                        str_contains($normalizedExisting, $normalizedCurrent) || str_contains($normalizedCurrent, $normalizedExisting)
                    ));

                if (! $textMatches) {
                    return false;
                }

                $overlap = max((int) $existing->start_ms, (int) $segment->start_ms) <= (min((int) $existing->end_ms, (int) $segment->end_ms) + 3000);
                $closeStarts = abs((int) $existing->start_ms - (int) $segment->start_ms) <= 5000;

                return $overlap || $closeStarts;
            });

            if (! $isDuplicate) {
                $deduped->push($segment);
            }
        }

        return $deduped->values();
    }

    public static function normalizeText(?string $text): string
    {
        if ($text === null) {
            return '';
        }
        $text = mb_strtolower(trim($text));
        $text = preg_replace('/[^\p{L}\p{N}\s]/u', '', $text);

        return preg_replace('/\s+/', ' ', $text ?? '') ?? '';
    }
}
