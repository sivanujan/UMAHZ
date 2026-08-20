<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

abstract class Controller
{
    use AuthorizesRequests;

    /**
     * Send a notification without letting a mail delivery failure take the
     * whole request down with it. Approving a clinic (or any other action
     * that happens to also send an email) should still succeed even if the
     * mail transport is misconfigured or unreachable — the failure is
     * logged instead so it's visible without blocking the operator.
     */
    protected function notifySafely(mixed $notifiable, Notification $notification): void
    {
        if (!$notifiable) {
            return;
        }

        try {
            $notifiable->notify($notification);
        } catch (Throwable $e) {
            Log::warning('Notification delivery failed', [
                'notifiable' => $notifiable->getKey(),
                'notification' => $notification::class,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
