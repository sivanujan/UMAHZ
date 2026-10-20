<?php

namespace App\Scribe;

use Illuminate\Support\Facades\Http;

class AssemblyAiStreamingService
{
    /**
     * Testing hook to mock token responses.
     */
    public static ?string $fakeToken = null;

    /**
     * Request a short-lived temporary token from AssemblyAI for WebSocket streaming.
     *
     * @return array{
     *     token: string,
     *     websocket_url: string,
     *     speech_model: string,
     *     sample_rate: int,
     *     mode: string,
     *     max_session_duration_seconds: int
     * }
     */
    public function createTemporaryToken(int $expiresInSeconds = 60, int $maxSessionDurationSeconds = 3600): array
    {
        $speechModel = config('scribe.streaming.speech_model', 'universal-3-6-pro');
        $wsUrl = config('scribe.streaming.ws_url', 'wss://streaming.assemblyai.com/v3/ws');
        $sampleRate = (int) config('scribe.streaming.sample_rate', 16000);
        $mode = config('scribe.streaming.mode', 'balanced');

        if (static::$fakeToken !== null) {
            return [
                'token' => static::$fakeToken,
                'websocket_url' => $wsUrl,
                'speech_model' => $speechModel,
                'sample_rate' => $sampleRate,
                'mode' => $mode,
                'max_session_duration_seconds' => $maxSessionDurationSeconds,
            ];
        }

        $apiKey = config('scribe.transcription.assemblyai.api_key');
        if (empty($apiKey)) {
            throw new TranscriptionException('Transcription is not configured (ASSEMBLYAI_API_KEY is missing).', retryable: false);
        }

        $baseUrl = rtrim(config('scribe.streaming.base_url', 'https://streaming.assemblyai.com'), '/');

        try {
            $response = Http::withHeaders(['authorization' => $apiKey])
                ->timeout(15)
                ->acceptJson()
                ->get("{$baseUrl}/v3/token", [
                    'expires_in_seconds' => $expiresInSeconds,
                    'max_session_duration_seconds' => $maxSessionDurationSeconds,
                ]);
        } catch (\Throwable $e) {
            throw new TranscriptionException('Could not connect to streaming token provider: '.$e->getMessage(), retryable: true, previous: $e);
        }

        if ($response->failed() || ! $response->json('token')) {
            $error = $response->json('error') ?? $response->json('message') ?? ('HTTP '.$response->status());
            throw new TranscriptionException("Failed to obtain streaming temporary token: {$error}", retryable: $response->status() >= 500);
        }

        return [
            'token' => (string) $response->json('token'),
            'websocket_url' => $wsUrl,
            'speech_model' => $speechModel,
            'sample_rate' => $sampleRate,
            'mode' => $mode,
            'max_session_duration_seconds' => $maxSessionDurationSeconds,
        ];
    }
}
