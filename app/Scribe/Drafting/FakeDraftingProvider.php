<?php

namespace App\Scribe\Drafting;

use App\Scribe\Contracts\DraftingProvider;

/**
 * Deterministic, network-free drafting for tests (SCRIBE_DRAFTING_DRIVER=fake).
 */
class FakeDraftingProvider implements DraftingProvider
{
    /** @var array<int, DraftingRequest> */
    public array $requests = [];

    /** @var array<int, array|\Throwable> queued `fields` payloads or exceptions */
    private array $queue = [];

    public function name(): string
    {
        return 'fake';
    }

    public function respondWith(array|\Throwable ...$responses): static
    {
        array_push($this->queue, ...$responses);

        return $this;
    }

    public function draft(DraftingRequest $request): DraftingResult
    {
        $this->requests[] = $request;

        $next = array_shift($this->queue);

        if ($next instanceof \Throwable) {
            throw $next;
        }

        return new DraftingResult(
            fields: $next ?? [],
            generator: [
                'provider' => 'fake',
                'model' => 'fake-draft-1',
                'prompt_version' => DraftPrompt::VERSION,
                'usage' => ['prompt_tokens' => 100, 'completion_tokens' => 50],
            ],
        );
    }
}
