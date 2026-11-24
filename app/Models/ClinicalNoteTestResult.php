<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicalNoteTestResult extends Model
{
    use HasFactory, HasUuids;

    public const SIDES = ['left', 'right', 'bilateral', 'n/a'];

    public const RESULTS = ['positive', 'negative', 'inconclusive', 'not_tested'];

    protected $fillable = [
        'tenant_id',
        'clinical_note_id',
        'addendum_id',
        'assessment_test_id',
        'test_name_snapshot',
        'body_region_snapshot',
        'side',
        'result',
        'pain_reproduced',
        'notes',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'pain_reproduced' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function clinicalNote(): BelongsTo
    {
        return $this->belongsTo(ClinicalNote::class);
    }

    public function addendum(): BelongsTo
    {
        return $this->belongsTo(ClinicalNoteAddendum::class, 'addendum_id');
    }

    public function assessmentTest(): BelongsTo
    {
        return $this->belongsTo(AssessmentTest::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
