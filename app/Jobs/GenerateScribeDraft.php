<?php

namespace App\Jobs;

use App\Scribe\Drafting\DraftingException;
use App\Scribe\ScribeDraftService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/**
 * Generates the profession-specific AI draft for a finished Scribe session.
 */
class GenerateScribeDraft implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    // Below the database queue retry_after (90s); OPENROUTER_TIMEOUT (60s) sits inside it.
    public int $timeout = 80;

    public function __construct(
        public readonly string $sessionId,
        public readonly ?string $userId = null,
    ) {
        $this->onQueue(config('scribe.queue', 'default'));
    }

    public function handle(ScribeDraftService $drafts): void
    {
        try {
            $drafts->generate($this->sessionId, $this->userId);
        } catch (DraftingException $e) {
            $canRetry = $e->retryable
                && $this->job !== null
                && $this->job->getConnectionName() !== 'sync'
                && $this->attempts() < $this->tries;

            if ($canRetry) {
                $this->release(15);

                return;
            }

            $drafts->markFailed($this->sessionId, $e->getMessage());
        }
    }

    public function failed(?Throwable $e): void
    {
        app(ScribeDraftService::class)->markFailed($this->sessionId, 'The AI draft could not be generated. Please try again.');
    }
}
