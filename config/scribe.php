<?php

return [
    /*
    |--------------------------------------------------------------------------
    | AI Scribe
    |--------------------------------------------------------------------------
    | Scribe records a consented clinical encounter, transcribes it, and (in
    | later phases) prepares a profession-specific DRAFT for the practitioner to
    | review. Scribe never finalizes or signs anything: finalizing stays
    | exclusively in the Clinical Notes flow.
    |
    | All AI work goes through provider CONTRACTS (App\Scribe\Contracts), never
    | a vendor SDK directly, so a provider can be swapped (e.g. for a
    | Canadian-hosted one) by changing the driver below, not rewriting Scribe.
    |
    | !! DATA RESIDENCY / PRIVACY — TODO BEFORE REAL PATIENT USE !!
    | Audio chunks are sent to the transcription provider's servers (AssemblyAI,
    | US-hosted by default; an EU region exists). Before recording real
    | patients the provider MUST be reviewed for PHIPA/PIPEDA (and any
    | provincial) privacy, data-residency, retention and BAA/DPA terms. If it
    | does not pass, add a compliant TranscriptionProvider implementation and
    | switch the driver — no Scribe code changes are needed. Scribe is also OFF
    | per clinic by default until the clinic owner enables it in Settings -> AI Scribe.
    */

    'transcription' => [
        // "assemblyai" (AssemblyAI API) | "fake" (deterministic, no network; tests/local UI work)
        'driver' => env('SCRIBE_TRANSCRIPTION_DRIVER', 'assemblyai'),

        'assemblyai' => [
            'api_key' => env('ASSEMBLYAI_API_KEY'),
            // EU region: https://api.eu.assemblyai.com
            'base_url' => env('ASSEMBLYAI_BASE_URL', 'https://api.assemblyai.com'),
            // Optional model override (e.g. "universal"). Empty = AssemblyAI's default.
            'speech_model' => env('ASSEMBLYAI_SPEECH_MODEL'),
            // Language code (e.g. "en", "fr"), or "auto" for detection. Short
            // chunks detect poorly, so a fixed language is more reliable.
            'language' => env('ASSEMBLYAI_LANGUAGE', 'en'),
            // Per-HTTP-call timeout, and the total time to wait for one chunk.
            // max_wait must stay below the job timeout (80s).
            'timeout' => (int) env('ASSEMBLYAI_TIMEOUT', 30),
            'max_wait_seconds' => (int) env('ASSEMBLYAI_MAX_WAIT_SECONDS', 60),
            'poll_interval_ms' => (int) env('ASSEMBLYAI_POLL_INTERVAL_MS', 1000),
        ],
    ],

    /*
    | Phase 2: profession-specific AI draft (DraftingProvider contract).
    | The transcript (never the client's name) is sent to OpenRouter and the
    | model host; requests ask OpenRouter to avoid providers that collect data.
    | Same privacy review applies before real patient use.
    */
    'drafting' => [
        // "openrouter" | "fake" (deterministic, no network; tests)
        'driver' => env('SCRIBE_DRAFTING_DRIVER', 'openrouter'),

        'openrouter' => [
            'api_key' => env('OPENROUTER_API_KEY'),
            'base_url' => env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
            // Low-cost default. Switch model with one env line (e.g. anthropic/claude-sonnet-5).
            'model' => env('OPENROUTER_MODEL', 'anthropic/claude-haiku-4.5'),
            'max_tokens' => (int) env('OPENROUTER_MAX_TOKENS', 3000),
            // Must stay below the job timeout (80s).
            'timeout' => (int) env('OPENROUTER_TIMEOUT', 60),
        ],
    ],

    // Queue used for transcription jobs. The worker must listen on it.
    'queue' => env('SCRIBE_QUEUE', 'default'),

    // Private disk for raw audio. Never a public disk.
    'audio_disk' => env('SCRIBE_AUDIO_DISK', 'local'),

    // Upload guard for a single chunk (kilobytes). ~12s of opus audio is ~100-250 KB.
    'max_chunk_kb' => (int) env('SCRIBE_MAX_CHUNK_KB', 5120),

    // Transcription retries per chunk before it is marked failed (it can be retried manually).
    'max_attempts' => (int) env('SCRIBE_MAX_ATTEMPTS', 4),

    /*
    | Per-clinic defaults (overridden by tenants.scribe_settings).
    | audio_retention_mode:
    |   delete_after_transcription — raw audio is deleted the moment its chunk is
    |       transcribed; un-transcribed (failed/abandoned) audio is purged after
    |       audio_retention_hours as a safety net.
    |   retain_window — keep all raw audio for audio_retention_hours, then purge.
    | Transcripts are clinical-record material and are NOT purged by this.
    */
    'defaults' => [
        'enabled' => false,
        'audio_retention_mode' => 'delete_after_transcription',
        'audio_retention_hours' => 24,
    ],

    'max_retention_hours' => 168,
];
