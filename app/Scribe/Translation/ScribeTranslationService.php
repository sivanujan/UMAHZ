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

class ScribeTranslationService
{
    /**
     * Translates a session's segments into English if the session was recorded in a non-English language.
     * Idempotent: returns existing translations if already translated and no new segments exist.
     *
     * @return array<int, ScribeTranscriptSegment>
     */
    public function translate(ScribeSession $session, ?User $user = null, ?string $ip = null): array
    {
        if (! $session->isNonEnglish()) {
            return ScribeTranscriptSegment::where('scribe_session_id', $session->id)->orderBy('sequence')->get()->all();
        }

        $segments = ScribeTranscriptSegment::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->orderBy('sequence')
            ->get();

        if ($segments->isEmpty()) {
            return [];
        }

        // Check if all segments are already translated
        $untranslated = $segments->filter(fn (ScribeTranscriptSegment $s) => empty($s->translated_text));
        if ($untranslated->isEmpty() && $session->is_translated) {
            return $segments->all();
        }

        $sourceLangLabel = $session->languageLabel();
        $driver = config('scribe.drafting.driver', 'openrouter');

        if ($driver === 'fake') {
            $translations = [];
            foreach ($segments as $s) {
                $translations[$s->sequence] = "English translation: {$s->text}";
            }
            $providerName = 'fake';
            $modelName = 'fake-translator';
        } else {
            $config = config('scribe.drafting.openrouter');
            if (empty($config['api_key'])) {
                throw new DraftingException('Translation is not configured (OPENROUTER_API_KEY is missing).', retryable: false);
            }

            $segmentsPayload = $segments->map(fn (ScribeTranscriptSegment $s) => [
                'sequence' => $s->sequence,
                'text' => $s->text,
            ])->all();

            try {
                $response = Http::withToken($config['api_key'])
                    ->withHeaders([
                        'HTTP-Referer' => config('app.url'),
                        'X-Title' => 'UMAHZ AI Scribe Translator',
                    ])
                    ->acceptJson()
                    ->timeout($config['timeout'])
                    ->post(rtrim($config['base_url'], '/').'/chat/completions', [
                        'model' => $config['model'],
                        'messages' => [
                            ['role' => 'system', 'content' => TranslationPrompt::system($sourceLangLabel)],
                            ['role' => 'user', 'content' => TranslationPrompt::user($sourceLangLabel, $segmentsPayload)],
                        ],
                        'temperature' => 0.1,
                        'max_tokens' => $config['max_tokens'],
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
            $parsed = TranslationPrompt::parse($content);

            $translations = [];
            foreach ($parsed as $item) {
                $translations[$item['sequence']] = $item['translated_text'];
            }

            $providerName = 'openrouter';
            $modelName = $response->json('model') ?? $config['model'];
        }

        DB::transaction(function () use ($session, $segments, $translations, $providerName, $modelName, $user, $ip) {
            foreach ($segments as $segment) {
                $translated = $translations[$segment->sequence] ?? "English translation: {$segment->text}";
                $segment->forceFill(['translated_text' => $translated])->save();
            }

            $session->forceFill([
                'is_translated' => true,
                'translated_at' => now(),
                'translation_provider' => $providerName,
            ])->save();

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
                    'provider' => $providerName,
                    'model' => $modelName,
                ],
            ]);
        });

        return $segments->fresh()->all();
    }
}
