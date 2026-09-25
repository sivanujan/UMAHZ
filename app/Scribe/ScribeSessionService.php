<?php

namespace App\Scribe;

use App\Jobs\TranscribeAudioChunk;
use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\ConsentType;
use App\Models\ScribeAudioChunk;
use App\Models\ScribeSession;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Scribe\Contracts\TranscriptionProvider;
use App\Services\ConsentRecorder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * All Scribe state changes go through here so the consent gate and the audit
 * trail cannot be bypassed by a new endpoint.
 *
 * Scribe produces transcripts (and, in Phase 2, drafts) only. Nothing in this
 * service creates, edits, finalizes or signs a ClinicalNote.
 */
class ScribeSessionService
{
    public function __construct(
        private readonly ConsentRecorder $consents,
        private readonly TranscriptionProvider $transcription,
    ) {}

    /**
     * Open (or resume) a session for an encounter.
     */
    public function open(Tenant $tenant, StaffMembership $membership, User $user, Client $client, ?Appointment $appointment, ?string $ip): ScribeSession
    {
        return DB::transaction(function () use ($tenant, $membership, $user, $client, $appointment, $ip) {
            $existing = ScribeSession::where('tenant_id', $tenant->id)
                ->where('client_id', $client->id)
                ->where('staff_membership_id', $membership->id)
                ->where('appointment_id', $appointment?->id)
                ->whereIn('status', [
                    ScribeSession::STATUS_CONSENT_PENDING,
                    ScribeSession::STATUS_RECORDING,
                    ScribeSession::STATUS_PAUSED,
                    ScribeSession::STATUS_TRANSCRIBING,
                    // Reopening Scribe after the transcript/draft is ready returns to it
                    // instead of starting over (until it is handed to Clinical Notes).
                    ScribeSession::STATUS_TRANSCRIPT_READY,
                    ScribeSession::STATUS_DRAFT_READY,
                ])
                ->latest()
                ->first();

            if ($existing) {
                return $existing;
            }

            ConsentType::ensureScribeTypeForTenant($tenant->id);

            $membership->loadMissing('practitionerProfile');
            $offered = $tenant->offeredDisciplineCodes();
            $discipline = $membership->practitionerProfile?->profession ?? $offered[0] ?? null;

            $session = ScribeSession::create([
                'tenant_id' => $tenant->id,
                'client_id' => $client->id,
                'appointment_id' => $appointment?->id,
                'staff_membership_id' => $membership->id,
                'created_by_user_id' => $user->id,
                'discipline' => $discipline,
                'discipline_label' => $discipline ? $tenant->disciplineLabel($discipline) : null,
                'status' => ScribeSession::STATUS_CONSENT_PENDING,
                'transcription_provider' => $this->transcription->name(),
            ]);

            $this->audit($session, $user, 'scribe.session_created', $ip);

            return $session;
        });
    }

    /**
     * Capture the client's explicit, per-encounter recording consent through
     * the Consent module (signed, versioned, immutable, UTC timestamped).
     *
     * @param  array{signer_name: string, signature_type: string, signature_data: string}  $data
     */
    public function captureConsent(ScribeSession $session, array $data, User $user, ?string $ip): ScribeSession
    {
        if ($session->status !== ScribeSession::STATUS_CONSENT_PENDING) {
            throw new ScribeStateException('Consent can only be captured before recording starts.');
        }

        $type = ConsentType::ensureScribeTypeForTenant($session->tenant_id);
        $client = Client::withoutGlobalScopes()->findOrFail($session->client_id);

        $consent = $this->consents->record($client, $type, $data, $user, $ip, $session->appointment_id);

        DB::transaction(function () use ($session, $consent, $user, $ip) {
            $session->forceFill(['consent_id' => $consent->id])->save();

            $this->audit($session, $user, 'scribe.consent_captured', $ip, [
                'consent_id' => $consent->id,
                'consent_version' => $consent->consent_version,
                'signer_name' => $consent->signer_name,
                'agreed_at' => $consent->agreed_at->toIso8601String(),
            ]);
        });

        return $session->refresh();
    }

    public function start(ScribeSession $session, User $user, ?string $ip): ScribeSession
    {
        $this->assertConsent($session, $user, $ip);

        DB::transaction(function () use ($session, $user, $ip) {
            $session->transitionTo(ScribeSession::STATUS_RECORDING, ['started_at' => $session->started_at ?? now()]);
            $this->audit($session, $user, 'scribe.session_started', $ip);
        });

        return $session;
    }

