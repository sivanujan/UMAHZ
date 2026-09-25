<?php

namespace App\Scribe;

use RuntimeException;

/**
 * No valid, active recording consent for this encounter (403).
 */
class ScribeConsentException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Recording is not allowed: there is no valid client consent to record and transcribe this encounter.');
    }
}
