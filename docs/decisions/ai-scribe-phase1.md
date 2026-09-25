# Decision Log — AI Scribe, Phase 1

Feature: consent-gated encounter recording + near-live transcription + the foundation for profession-specific drafting.
Branch: `feature/ai-scribe-phase1`

---

## 1. Target workflow and what Phase 1 covers

```
Client consent -> Start Scribe -> Live transcription -> Profession-specific draft -> Practitioner reviews/edits -> Practitioner signs -> Finalized record
|----------------------- Phase 1 (this branch) -----------------------|-- Phase 2 --|---------- Phase 3 (Clinical Notes) ----------|
```

`scribe_sessions.status` models the whole flow:

| State | Phase | Meaning |
|---|---|---|
| `consent_pending` | 1 | Session opened; recording refused until a valid consent is linked |
| `recording` / `paused` | 1 | Browser is capturing; chunks accepted only while `recording` |
| `transcribing` | 1 | Stopped; remaining chunks still being transcribed |
| `transcript_ready` | 1 | Every chunk settled (transcribed / failed / discarded) |
| `draft_ready` | 2 | A DraftingProvider has proposed a structured draft |
| `handed_off` | 3 | A **draft** `ClinicalNote` was created from it for review/sign |
| `consent_withdrawn` | any | Terminal. Capture stopped, untranscribed audio discarded |

There is deliberately **no finalized/signed state in Scribe**. Finalizing and signing stay exclusively in `ClinicalNoteController::finalize` behind `ClinicalNotePolicy`. Scribe code never writes to `clinical_notes`; `scribe_sessions.clinical_note_id` is the Phase 3 seam.

## 2. Key decisions

1. **Laravel only, providers behind contracts** (same approach as `PatientBilling\Contracts\PaymentProvider`):
   - `App\Scribe\Contracts\TranscriptionProvider` has two implementations: `AssemblyAiTranscriptionProvider` and `FakeTranscriptionProvider` (tests / no-network local use).
   - `AssemblyAiTranscriptionProvider` uses the Laravel HTTP client, so there's no new Composer dependency and no Python. It follows the same flow as the AssemblyAI Python SDK: upload → create transcript → poll. It then deletes the transcript from AssemblyAI so patient audio and text don't linger there.
   - AssemblyAI replaced an earlier OpenAI Whisper implementation at the product owner's request.
   - `App\Scribe\Contracts\DraftingProvider` is implemented in Phase 2 by `OpenRouterDraftingProvider` (Claude Haiku 4.5 via OpenRouter) and `FakeDraftingProvider` (tests). See section 8.
   - `App\Scribe\Contracts\ObjectiveMeasurementSource` is a Phase 4 placeholder for UMAHZ Motion results, bound to `NullObjectiveMeasurementSource`.
   - The driver is selected in `config/scribe.php` and bound in `AppServiceProvider`. Swapping to a Canadian-hosted provider means a new class plus a config change, with no Scribe code changes.
2. **Consent reuses the Consent module.** A new consent type code, `ai_scribe_recording`, is created lazily per tenant. As with the other defaults, the body stays `null` until the clinic writes its own wording, and recording is impossible until then. Each session captures a fresh signed, immutable, versioned `Consent`. The new `consents.appointment_id` scopes it to the encounter.
   - Consent creation and withdrawal were extracted from `ConsentController` into `App\Services\ConsentRecorder`. The client profile and Scribe now share one code path.
   - The gate lives in `ScribeSession::hasValidConsent()`. It requires the linked consent to be active, of the Scribe type, for the same tenant and client, and for the same appointment. It is re-checked on every recording request, **before** audio is sent to the provider, and **again before** the transcript is saved.
   - Withdrawal from the panel, or from the client profile, closes the session and discards untranscribed chunks without ever sending them. All raw audio is purged. Text transcribed while consent was valid is kept for the practitioner's record-keeping decision; Phase 3 adds an explicit "discard transcript" action if clinic policy requires it.