    public function pause(ScribeSession $session, User $user, ?string $ip): ScribeSession
    {
        $this->assertConsent($session, $user, $ip);

        DB::transaction(function () use ($session, $user, $ip) {
            $session->transitionTo(ScribeSession::STATUS_PAUSED, ['paused_at' => now()]);
            $this->audit($session, $user, 'scribe.session_paused', $ip);
        });

        return $session;
    }

    public function resume(ScribeSession $session, User $user, ?string $ip): ScribeSession
    {
        if ($session->status !== ScribeSession::STATUS_PAUSED) {
            throw new ScribeStateException('Only a paused session can be resumed.');
        }

        $this->assertConsent($session, $user, $ip);

        DB::transaction(function () use ($session, $user, $ip) {
            $session->transitionTo(ScribeSession::STATUS_RECORDING, ['paused_at' => null]);
            $this->audit($session, $user, 'scribe.session_resumed', $ip);
        });

        return $session;
    }

    /**
     * Stop capturing. Remaining queued chunks finish transcribing; the session
     * becomes transcript_ready once they settle. Stopping never requires valid
     * consent — you can always stop.
     */
    public function stop(ScribeSession $session, User $user, ?string $ip): ScribeSession
    {
        if (! $session->isCapturing()) {
            throw new ScribeStateException('This session is not recording.');
        }

        DB::transaction(function () use ($session, $user, $ip) {
            $session->transitionTo(ScribeSession::STATUS_TRANSCRIBING, ['stopped_at' => now(), 'paused_at' => null]);
            $this->audit($session, $user, 'scribe.session_stopped', $ip, ['recorded_ms' => $session->recorded_ms]);
        });

        self::settle($session->id);

        return $session->refresh();
    }

    /**
     * Accept one self-contained audio chunk. Idempotent per sequence number so
     * the browser can safely re-send after a network error.
     */
    public function acceptChunk(ScribeSession $session, UploadedFile $file, int $sequence, int $durationMs, int $offsetMs, User $user, ?string $ip): ScribeAudioChunk
    {
        $this->assertConsent($session, $user, $ip);

        if ($session->status !== ScribeSession::STATUS_RECORDING) {
            throw new ScribeStateException('Audio is only accepted while the session is recording.');
        }

        $existing = ScribeAudioChunk::where('scribe_session_id', $session->id)->where('sequence', $sequence)->first();
        if ($existing) {
            return $existing;
        }

        $mime = self::normaliseMime($file->getMimeType() ?: $file->getClientMimeType());
        $path = sprintf('scribe/%s/%s/%06d-%s.%s.enc', $session->tenant_id, $session->id, $sequence, Str::random(12), self::extensionFor($mime));

        // Encrypt at rest before it touches disk.
        ScribeAudioChunk::storeAudio($path, $file->get());

        $chunk = DB::transaction(function () use ($session, $sequence, $path, $mime, $file, $durationMs, $offsetMs) {
            $chunk = ScribeAudioChunk::create([
                'tenant_id' => $session->tenant_id,
                'scribe_session_id' => $session->id,
                'sequence' => $sequence,
                'storage_path' => $path,
                'mime_type' => $mime,
                'byte_size' => $file->getSize(),
                'duration_ms' => $durationMs,
                'offset_ms' => $offsetMs,
                'status' => ScribeAudioChunk::STATUS_PENDING,
            ]);

            $session->increment('recorded_ms', $durationMs);

            return $chunk;
        });

        TranscribeAudioChunk::dispatch($chunk->id);

        return $chunk;
    }

    /**
     * Client withdrew consent: stop recording now, discard audio that has not
     * been transcribed (it is never sent to the provider), purge all raw audio.
     * Text already transcribed under valid consent is kept for the
     * practitioner's record-keeping decision.
     */
    public function withdrawConsent(ScribeSession $session, User $user, string $reason, ?string $ip): ScribeSession
    {
        if ($session->isTerminal()) {
            throw new ScribeStateException('This session is already closed.');
        }

        $consent = $session->consent_id ? $session->consent()->withoutGlobalScopes()->first() : null;

        if ($consent && $consent->isActive()) {
            $this->consents->withdraw($consent, $user, $reason, $ip);
        }

        $this->closeForWithdrawnConsent($session, $user, $ip, $reason);

        return $session->refresh();
    }

