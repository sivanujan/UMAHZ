<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One fragment of a profession-specific draft (written by ScribeDraftService,
 * Phase 2). `section_key` is the ClinicalNoteTemplate field id it belongs to.
 *
 * Each item carries exactly ONE provenance and its evidence, so the review UI
 * can always show the practitioner what the client said, what the practitioner
 * said aloud, what they typed themselves, what was measured (Motion, Phase 4),
 * and what the AI wrote — side by side, never blended.
 */
class ScribeDraftItem extends Model
{
    use BelongsToTenant, HasUuids;

    /** The client said it (captured in the transcript). */
    public const PROVENANCE_CLIENT_REPORTED = 'client_reported';

    /** The practitioner said it aloud during the encounter (captured in the transcript). */
    public const PROVENANCE_PRACTITIONER_STATED = 'practitioner_stated';

    /** The practitioner typed it themselves (Phase 3 review UI). */
    public const PROVENANCE_PRACTITIONER_ENTERED = 'practitioner_entered';

    /** An approved measurement from an objective source (UMAHZ Motion, Phase 4). */
    public const PROVENANCE_OBJECTIVE_MEASUREMENT = 'objective_measurement';

    /** The AI's own summary / interpretation / wording. */
    public const PROVENANCE_AI_GENERATED = 'ai_generated';

    public const PROVENANCES = [
        self::PROVENANCE_CLIENT_REPORTED,
        self::PROVENANCE_PRACTITIONER_STATED,
        self::PROVENANCE_PRACTITIONER_ENTERED,
        self::PROVENANCE_OBJECTIVE_MEASUREMENT,
        self::PROVENANCE_AI_GENERATED,
    ];

    /** The only provenances a drafting model may assign; the rest come from people/devices. */
    public const AI_ASSIGNABLE_PROVENANCES = [
        self::PROVENANCE_CLIENT_REPORTED,
        self::PROVENANCE_PRACTITIONER_STATED,
        self::PROVENANCE_AI_GENERATED,
    ];

    public const REVIEW_PROPOSED = 'proposed';

    public const REVIEW_ACCEPTED = 'accepted';

    public const REVIEW_EDITED = 'edited';

    public const REVIEW_REJECTED = 'rejected';

    protected $fillable = [
        'tenant_id',
        'scribe_session_id',
        'draft_version',
        'section_key',
        'provenance',
        'content',
        'evidence',
        'generator',
        'review_status',
        'reviewed_by_user_id',
        'reviewed_at',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'content' => 'encrypted',
            'evidence' => 'array',
            'generator' => 'array',
            'draft_version' => 'integer',
            'position' => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ScribeSession::class, 'scribe_session_id');
    }
}
