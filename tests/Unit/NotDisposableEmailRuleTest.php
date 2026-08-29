<?php

namespace Tests\Unit;

use App\Rules\NotDisposableEmail;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class NotDisposableEmailRuleTest extends TestCase
{
    public function test_accepts_legitimate_email_domains(): void
    {
        $validEmails = [
            'user@gmail.com',
            'doctor@hospital.org',
            'contact@clinic.co.uk',
            'jane.smith@outlook.com',
            'support@umahz.health',
        ];

        foreach ($validEmails as $email) {
            $validator = Validator::make(
                ['email' => $email],
                ['email' => ['required', 'email', new NotDisposableEmail]]
            );

            $this->assertFalse(
                $validator->fails(),
                "Failed validating legitimate email: {$email}"
            );
        }
    }

    public function test_rejects_common_temporary_and_disposable_email_domains(): void
    {
        $disposableEmails = [
            'tester@mailinator.com',
            'someone@10minutemail.com',
            'anonymous@guerrillamail.com',
            'user@temp-mail.org',
            'throwaway@yopmail.com',
            'junk@trashmail.com',
            'fake@dispostable.com',
            'anon@sharklasers.com',
            'bot@nada.ltd',
        ];

        foreach ($disposableEmails as $email) {
            $validator = Validator::make(
                ['email' => $email],
                ['email' => ['required', 'email', new NotDisposableEmail]]
            );

            $this->assertTrue(
                $validator->fails(),
                "Failed to block disposable email: {$email}"
            );

            $this->assertStringContainsString(
                'disposable',
                $validator->errors()->first('email')
            );
        }
    }

    public function test_rejects_subdomains_of_disposable_domains(): void
    {
        $email = 'user@sub.mailinator.com';

        $validator = Validator::make(
            ['email' => $email],
            ['email' => ['required', 'email', new NotDisposableEmail]]
        );

        $this->assertTrue($validator->fails());
    }

    public function test_respects_allowed_whitelist(): void
    {
        config(['disposable_email.allowed' => ['mailinator.com']]);

        $validator = Validator::make(
            ['email' => 'whitelisted@mailinator.com'],
            ['email' => ['required', 'email', new NotDisposableEmail]]
        );

        $this->assertFalse($validator->fails());
    }

    public function test_respects_additional_blocked_domains(): void
    {
        config(['disposable_email.additional_blocked' => ['custom-disposable-service.xyz']]);

        $validator = Validator::make(
            ['email' => 'user@custom-disposable-service.xyz'],
            ['email' => ['required', 'email', new NotDisposableEmail]]
        );

        $this->assertTrue($validator->fails());
    }
}
