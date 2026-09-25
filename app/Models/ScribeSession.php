<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use DomainException;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One consented, recorded clinical encounter.
 *
 * Workflow (the whole target flow; later phases add the tail states):
 *   consent_pending -> recording <-> paused -> transcribing -> transcript_ready
 *     -> (Phase 2) draft_ready -> (Phase 3) handed_off (a DRAFT ClinicalNote
 *        the practitioner reviews, edits and signs in the Clinical Notes flow).
 * consent_withdrawn is terminal and can be reached from any pre-hand-off state.
 *
 * Scribe NEVER finalizes: there is deliberately no finalized/signed state here.
 */
class ScribeSession extends Model
{
    use BelongsToTenant, HasUuids;

    public const STATUS_CONSENT_PENDING = 'consent_pending';

    public const STATUS_RECORDING = 'recording';

    public const STATUS_PAUSED = 'paused';

    public const STATUS_TRANSCRIBING = 'transcribing';

    public const STATUS_TRANSCRIPT_READY = 'transcript_ready';

    public const STATUS_DRAFT_READY = 'draft_ready';     // Phase 2

    public const STATUS_HANDED_OFF = 'handed_off';       // Phase 3

    public const STATUS_CONSENT_WITHDRAWN = 'consent_withdrawn';

    /** @var array<string, array<int, string>> allowed from => to */
    public const TRANSITIONS = [
        self::STATUS_CONSENT_PENDING => [self::STATUS_RECORDING, self::STATUS_CONSENT_WITHDRAWN],
        self::STATUS_RECORDING => [self::STATUS_PAUSED, self::STATUS_TRANSCRIBING, self::STATUS_TRANSCRIPT_READY, self::STATUS_CONSENT_WITHDRAWN],
        self::STATUS_PAUSED => [self::STATUS_RECORDING, self::STATUS_TRANSCRIBING, self::STATUS_TRANSCRIPT_READY, self::STATUS_CONSENT_WITHDRAWN],
        self::STATUS_TRANSCRIBING => [self::STATUS_TRANSCRIPT_READY, self::STATUS_CONSENT_WITHDRAWN],
        // -> transcribing only when failed chunks are retried.
        self::STATUS_TRANSCRIPT_READY => [self::STATUS_TRANSCRIBING, self::STATUS_DRAFT_READY, self::STATUS_HANDED_OFF, self::STATUS_CONSENT_WITHDRAWN],
        self::STATUS_DRAFT_READY => [self::STATUS_HANDED_OFF, self::STATUS_CONSENT_WITHDRAWN],
        self::STATUS_HANDED_OFF => [],
        self::STATUS_CONSENT_WITHDRAWN => [],
    ];

    protected $fillable = [
        'tenant_id',
        'client_id',
        'appointment_id',
        'staff_membership_id',
        'created_by_user_id',
        'discipline',
        'discipline_label',
        'status',
        'consent_id',
        'clinical_note_id',
        'transcription_provider',
        'recorded_ms',
        'last_error',
        'started_at',
        'paused_at',
        'stopped_at',
        'transcript_ready_at',
        'consent_withdrawn_at',
        'draft_status',
        'draft_error',
        'draft_version',
        'draft_generated_at',
        'clinical_note_template_id',
        'draft_template_snapshot',
        'handed_off_at',
        'handed_off_by_user_id',
        'handoff_fields',
    ];

    public const DRAFT_GENERATING = 'generating';

    public const DRAFT_READY = 'ready';

    public const DRAFT_FAILED = 'failed';

    protected function casts(): array
    {
        return [
            'recorded_ms' => 'integer',
            'started_at' => 'datetime',
            'paused_at' => 'datetime',
            'stopped_at' => 'datetime',
            'transcript_ready_at' => 'datetime',
            'consent_withdrawn_at' => 'datetime',
            'draft_version' => 'integer',
            'draft_generated_at' => 'datetime',
            'draft_template_snapshot' => 'array',
            'handed_off_at' => 'datetime',
            'handoff_fields' => 'array',
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

    public function staffMembership(): BelongsTo
    {
        return $this->belongsTo(StaffMembership::class);
    }

    public function consent(): BelongsTo
    {
        return $this->belongsTo(Consent::class);
    }

    public function clinicalNote(): BelongsTo
    {
        return $this->belongsTo(ClinicalNote::class);
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(ScribeAudioChunk::class)->orderBy('sequence');
    }

    public function segments(): HasMany
    {
        return $this->hasMany(ScribeTranscriptSegment::class)->orderBy('sequence');
    }

    public function draftItems(): HasMany
    {
        return $this->hasMany(ScribeDraftItem::class)->orderBy('position');
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    /**
     * Move to a new workflow state, refusing illegal jumps.
     */
    public function transitionTo(string $status, array $attributes = []): void
    {
        if (! $this->canTransitionTo($status)) {
            throw new DomainException("Scribe session cannot move from \"{$this->status}\" to \"{$status}\".");
        }

        $this->forceFill(array_merge($attributes, ['status' => $status]))->save();
    }

    public function isCapturing(): bool
    {
        return in_array($this->status, [self::STATUS_RECORDING, self::STATUS_PAUSED], true);
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [self::STATUS_HANDED_OFF, self::STATUS_CONSENT_WITHDRAWN], true);
    }

    /**
     * Server-side consent gate. Valid only when the linked consent is an active
     * Scribe recording consent for THIS client, THIS tenant and (when the
     * session is tied to one) THIS appointment. Re-evaluated on every request
     * and inside every queued job, so a withdrawal anywhere takes effect at once.
     */
    public function hasValidConsent(): bool
    {
        if (! $this->consent_id) {
            return false;
        }

        $consent = Consent::withoutGlobalScopes()->find($this->consent_id);

        if (! $consent || ! $consent->isActive()) {
            return false;
        }

        $type = $consent->consent_type_id
            ? ConsentType::withoutGlobalScopes()->find($consent->consent_type_id)
            : null;

        return $consent->tenant_id === $this->tenant_id
            && $consent->client_id === $this->client_id
            && $type?->code === ConsentType::CODE_AI_SCRIBE_RECORDING
            && ($this->appointment_id === null || $consent->appointment_id === $this->appointment_id);
    }

    /**
     * Once recording has stopped, flip to transcript_ready when every chunk has
     * reached a terminal state (transcribed / failed / discarded).
     */
    public function settleIfComplete(): void
    {
        if ($this->status !== self::STATUS_TRANSCRIBING) {
            return;
        }

        $open = ScribeAudioChunk::withoutGlobalScopes()
            ->where('scribe_session_id', $this->id)
            ->whereIn('status', [ScribeAudioChunk::STATUS_PENDING, ScribeAudioChunk::STATUS_PROCESSING])
            ->exists();

        if (! $open) {
            $this->transitionTo(self::STATUS_TRANSCRIPT_READY, ['transcript_ready_at' => now()]);
        }
    }
}
