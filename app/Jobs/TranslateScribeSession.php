<?php

namespace App\Jobs;

use App\Models\ScribeSession;
use App\Models\User;
use App\Scribe\Translation\ScribeTranslationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class TranslateScribeSession implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 180;

    public function __construct(
        public readonly string $sessionId,
        public readonly ?string $userId = null,
        public readonly ?string $ip = null,
    ) {
        $this->onQueue(config('scribe.queue', 'scribe'));
    }

    public function handle(ScribeTranslationService $translator): void
    {
        $session = ScribeSession::withoutGlobalScopes()->find($this->sessionId);

        if (! $session) {
            return;
        }

        if (! $session->hasValidConsent()) {
            $session->forceFill([
                'translation_status' => ScribeSession::TRANSLATION_FAILED,
                'translation_error' => 'Recording consent is no longer valid.',
            ])->save();

            return;
        }

        $user = $this->userId ? User::find($this->userId) : null;

        try {
            $translator->translate($session, $user, $this->ip);
        } catch (Throwable $e) {
            Log::error('TranslateScribeSession job failed', [
                'session_id' => $this->sessionId,
                'error' => $e->getMessage(),
            ]);

            $session->forceFill([
                'translation_status' => ScribeSession::TRANSLATION_FAILED,
                'translation_error' => $e->getMessage(),
            ])->save();

            if ($this->attempts() < $this->tries) {
                $this->release(15);
            }
        }
    }

    public function failed(?Throwable $e): void
    {
        $session = ScribeSession::withoutGlobalScopes()->find($this->sessionId);
        if ($session) {
            $session->forceFill([
                'translation_status' => ScribeSession::TRANSLATION_FAILED,
                'translation_error' => $e?->getMessage() ?? 'Translation failed unexpectedly.',
            ])->save();
        }
    }
}