3. **Self-contained chunks.** The browser restarts `MediaRecorder` every 12s rather than using `timeslice`, because timeslice blobs after the first lack the container header and can't be decoded on their own. Each chunk is independently transcribable and retryable. Order is guaranteed by `sequence` (unique per session), not by arrival time, so parallel workers are safe.
4. **Near-live updates by polling** (every 2.5s, only while `recording`/`paused`/`transcribing`, fetching `?after_sequence=N`). UMAHZ has no broadcasting stack (`BROADCAST_CONNECTION=null`). Polling needs no Reverb/Pusher process, is robust on flaky clinic Wi-Fi, and a few seconds of latency doesn't matter for a transcript that exists for later review.
5. **Queued transcription** (`App\Jobs\TranscribeAudioChunk`). Transient provider errors (timeout, 408/409/429, 5xx) are released with backoff for up to `SCRIBE_MAX_ATTEMPTS` attempts. Permanent errors mark the chunk `failed`; its audio is kept inside the retention window, and the practitioner can press **Retry**. Existing segments are never touched by a failure. The job timeout (80s) sits below the queue's `retry_after` (90s).
6. **Provenance from day one.**
   - `scribe_transcript_segments.source = ai_transcription`: machine transcription of what was said, never a finding.
   - `speaker_role` is reserved for future diarization (client / practitioner).
   - `scribe_draft_items` is created now and stays empty in Phase 1. Each row has exactly one `provenance` (`client_reported | practitioner_entered | objective_measurement | ai_generated`), `evidence` pointers (segment ids, Motion result ids), `generator` metadata, and a `review_status`. Sources are stored side by side, never merged.
7. **Encryption at rest.** Audio files are encrypted with the app key (`Crypt::encryptString`) on the private `local` disk. Transcript and draft text use Eloquent `encrypted` casts.
8. **Scribe is off per clinic by default** (`tenants.scribe_settings.enabled = false`). An owner turns it on in Settings → AI Scribe, where the data-residency notice is shown.

## 3. Security & privacy

- **Tenant isolation:** `BelongsToTenant` on every Scribe model, an explicit `tenant_id === current tenant` check in the controller (route-model binding runs before tenant context), and `ScribeSessionPolicy` re-checks the tenant.
- **Access:**
  - The session's practitioner can record and view.
  - The clinic owner can view and withdraw consent, but can't record someone else's encounter.
  - Other practitioners can't access the session.
  - Receptionists are refused by route middleware (`staff.role:practitioner,clinic_owner`) **and** by the policy.
