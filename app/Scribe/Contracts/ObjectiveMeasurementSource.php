<?php

namespace App\Scribe\Contracts;

use App\Models\ScribeSession;
use App\Scribe\Drafting\ObjectiveMeasurement;

/**
 * PHASE 4 SEAM — where approved UMAHZ Motion results enter Scribe as objective
 * data. Only results a practitioner has APPROVED may be returned. They are fed
 * to drafting as-is and stored as objective_measurement items, separate from AI
 * text. Bound to NullObjectiveMeasurementSource (returns nothing) until Phase 4.
 */
interface ObjectiveMeasurementSource
{
    /**
     * @return array<int, ObjectiveMeasurement>
     */
    public function approvedMeasurementsFor(ScribeSession $session): array;
}
