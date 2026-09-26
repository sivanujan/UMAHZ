<?php

namespace App\Scribe\Drafting;

use App\Scribe\Contracts\DraftingProvider;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Draft generation through OpenRouter's OpenAI-compatible chat API
 * (default model: anthropic/claude-haiku-4.5).
 *
 * PRIVACY: the transcript (never the client's name) is sent to OpenRouter and
 * the model host. Requests ask OpenRouter to route only to providers that do
 * not collect/train on data (provider.data_collection = "deny"). Review
 * OpenRouter + the model host for PHIPA/PIPEDA before real patient use.
 */
class OpenRouterDraftingProvider implements DraftingProvider
{
    public function name(): string
    {
        return 'openrouter';
    }

    public function draft(DraftingRequest $request): DraftingResult
    {
        $config = config('scribe.drafting.openrouter');

        if (empty($config['api_key'])) {
            throw new DraftingException('AI drafting is not configured (OPENROUTER_API_KEY is missing).', retryable: false);
        }

        try {
            $response = Http::withToken($config['api_key'])
                ->withHeaders([
                    // Optional attribution headers recommended by OpenRouter.
                    'HTTP-Referer' => config('app.url'),
                    'X-Title' => 'UMAHZ AI Scribe',
                ])
                ->acceptJson()
                ->timeout($config['timeout'])
                ->post(rtrim($config['base_url'], '/').'/chat/completions', [
                    'model' => $config['model'],
                    'messages' => [
                        ['role' => 'system', 'content' => DraftPrompt::system($request->disciplineLabel)],
                        ['role' => 'user', 'content' => DraftPrompt::user($request->disciplineLabel, $request->templateSchema, $request->transcript)],
                    ],
                    'temperature' => 0.2,
                    'max_tokens' => $config['max_tokens'],
                    'provider' => ['data_collection' => 'deny'],
                    'usage' => ['include' => true],
                ]);
        } catch (ConnectionException $e) {
            throw new DraftingException('Could not reach the AI drafting service.', retryable: true, previous: $e);
        }

        if ($response->failed() || $response->json('error')) {
            $status = $response->status();
            $message = $response->json('error.message') ?? 'HTTP '.$status;
            // 402 = out of OpenRouter credits, 401/403 = bad key: retrying won't help.
            $retryable = $status >= 500 || in_array($status, [408, 429], true);

            throw new DraftingException("AI drafting service error: {$message}", retryable: $retryable);
        }

        if ($response->json('choices.0.finish_reason') === 'length') {
            throw new DraftingException('The AI draft was cut off because it was too long. Try again, or raise OPENROUTER_MAX_TOKENS.', retryable: false);
        }

        $content = (string) $response->json('choices.0.message.content', '');

        return new DraftingResult(
            fields: DraftPrompt::parse($content),
            generator: [
                'provider' => $this->name(),
                'model' => $response->json('model') ?? $config['model'],
                'prompt_version' => DraftPrompt::VERSION,
                'usage' => array_filter([
                    'prompt_tokens' => $response->json('usage.prompt_tokens'),
                    'completion_tokens' => $response->json('usage.completion_tokens'),
                    'cost_usd' => $response->json('usage.cost'),
                ], fn ($v) => $v !== null),
            ],
        );
    }
}
