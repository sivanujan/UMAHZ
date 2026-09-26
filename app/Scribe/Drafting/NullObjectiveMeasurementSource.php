<?php

namespace App\Scribe\Drafting;

use App\Models\ScribeSession;
use App\Scribe\Contracts\ObjectiveMeasurementSource;

class NullObjectiveMeasurementSource implements ObjectiveMeasurementSource
{
    public function approvedMeasurementsFor(ScribeSession $session): array
    {
        return [];
    }
}
