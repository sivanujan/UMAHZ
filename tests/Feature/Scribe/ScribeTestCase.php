<?php

namespace Tests\Feature\Scribe;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\ConsentType;
use App\Models\ScribeSession;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Scribe\Contracts\DraftingProvider;
use App\Scribe\Contracts\TranscriptionProvider;
use App\Scribe\Drafting\FakeDraftingProvider;
use App\Scribe\FakeTranscriptionProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

abstract class ScribeTestCase extends TestCase
{
    use RefreshDatabase;

    protected FakeTranscriptionProvider $provider;

    protected FakeDraftingProvider $drafter;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        // Swap the provider via the contract — no network, deterministic output.
        $this->provider = new FakeTranscriptionProvider;
        $this->app->instance(TranscriptionProvider::class, $this->provider);

        $this->drafter = new FakeDraftingProvider;
        $this->app->instance(DraftingProvider::class, $this->drafter);
    }

    protected function clinic(string $sub, array $scribe = ['enabled' => true]): Tenant
    {
        $tenant = Tenant::create([
            'name' => ucfirst($sub).' Wellness Clinic',
            'slug' => $sub,
            'subdomain' => $sub,
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'email' => "contact@{$sub}.com",
            'requested_disciplines' => ['physiotherapy'],
            'scribe_settings' => $scribe,
        ]);

        // The clinic has supplied its own consent wording.
        ConsentType::ensureScribeTypeForTenant($tenant->id)->update([
            'body' => 'I consent to this appointment being audio-recorded and transcribed by an AI service to help my practitioner write their notes.',
        ]);

        return $tenant;
    }

    /** @return array{0: User, 1: StaffMembership} */
    protected function staff(Tenant $tenant, string $role = StaffMembership::ROLE_PRACTITIONER): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $membership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return [$user, $membership];
    }

    protected function client(Tenant $tenant): Client
    {
        return Client::create(['tenant_id' => $tenant->id, 'first_name' => 'Alice', 'last_name' => 'Walker']);
    }

    protected function appointment(Tenant $tenant, Client $client, StaffMembership $membership): Appointment
    {
        return Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'service_name' => 'Physio assessment',
            'starts_at' => now()->addHour(),
            'ends_at' => now()->addHours(2),
            'status' => Appointment::STATUS_CHECKED_IN,
        ]);
    }

    protected function url(Tenant $tenant, string $path): string
    {
        return "http://{$tenant->subdomain}.umahz.test/app/scribe{$path}";
    }

    protected function openSession(User $user, Tenant $tenant, Client $client, ?Appointment $appointment = null): TestResponse
    {
        return $this->actingAs($user)->postJson($this->url($tenant, '/sessions'), [
            'client_id' => $client->id,
            'appointment_id' => $appointment?->id,
        ]);
    }

    protected function giveConsent(User $user, Tenant $tenant, string $sessionId): TestResponse
    {
        return $this->actingAs($user)->postJson($this->url($tenant, "/sessions/{$sessionId}/consent"), [
            'signer_name' => 'Alice Walker',
            'signature_type' => 'typed',
            'signature_data' => 'Alice Walker',
            'confirmed' => true,
        ]);
    }

    protected function uploadChunk(User $user, Tenant $tenant, string $sessionId, int $sequence, int $durationMs = 12000): TestResponse
    {
        return $this->actingAs($user)->post($this->url($tenant, "/sessions/{$sessionId}/chunks"), [
            'audio' => UploadedFile::fake()->createWithContent("chunk-{$sequence}.webm", "fake-opus-audio-{$sequence}-".str_repeat('x', 2048)),
            'sequence' => $sequence,
            'duration_ms' => $durationMs,
            'offset_ms' => $sequence * $durationMs,
        ], ['Accept' => 'application/json']);
    }

    /**
     * Open + consent + start; returns the recording session.
     */
    protected function recordingSession(User $user, Tenant $tenant, Client $client, ?Appointment $appointment = null): ScribeSession
    {
        $id = $this->openSession($user, $tenant, $client, $appointment)->assertCreated()->json('session.id');
        $this->giveConsent($user, $tenant, $id)->assertOk();
        $this->actingAs($user)->postJson($this->url($tenant, "/sessions/{$id}/start"))->assertOk();

        return ScribeSession::withoutGlobalScopes()->findOrFail($id);
    }
}
