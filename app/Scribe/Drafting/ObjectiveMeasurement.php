<?php

namespace App\Scribe\Drafting;

/**
 * PHASE 4 — one approved objective measurement (e.g. a UMAHZ Motion
 * range-of-motion result). Stored as PROVENANCE_OBJECTIVE_MEASUREMENT and kept
 * separate from any AI interpretation of it.
 */
final class ObjectiveMeasurement
{
    public function __construct(
        public readonly string $sourceType,   // e.g. "umahz_motion"
        public readonly string $sourceId,     // id of the approved result in the source system
        public readonly string $label,        // e.g. "Left shoulder flexion"
        public readonly string|float|int $value,
        public readonly ?string $unit = null, // e.g. "deg"
        public readonly ?string $approvedByUserId = null,
        public readonly ?string $measuredAt = null,
    ) {}
}
