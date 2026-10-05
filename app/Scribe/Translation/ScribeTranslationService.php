<?php

namespace App\Scribe\Translation;

use App\Models\AuditEvent;
use App\Models\ScribeSession;
use App\Models\ScribeTranscriptSegment;
use App\Models\User;
use App\Scribe\Drafting\DraftingException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ScribeTranslationService
{
    /**
     * Testing hook to simulate missing segment IDs or provider errors in fake mode.
     *
     * @var array<string, mixed>
     */
    public static array $fakeOptions = [];

    /**
     * Translates a session's segments into English if the session was recorded in a non-English language.
     * Processes segments in batches of 10–15 with a single retry for missing segment IDs.
     *
     * @return array<int, ScribeTranscriptSegment>
     */
    public function translate(ScribeSession $session, ?User $user = null, ?string $ip = null): array
    {
        if (! $session->isNonEnglish()) {
            return ScribeTranscriptSegment::withoutGlobalScopes()
                ->where('scribe_session_id', $session->id)
                ->orderBy('sequence')
                ->get()
                ->all();
        }

        $segments = ScribeTranscriptSegment::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->orderBy('sequence')
            ->get();

        if ($segments->isEmpty()) {
            return [];
        }

        $session->forceFill([
            'translation_status' => ScribeSession::TRANSLATION_TRANSLATING,
            'translation_error' => null,
        ])->save();

        $sourceLangLabel = $session->languageLabel();
        $driver = config('scribe.drafting.driver', 'openrouter');
        $batchSize = max(1, (int) config('scribe.translation_batch_size', 12));
        $anySegmentFailed = false;
        $providerName = $driver;
        $modelName = null;

        try {
            if ($driver === 'fake') {
                [$providerName, $modelName, $anySegmentFailed] = $this->translateFake($session, $segments);
            } else {
                [$providerName, $modelName, $anySegmentFailed] = $this->translateOpenRouter($session, $segments, $sourceLangLabel, $batchSize);
            }

            DB::transaction(function () use ($session, $segments, $anySegmentFailed, $providerName, $modelName, $user, $ip) {
                if ($anySegmentFailed) {
                    $session->forceFill([
                        'is_translated' => false,
                        'translation_status' => ScribeSession::TRANSLATION_FAILED,
                        'translation_error' => 'One or more transcript segments could not be translated.',
                        'translation_provider' => $providerName,
                    ])->save();
                } else {
                    $session->forceFill([
                        'is_translated' => true,
                        'translation_status' => ScribeSession::TRANSLATION_COMPLETED,
                        'translated_at' => now(),
                        'translation_error' => null,
                        'translation_provider' => $providerName,
                    ])->save();
                }

                AuditEvent::create([
                    'tenant_id' => $session->tenant_id,
                    'user_id' => $user?->id,
                    'action' => 'scribe.transcript_translated',
                    'resource_type' => ScribeSession::class,
                    'resource_id' => $session->id,
                    'ip_address' => $ip,
                    'metadata' => [
                        'source_language' => $session->language,
                        'segments_count' => count($segments),
                        'failed' => $anySegmentFailed,
                        'provider' => $providerName,
                        'model' => $modelName,
                    ],
                ]);
            });
        } catch (\Throwable $e) {
            $session->forceFill([
                'is_translated' => false,
                'translation_status' => ScribeSession::TRANSLATION_FAILED,
                'translation_error' => $e->getMessage(),
            ])->save();

            throw $e;
        }

        return $segments->fresh()->all();
    }

    /**
     * @param  \Illuminate\Support\Collection<int, ScribeTranscriptSegment>  $segments
     * @return array{0: string, 1: ?string, 2: bool}
     */
    private function translateFake(ScribeSession $session, $segments): array
    {
        $providerName = 'fake';
        $modelName = 'fake-translator';
        $anyFailed = false;

        $omitIds = self::$fakeOptions['omit_ids'] ?? [];
        $failAll = (bool) (self::$fakeOptions['fail_all'] ?? false);

        if ($failAll) {
            foreach ($segments as $segment) {
                $segment->forceFill([
                    'translated_text' => null,
                    'translation_status' => ScribeSession::TRANSLATION_FAILED,
                ])->save();
            }

            return [$providerName, $modelName, true];
        }

        foreach ($segments as $segment) {
            if (in_array($segment->id, $omitIds, true)) {
                $segment->forceFill([
                    'translated_text' => null,
                    'translation_status' => ScribeSession::TRANSLATION_FAILED,
                ])->save();
                $anyFailed = true;

                continue;
            }

            // High-fidelity mock translations for standard testing
            $translated = match (true) {
                str_contains($segment->text, '右膝疼痛') => 'Patient complains of right knee pain, lasting 3 weeks, aggravated by stairs.',
                str_contains($segment->text, 'genou') => 'Patient reports sharp pain in the right knee for three weeks.',
                default => "Translation of: {$segment->text}",
            };

            $segment->forceFill([
                'translated_text' => $translated,
                'translation_status' => ScribeSession::TRANSLATION_COMPLETED,
            ])->save();
        }

        return [$providerName, $modelName, $anyFailed];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, ScribeTranscriptSegment>  $segments
     * @return array{0: string, 1: ?string, 2: bool}
     */
    private function translateOpenRouter(ScribeSession $session, $segments, string $sourceLangLabel, int $batchSize): array
    {
        $config = config('scribe.drafting.openrouter');
        if (empty($config['api_key'])) {
            throw new DraftingException('Translation is not configured (OPENROUTER_API_KEY is missing).', retryable: false);
        }

        $providerName = 'openrouter';
        $modelName = $config['model'] ?? 'anthropic/claude-haiku-4.5';
        $anyFailed = false;

        $chunks = $segments->chunk($batchSize);

        foreach ($chunks as $batch) {
            $parsedTranslations = [];
            try {
                $parsedTranslations = $this->callOpenRouterBatch($config, $sourceLangLabel, $batch->all());
            } catch (\Throwable $e) {
                Log::warning('Initial translation batch request failed', ['session_id' => $session->id, 'error' => $e->getMessage()]);
            }

            // Identify missing segments in this batch
            $missing = [];
            foreach ($batch as $segment) {
                if (! isset($parsedTranslations[$segment->id]) || empty($parsedTranslations[$segment->id]['translated_text'])) {
                    $missing[] = $segment;
                }
            }

            // Retry missing segment IDs once
            if (! empty($missing)) {
                Log::info('Retrying missing segments in translation', ['session_id' => $session->id, 'count' => count($missing)]);
                try {
                    $retryTranslations = $this->callOpenRouterBatch($config, $sourceLangLabel, $missing);
                    foreach ($retryTranslations as $id => $item) {
                        if (! empty($item['translated_text'])) {
                            $parsedTranslations[$id] = $item;
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('Retry translation batch failed', ['error' => $e->getMessage()]);
                }
            }

            // Save results: NO fake prefix fallback ever
            foreach ($batch as $segment) {
                if (isset($parsedTranslations[$segment->id]) && ! empty($parsedTranslations[$segment->id]['translated_text'])) {
                    $segment->forceFill([
                        'translated_text' => $parsedTranslations[$segment->id]['translated_text'],
                        'translation_status' => ScribeSession::TRANSLATION_COMPLETED,
                    ])->save();
                } else {
                    $segment->forceFill([
                        'translated_text' => null,
                        'translation_status' => ScribeSession::TRANSLATION_FAILED,
                    ])->save();
                    $anyFailed = true;
                }
            }
        }

        return [$providerName, $modelName, $anyFailed];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<int, ScribeTranscriptSegment>  $segments
     * @return array<string, array{id: string, sequence: int, translated_text: string}>
     */
    private function callOpenRouterBatch(array $config, string $sourceLangLabel, array $segments): array
    {
        $segmentsPayload = array_map(fn (ScribeTranscriptSegment $s) => [
            'id' => $s->id,
            'sequence' => $s->sequence,
            'text' => $s->text,
        ], $segments);

        try {
            $response = Http::withToken($config['api_key'])
                ->withHeaders([
                    'HTTP-Referer' => config('app.url'),
                    'X-Title' => 'UMAHZ AI Scribe Translator',
                ])
                ->acceptJson()
                ->timeout($config['timeout'] ?? 60)
                ->post(rtrim($config['base_url'], '/').'/chat/completions', [
                    'model' => $config['model'],
                    'messages' => [
                        ['role' => 'system', 'content' => TranslationPrompt::system($sourceLangLabel)],
                        ['role' => 'user', 'content' => TranslationPrompt::user($sourceLangLabel, $segmentsPayload)],
                    ],
                    'temperature' => 0.1,
                    'max_tokens' => $config['max_tokens'] ?? 4000,
                    'provider' => ['data_collection' => 'deny'],
                ]);
        } catch (ConnectionException $e) {
            throw new DraftingException('Could not reach the translation service.', retryable: true, previous: $e);
        }

        if ($response->failed() || $response->json('error')) {
            $message = $response->json('error.message') ?? 'HTTP '.$response->status();
            $retryable = $response->status() >= 500 || in_array($response->status(), [408, 429], true);
            throw new DraftingException("Translation service error: {$message}", retryable: $retryable);
        }

        $content = (string) $response->json('choices.0.message.content', '');

        return TranslationPrompt::parse($content);
    }
}