- **Audit (`audit_events`):**
  - Consent and session lifecycle: `scribe.session_created`, `scribe.consent_captured` (+ `consent.recorded`), `scribe.session_started/paused/resumed/stopped`, `scribe.consent_withdrawn` (+ `consent.withdrawn`).
  - Access and refusals: `scribe.transcript_viewed` (de-duplicated per user+session per 10 minutes so polling doesn't flood the log), `scribe.recording_refused`.
  - Maintenance: `scribe.chunks_retried`, `scribe.audio_purged`, `scribe.settings_updated`.
- **IDs and writes:** UUIDs everywhere, no sequential IDs in URLs, and writes run inside `DB::transaction`.
- **Time zones:** timestamps are stored in UTC and shown in the clinic time zone.
- **Raw-audio retention** is set per clinic:
  - `delete_after_transcription` (default) deletes each chunk's audio the moment it is transcribed. Audio that failed or was abandoned is purged after `audio_retention_hours` (default 24) as a safety net.
  - `retain_window` keeps all audio for `audio_retention_hours` (1–168).
  - `scribe:purge-audio` runs hourly. Transcripts are clinical-record material and are not purged.

> **DATA RESIDENCY — TODO before real patient use.** With `SCRIBE_TRANSCRIPTION_DRIVER=assemblyai`, audio is sent to AssemblyAI's servers (US by default; set `ASSEMBLYAI_BASE_URL=https://api.eu.assemblyai.com` for the EU region). Review the provider (PHIPA / PIPEDA / provincial rules, retention, DPA/BAA, zero-data-retention options) before recording real clients. If it doesn't pass, implement `TranscriptionProvider` for a compliant (e.g. Canadian-hosted) service and switch the driver.

## 4. Environment

```
SCRIBE_TRANSCRIPTION_DRIVER=assemblyai   # or "fake" for local UI work with no network
ASSEMBLYAI_API_KEY=...                   # required
ASSEMBLYAI_BASE_URL=https://api.assemblyai.com   # EU: https://api.eu.assemblyai.com
ASSEMBLYAI_LANGUAGE=en                   # or fr, ... or "auto"
SCRIBE_QUEUE=default
# optional: ASSEMBLYAI_SPEECH_MODEL=  ASSEMBLYAI_TIMEOUT=30  ASSEMBLYAI_MAX_WAIT_SECONDS=60
#           ASSEMBLYAI_POLL_INTERVAL_MS=1000  SCRIBE_MAX_ATTEMPTS=4  SCRIBE_MAX_CHUNK_KB=5120  SCRIBE_AUDIO_DISK=local
SCRIBE_DRAFTING_DRIVER=openrouter       # or "fake" (tests)
OPENROUTER_API_KEY=sk-or-...             # required for the AI draft
OPENROUTER_MODEL=anthropic/claude-haiku-4.5
# optional: OPENROUTER_MAX_TOKENS=3000  OPENROUTER_TIMEOUT=60  OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

Run `php artisan migrate` and `php artisan config:clear` after deploying.

## 5. Server: queue worker and scheduler

Transcription uses the existing `database` queue and the existing `umahz-worker` systemd service (see `appointment-confirmation-emails.md`). Nothing new is required as long as the worker listens on the queue in `SCRIBE_QUEUE` (default `default`). If you set a dedicated queue such as `SCRIBE_QUEUE=scribe`, change `ExecStart` to:

```
/usr/bin/php /var/www/umahz/artisan queue:work database --queue=scribe,default --sleep=1 --tries=3 --max-time=3600 --timeout=90
```

The job sets its own `$tries` and `$timeout`, which override the worker flags for this job. `--sleep=1` keeps transcripts snappy. Run 2+ worker processes (e.g. `umahz-worker@1`, `@2`) if several practitioners record at once. After each deploy, run `php artisan queue:restart`.

Raw-audio cleanup runs from the scheduler (`scribe:purge-audio`, hourly). This needs the standard cron entry, which already exists for `registrations:prune-expired`:

```
* * * * * cd /var/www/umahz && php artisan schedule:run >> /dev/null 2>&1
```

## 6. Testing

Automated tests (`tests/Feature/Scribe`, fake provider bound through the contract, no network) cover:
- Refusal without consent.
- Encounter-scoped consent.
- Consent withdrawal, both in the panel and on the client profile, and queued audio never reaching the provider after withdrawal.
- In-order assembly under out-of-order completion.
- Retry and failure handling without text loss.
- Cross-clinic isolation, receptionist, other-practitioner and owner access.
- No auto-finalize.
- Per-clinic retention and cleanup.
- Encryption at rest.
- Provider swap, plus the AssemblyAI upload/poll/delete flow, error classification, timeout and missing-key behaviour via `Http::fake`.

```
php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/phpunit tests/Feature/Scribe
```

(The local PHP build ships `pdo_sqlite` but doesn't enable it in php.ini. `artisan test` starts a child process, so call phpunit directly with the flag.)

**Manual test with real AssemblyAI:**

1. Set `ASSEMBLYAI_API_KEY` and `SCRIBE_TRANSCRIPTION_DRIVER=assemblyai`, then run `php artisan config:clear` and restart any running queue worker.
2. Run `php artisan migrate` and start a worker: `php artisan queue:work --sleep=1`. With `QUEUE_CONNECTION=sync` no worker is needed, but each upload then waits for AssemblyAI.
3. As the clinic owner, open Settings → AI Scribe, enable it, then use **Configure consent** to enter the clinic's recording-consent wording.
4. **The microphone needs a secure context.** `http://<clinic>.lvh.me:8000` is not one. For local testing either:
   - serve over HTTPS, or
   - in Chrome open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add `http://<clinic>.lvh.me:8000`, and relaunch.
   The panel explains this if it happens.
5. As a practitioner, go to My Appointments → **Start Scribe**, capture consent, then Start. Speak; text appears roughly every 12–15s. Try Pause/Resume, Stop, and "Client withdraws consent".

## 7. Next phases

| Phase | Scope | Plug-in point |
|---|---|---|
| 2 | **Built** — see section 8. | `DraftingProvider`, `scribe_draft_items` |
| 3 | Review and sign hand-off. Create a **draft** `ClinicalNote` through the existing Clinical Notes flow, pre-filled from accepted draft items, with provenance badges in the editor. The practitioner edits, then finalizes and signs as today, with addenda afterwards. `draft_ready → handed_off`. Optional "discard transcript". | `scribe_sessions.clinical_note_id`, `ClinicalNotePolicy` unchanged |
| 3+ | Speaker diarization, so client-reported and practitioner speech are labelled separately | `scribe_transcript_segments.speaker_role` |
| 4 | Approved UMAHZ Motion results pulled in as objective data, stored as `objective_measurement` items, never re-worded by AI | `ObjectiveMeasurementSource`, `ObjectiveMeasurement` |
| — | Compliant (e.g. Canadian-hosted) transcription provider after privacy review | `TranscriptionProvider` |

## 8. Phase 2 — profession-specific AI draft (built)

**Flow.** When the transcript is ready, the practitioner presses **Generate AI draft**.
1. `POST /app/scribe/sessions/{id}/draft` checks: record policy, valid consent, status `transcript_ready`/`draft_ready`, and a transcript exists. It then queues `GenerateScribeDraft`.
2. `ScribeDraftService` resolves the clinic's active `ClinicalNoteTemplate` for the session's discipline snapshot (starter template created if missing). Each discipline — Massage, Physiotherapy, Chiropractic, TCM, custom — therefore gets its own structure.
3. `OpenRouterDraftingProvider` sends the discipline, the template fields (ids, labels, types, options) and the numbered transcript. The prompt lives in `DraftPrompt` (versioned `scribe-draft-v1`).
4. The model answers with JSON: fields → items, each with `text`, `source` and `evidence` (transcript segment numbers).
5. The answer is **untrusted** and validated before saving:
   - unknown field ids are dropped;
   - select/radio/multiselect values must match a real option (case-insensitive), and single-choice fields keep one answer;
   - evidence must point at real segments;
   - the model may only assign `client_reported`, `practitioner_stated` or `ai_generated`, and a "client/practitioner said it" claim without valid evidence is downgraded to `ai_generated`.
6. Items are stored in `scribe_draft_items` (encrypted content, provenance, evidence with segment ids, generator model + prompt version, `review_status = proposed`). The template is snapshotted on the session. `transcript_ready → draft_ready`.

**Regenerate** creates a new `draft_version`; older versions stay as history. Consent is re-checked before sending and again before saving. Failures (no key, out of credits, bad JSON, timeout) set `draft_status = failed` with a clear message; the transcript is untouched. Audit: `scribe.draft_requested`, `scribe.draft_generated` (model, tokens, cost), `scribe.draft_failed`.

**Provenance labels.** `practitioner_stated` was added for what the practitioner said aloud (captured in the transcript), kept separate from `practitioner_entered` (typed by the practitioner, Phase 3) and `objective_measurement` (Motion, Phase 4).

**Why OpenRouter + Claude Haiku 4.5.** Low cost ($1 / $5 per million input/output tokens at the time of writing) and fast; a 30-minute session is roughly 8k input + 1.2k output tokens, about $0.014 per draft. The model is one env line (`OPENROUTER_MODEL`), e.g. `anthropic/claude-sonnet-5` if quality needs it. Requests set `provider.data_collection = "deny"` so OpenRouter only routes to hosts that don't collect/train on data. The client's name is never sent.

**Reopening.** Opening Scribe again for the same encounter returns to a session that is `transcript_ready` or `draft_ready`, instead of starting a new one, until it is handed off.

## 9. Phase 3 — hand-off to Clinical Notes (built)

**Use this draft in the clinical note** (`POST /app/scribe/sessions/{id}/handoff`, record policy, status `draft_ready`). `ScribeHandoffService` then does the following, inside one transaction with the session row locked:
1. **Picks the note:** the note already linked to the session, else the appointment's existing note (Clinical Notes allows one per appointment), else a new **draft** `ClinicalNote` on the template snapshot the draft was written for.
2. **Refuses** a finalized/addended note (409: "add an addendum instead"), a note for another client, or a note the user can't `update` under `ClinicalNotePolicy`.
3. **Fills only empty fields** from the latest draft version (rejected items excluded):
   - long text: items joined with new lines;
   - short text: joined with "; ";
   - select/radio: the single option;
   - multiselect: the list.
   Anything the practitioner already typed is kept and recorded as `skipped`.
4. **Saves the note as `draft`, always.** It never sets `finalized_at`/`signed_at`.
5. **Moves the session** `draft_ready → handed_off` (terminal) and stores `clinical_note_id`, `handed_off_at`, `handed_off_by_user_id`, and `handoff_fields` (draft version, filled, skipped).
6. **Audits** `scribe.handed_off`, plus `clinical_note.created` with `source: ai_scribe` when a note was created.

**Editor.** `ClinicalNoteController@edit` passes `scribeHandoff` (only to roles allowed `viewBody`). The editor shows a "Pre-filled from AI Scribe — review every field before signing" banner, and a source badge on every pre-filled field (Client said / Practitioner said / AI wrote).

**Signing.** Signing, immutability and addenda are unchanged; the practitioner signs with the existing **Sign & Finalize**.

**Not built yet.** Per-item accept/edit/reject inside the panel (`review_status` is ready for it), speaker diarization, and Motion data (Phase 4).
