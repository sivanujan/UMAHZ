<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Pre-registration email verification codes for the clinic signup wizard.
 *
 * The applicant proves ownership of their email BEFORE the User account
 * exists, so state can't live on the user — it lives in the cache, keyed by a
 * hash of the normalised email, and expires on its own. A separate short-lived
 * "verified" marker records that a given email cleared the check; store() must
 * confirm that marker server-side (the client gate is not trusted).
 */
class EmailVerificationCode
{
    public const TTL = 600;                 // code lifetime: 10 minutes
    public const RESEND_COOLDOWN = 60;      // seconds between sends per email
    public const MAX_ATTEMPTS = 5;          // wrong tries before the code is burned
    public const VERIFIED_TTL = 1800;       // verified marker lifetime: 30 minutes

    protected static function normalize(string $email): string
    {
        return strtolower(trim($email));
    }

    protected static function key(string $suffix, string $email): string
    {
        return 'clinic_verify:'.$suffix.':'.hash('sha256', static::normalize($email));
    }

    /**
     * Seconds the caller must still wait before another code may be sent, or 0.
     */
    public static function remainingCooldown(string $email): int
    {
        $until = Cache::get(static::key('cooldown', $email));

        return $until ? max(0, $until - time()) : 0;
    }

    /**
     * Generate, store and return a fresh 6-digit code, and start the resend
     * cooldown. Caller is responsible for delivering the returned code.
     */
    public static function generate(string $email): string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put(static::key('code', $email), ['code' => $code, 'attempts' => 0], static::TTL);
        Cache::put(static::key('cooldown', $email), time() + static::RESEND_COOLDOWN, static::RESEND_COOLDOWN);

        return $code;
    }

    /**
     * Check a submitted code.
     *
     * @return string one of: 'ok', 'expired', 'mismatch', 'locked'
     */
    public static function verify(string $email, string $code): string
    {
        $key = static::key('code', $email);
        $entry = Cache::get($key);

        if (! $entry) {
            return 'expired';
        }

        if (hash_equals($entry['code'], trim($code))) {
            Cache::forget($key);
            Cache::put(static::key('verified', $email), true, static::VERIFIED_TTL);

            return 'ok';
        }

        $entry['attempts']++;

        if ($entry['attempts'] >= static::MAX_ATTEMPTS) {
            Cache::forget($key);

            return 'locked';
        }

        // Preserve the remaining lifetime rather than resetting it.
        Cache::put($key, $entry, static::TTL);

        return 'mismatch';
    }

    public static function isVerified(string $email): bool
    {
        return (bool) Cache::get(static::key('verified', $email));
    }

    /**
     * Drop every marker for an email — called once registration completes.
     */
    public static function clear(string $email): void
    {
        Cache::forget(static::key('code', $email));
        Cache::forget(static::key('cooldown', $email));
        Cache::forget(static::key('verified', $email));
    }
}
