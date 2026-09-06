<?php

namespace App\PatientBilling;

use RuntimeException;

/**
 * Thrown by PaymentProvider::parseWebhook when a webhook cannot be
 * signature-verified (forged, tampered, missing signature, or no secret
 * configured). The controller maps this to a 400.
 */
class WebhookVerificationException extends RuntimeException {}
