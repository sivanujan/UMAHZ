<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class NotDisposableEmail implements ValidationRule
{
    /**
     * Determine if an email belongs to a disposable or temporary email provider.
     */
    public static function isDisposable(?string $email): bool
    {
        if (! $email || ! str_contains($email, '@')) {
            return false;
        }

        $domain = strtolower(trim(substr(strrchr($email, '@'), 1)));

        if ($domain === '') {
            return false;
        }

        $allowed = array_map('strtolower', config('disposable_email.allowed', []));
        if (in_array($domain, $allowed, true)) {
            return false;
        }

        $blockedDomains = array_merge(
            config('disposable_email.domains', []),
            config('disposable_email.additional_blocked', [])
        );

        foreach ($blockedDomains as $blocked) {
            $blocked = strtolower(trim($blocked));
            if ($blocked === '') {
                continue;
            }

            if ($domain === $blocked || str_ends_with($domain, '.'.$blocked)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        if (self::isDisposable($value)) {
            $fail('Temporary or disposable email addresses are not permitted. Please use a valid personal or business email.');
        }
    }
}
