<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Tenant-scoped email verification codes and short-lived verified sessions
 * for the public patient-facing invoice pay portal.
 *
 * Prevents enumeration, timing attacks, and brute force via rate-limiting,
 * attempt counting, single-use code burning, and strict tenant scoping.
 */
class PatientPayOtp
{
    public const TTL = 600;                 // 10 minutes code validity
    public const RESEND_COOLDOWN = 60;      // 60s resend cooldown
    public const MAX_ATTEMPTS = 5;          // Wrong tries before code lockout
    public const SESSION_TTL = 1800;        // 30 minutes verified session lifetime

    public static function normalize(string $email): string
    {
        return strtolower(trim($email));
    }

    protected static function key(string $type, string $tenantId, string $identifier): string
    {
        $hashed = hash('sha256', $identifier);

        return "patient_pay_otp:{$type}:{$tenantId}:{$hashed}";
    }

    /**
     * Seconds remaining before another code may be sent to this email at this clinic.
     */
    public static function remainingCooldown(string $tenantId, string $email): int
    {
        $key = static::key('cooldown', $tenantId, static::normalize($email));
        $until = Cache::get($key);

        return $until ? max(0, (int) $until - time()) : 0;
    }

    /**
     * Generate, cache and return a fresh 6-digit numeric OTP code and set cooldown.
     */
    public static function generate(string $tenantId, string $email): string
    {
        $normalized = static::normalize($email);
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put(
            static::key('code', $tenantId, $normalized),
            ['code' => $code, 'attempts' => 0],
            static::TTL
        );

        Cache::put(
            static::key('cooldown', $tenantId, $normalized),
            time() + static::RESEND_COOLDOWN,
            static::RESEND_COOLDOWN
        );

        return $code;
    }

    /**
     * Check a submitted verification code. On match, burns the code and returns
     * a secure session token.
     *
     * @return array{status: string, token: ?string} status: 'ok' | 'expired' | 'mismatch' | 'locked'
     */
    public static function verify(string $tenantId, string $email, string $code): array
    {
        $normalized = static::normalize($email);
        $codeKey = static::key('code', $tenantId, $normalized);
        $entry = Cache::get($codeKey);

        if (! $entry || ! is_array($entry)) {
            return ['status' => 'expired', 'token' => null];
        }

        if (hash_equals((string) $entry['code'], trim($code))) {
            Cache::forget($codeKey);

            $token = Str::random(64);
            $sessionKey = static::key('session', $tenantId, $token);
            Cache::put($sessionKey, [
                'email' => $normalized,
                'tenant_id' => $tenantId,
                'verified_at' => time(),
            ], static::SESSION_TTL);

            return ['status' => 'ok', 'token' => $token];
        }

        $entry['attempts'] = ((int) ($entry['attempts'] ?? 0)) + 1;

        if ($entry['attempts'] >= static::MAX_ATTEMPTS) {
            Cache::forget($codeKey);

            return ['status' => 'locked', 'token' => null];
        }

        Cache::put($codeKey, $entry, static::TTL);

        return ['status' => 'mismatch', 'token' => null];
    }

    /**
     * Verify that a given session token is valid for this tenant, returning
     * the verified email address or null.
     */
    public static function validateSessionToken(string $tenantId, ?string $token): ?string
    {
        if (! $token) {
            return null;
        }

        $sessionKey = static::key('session', $tenantId, $token);
        $entry = Cache::get($sessionKey);

        if (! $entry || ! is_array($entry)) {
            return null;
        }

        if (($entry['tenant_id'] ?? null) !== $tenantId) {
            return null;
        }

        return $entry['email'] ?? null;
    }

    /**
     * Drop OTP and session markers for an email or token.
     */
    public static function clear(string $tenantId, string $email, ?string $token = null): void
    {
        $normalized = static::normalize($email);
        Cache::forget(static::key('code', $tenantId, $normalized));
        Cache::forget(static::key('cooldown', $tenantId, $normalized));

        if ($token) {
            Cache::forget(static::key('session', $tenantId, $token));
        }
    }
}