    /**
     * Re-queue failed chunks whose audio is still within retention.
     */
    public function retryFailed(ScribeSession $session, User $user, ?string $ip): int
    {
        $this->assertConsent($session, $user, $ip);

        $chunks = ScribeAudioChunk::where('scribe_session_id', $session->id)
            ->where('status', ScribeAudioChunk::STATUS_FAILED)
            ->whereNotNull('storage_path')
            ->get()
            ->filter(fn (ScribeAudioChunk $c) => $c->hasAudio());

        if ($chunks->isEmpty()) {
            return 0;
        }

        DB::transaction(function () use ($session, $chunks, $user, $ip) {
            foreach ($chunks as $chunk) {
                $chunk->forceFill(['status' => ScribeAudioChunk::STATUS_PENDING, 'attempts' => 0, 'last_error' => null])->save();
            }

            if ($session->status === ScribeSession::STATUS_TRANSCRIPT_READY) {
                $session->transitionTo(ScribeSession::STATUS_TRANSCRIBING, ['transcript_ready_at' => null]);
            }

            $session->forceFill(['last_error' => null])->save();

            $this->audit($session, $user, 'scribe.chunks_retried', $ip, ['count' => $chunks->count()]);
        });

        foreach ($chunks as $chunk) {
            TranscribeAudioChunk::dispatch($chunk->id);
        }

        return $chunks->count();
    }

    /**
     * transcribing -> transcript_ready when every chunk has settled. Locked so
     * two workers finishing together cannot both transition.
     */
    public static function settle(string $sessionId): void
    {
        DB::transaction(function () use ($sessionId) {
            ScribeSession::withoutGlobalScopes()->lockForUpdate()->find($sessionId)?->settleIfComplete();
        });
    }

    /**
     * Server-side consent gate. On failure, a capturing session is closed
     * immediately and the request is refused.
     */
    private function assertConsent(ScribeSession $session, User $user, ?string $ip): void
    {
        if ($session->hasValidConsent()) {
            return;
        }

        $this->audit($session, $user, 'scribe.recording_refused', $ip, ['reason' => 'no_valid_consent']);

        // Consent was withdrawn elsewhere (e.g. on the client profile) mid-session.
        if ($session->consent_id && ! $session->isTerminal() && $session->status !== ScribeSession::STATUS_CONSENT_PENDING) {
            $this->closeForWithdrawnConsent($session, $user, $ip, 'Consent withdrawn outside the Scribe panel.');
        }

        throw new ScribeConsentException;
    }

    private function closeForWithdrawnConsent(ScribeSession $session, User $user, ?string $ip, string $reason): void
    {
        $toPurge = DB::transaction(function () use ($session, $user, $ip, $reason) {
            ScribeAudioChunk::where('scribe_session_id', $session->id)
                ->whereIn('status', [ScribeAudioChunk::STATUS_PENDING, ScribeAudioChunk::STATUS_PROCESSING, ScribeAudioChunk::STATUS_FAILED])
                ->update(['status' => ScribeAudioChunk::STATUS_DISCARDED, 'last_error' => 'Discarded: recording consent withdrawn.']);

            if (! $session->isTerminal()) {
                $session->transitionTo(ScribeSession::STATUS_CONSENT_WITHDRAWN, [
                    'consent_withdrawn_at' => now(),
                    'stopped_at' => $session->stopped_at ?? now(),
                    'paused_at' => null,
                ]);
            }

            $this->audit($session, $user, 'scribe.consent_withdrawn', $ip, ['reason' => $reason]);

            return ScribeAudioChunk::where('scribe_session_id', $session->id)->whereNotNull('storage_path')->get();
        });

        $toPurge->each->purgeAudio();
    }

    private function audit(ScribeSession $session, ?User $user, string $action, ?string $ip, array $metadata = []): void
    {
        AuditEvent::create([
            'tenant_id' => $session->tenant_id,
            'user_id' => $user?->id,
            'action' => $action,
            'resource_type' => ScribeSession::class,
            'resource_id' => $session->id,
            'ip_address' => $ip,
            'metadata' => array_merge([
                'client_id' => $session->client_id,
                'appointment_id' => $session->appointment_id,
                'status' => $session->status,
            ], $metadata),
        ]);
    }

    public const ACCEPTED_MIME_TYPES = [
        'audio/webm', 'video/webm', 'audio/ogg', 'application/ogg', 'audio/mp4', 'video/mp4',
        'audio/x-m4a', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/flac',
    ];

    private static function normaliseMime(string $mime): string
    {
        return strtolower(trim(explode(';', $mime)[0]));
    }

    public static function extensionFor(string $mime): string
    {
        return match (self::normaliseMime($mime)) {
            'audio/ogg', 'application/ogg' => 'ogg',
            'audio/mp4', 'video/mp4', 'audio/x-m4a' => 'm4a',
            'audio/mpeg' => 'mp3',
            'audio/wav', 'audio/x-wav', 'audio/wave' => 'wav',
            'audio/flac' => 'flac',
            default => 'webm',
        };
    }
}
