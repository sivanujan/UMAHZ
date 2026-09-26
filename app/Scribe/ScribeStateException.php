<?php

namespace App\Scribe;

use RuntimeException;

/**
 * An action that is not allowed in the session's current workflow state (409).
 */
class ScribeStateException extends RuntimeException {}
