<?php

namespace App\Scribe;

use App\Models\AuditEvent;
use App\Models\ScribeAudioChunk;
use App\Models\ScribeSession;
use App\Models\Tenant;

/**
 * Enforces each clinic's raw-audio retention setting. Only raw audio is
 * purged; transcripts follow clinical-record retention and are untouched.
 */
class ScribeAudioRetention
{
    /**
     * @return int number of chunk audio files purged
     */
    public function purge(): int
    {
        $purged = 0;
        $perSession = [];

        ScribeAudioChunk::withoutGlobalScopes()
            ->whereNotNull('storage_path')
            ->chunkById(200, function ($chunks) use (&$purged, &$perSession) {
                $tenants = Tenant::whereIn('id', $chunks->pluck('tenant_id')->unique())->get()->keyBy('id');
                $sessions = ScribeSession::withoutGlobalScopes()
                    ->whereIn('id', $chunks->pluck('scribe_session_id')->unique())
                    ->get()
                    ->keyBy('id');

                foreach ($chunks as $chunk) {
                    $settings = $tenants->get($chunk->tenant_id)?->scribeSettings() ?? config('scribe.defaults');
                    $session = $sessions->get($chunk->scribe_session_id);

                    if (! $this->isDue($chunk, $session, $settings)) {
                        continue;
                    }

                    if (in_array($chunk->status, [ScribeAudioChunk::STATUS_PENDING, ScribeAudioChunk::STATUS_PROCESSING], true)) {
                        $chunk->forceFill([
                            'status' => ScribeAudioChunk::STATUS_FAILED,
                            'last_error' => 'Audio expired under the clinic retention setting before it was transcribed.',
                        ])->save();
                    }

                    $chunk->purgeAudio();
                    $purged++;
                    $perSession[$chunk->scribe_session_id][] = $chunk->tenant_id;
                }
            });

        foreach ($perSession as $sessionId => $tenantIds) {
            AuditEvent::create([
                'tenant_id' => $tenantIds[0],
                'user_id' => null,
                'action' => 'scribe.audio_purged',
                'resource_type' => ScribeSession::class,
                'resource_id' => $sessionId,
                'metadata' => ['chunks' => count($tenantIds), 'trigger' => 'retention_policy'],
            ]);

            ScribeSessionService::settle($sessionId);
        }

        return $purged;
    }

    private function isDue(ScribeAudioChunk $chunk, ?ScribeSession $session, array $settings): bool
    {
        if (! $session || $session->status === ScribeSession::STATUS_CONSENT_WITHDRAWN) {
            return true;
        }

        if ($chunk->status === ScribeAudioChunk::STATUS_DISCARDED) {
            return true;
        }

        if ($settings['audio_retention_mode'] === 'delete_after_transcription'
            && $chunk->status === ScribeAudioChunk::STATUS_TRANSCRIBED) {
            return true;
        }

        return $chunk->created_at->lte(now()->subHours((int) $settings['audio_retention_hours']));
    }
}
