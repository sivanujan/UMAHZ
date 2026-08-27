<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Notifications\ClinicVerificationCodeNotification;
use App\Support\EmailVerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ClinicEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_send_code_emails_a_code_and_starts_the_cooldown(): void
    {
        Notification::fake();

        $this->postJson('http://umahz.test/clinics/register/send-code', ['email' => 'new@example.com'])
            ->assertOk()
            ->assertJson(['sent' => true]);

        Notification::assertSentOnDemand(ClinicVerificationCodeNotification::class);
        $this->assertGreaterThan(0, EmailVerificationCode::remainingCooldown('new@example.com'));
    }

    public function test_send_code_refuses_an_already_registered_email(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('http://umahz.test/clinics/register/send-code', ['email' => 'taken@example.com'])
            ->assertStatus(422)
            ->assertJson(['sent' => false]);

        Notification::assertNothingSent();
    }

    public function test_verify_code_accepts_the_correct_code_and_rejects_a_wrong_one(): void
    {
        $code = EmailVerificationCode::generate('new@example.com');

        $this->postJson('http://umahz.test/clinics/register/verify-code', [
            'email' => 'new@example.com', 'code' => '000000',
        ])->assertOk()->assertJson(['verified' => false]);

        $this->postJson('http://umahz.test/clinics/register/verify-code', [
            'email' => 'new@example.com', 'code' => $code,
        ])->assertOk()->assertJson(['verified' => true]);

        $this->assertTrue(EmailVerificationCode::isVerified('new@example.com'));
    }

    public function test_a_code_is_burned_after_too_many_wrong_attempts(): void
    {
        EmailVerificationCode::generate('new@example.com');

        for ($i = 0; $i < EmailVerificationCode::MAX_ATTEMPTS; $i++) {
            EmailVerificationCode::verify('new@example.com', '000000');
        }

        // Even the correct code no longer works once the attempts are spent.
        $this->assertSame('expired', EmailVerificationCode::verify('new@example.com', '111111'));
    }

    public function test_registration_is_rejected_when_the_email_is_not_verified(): void
    {
        if (! extension_loaded('fileinfo')) {
            $this->markTestSkipped('ext-fileinfo is required for the license upload path.');
        }

        Storage::fake('local');

        $this->from('http://umahz.test/clinics/register')
            ->post('http://umahz.test/clinics/register', $this->payload())
            ->assertSessionHasErrors('email');

        $this->assertDatabaseCount('tenants', 0);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_verified_registration_creates_a_verified_user_without_a_link(): void
    {
        if (! extension_loaded('fileinfo')) {
            $this->markTestSkipped('ext-fileinfo is required for the license upload path.');
        }

        Storage::fake('local');
        Notification::fake();

        // Simulate the applicant having cleared the code step.
        Cache::put('clinic_verify:verified:'.hash('sha256', 'ada@example.com'), true, 1800);

        $this->post('http://umahz.test/clinics/register', $this->payload())
            ->assertSessionHasNoErrors();

        $user = User::where('email', 'ada@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->email_verified_at, 'User should start already-verified.');

        // No verification LINK should be sent (the code replaced it).
        Notification::assertNotSentTo($user, \App\Notifications\VerifyEmailNotification::class);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Ada Owner',
            'email' => 'ada@example.com',
            'password' => 'password1234',
            'password_confirmation' => 'password1234',
            'clinic_name' => 'Lotus Wellness',
            'subdomain' => 'lotus-wellness',
            'primary_contact_name' => 'Ada Owner',
            'primary_contact_email' => 'ada@example.com',
            'primary_contact_phone' => '+1 555 0100',
            'requested_disciplines' => ['massage_therapy'],
            'estimated_practitioner_count' => 3,
            'license_number' => 'LIC-123',
            'licensing_body' => 'CMTO',
            'license_document' => UploadedFile::fake()->create('license.pdf', 20, 'application/pdf'),
        ], $overrides);
    }
}
