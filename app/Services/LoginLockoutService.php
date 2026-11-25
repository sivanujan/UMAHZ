<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\User;
use App\Notifications\AccountLockedNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class LoginLockoutService
{
    private const CACHE_TTL_SECONDS = 86400; // 24 hours

    /**
     * Check whether (email + IP) or the account globally is currently locked.
     * Returns remaining lockout seconds, or null if not locked.
     */
    public function checkLockout(string $email, string $ip): ?int
    {
        $normalizedEmail = $this->normalizeEmail($email);
        $now = now()->timestamp;

        $accountRemaining = 0;
        $accountState = Cache::get($this->accountKey($normalizedEmail), []);
        if (! empty($accountState['locked_until']) && (int) $accountState['locked_until'] > $now) {
            $accountRemaining = (int) $accountState['locked_until'] - $now;
        }

        $pairRemaining = 0;
        $pairKey = $this->pairKey($normalizedEmail, $ip);
        $pairState = Cache::get($pairKey, []);
        if (! empty($pairState['locked_until'])) {
            if ((int) $pairState['locked_until'] > $now) {
                $pairRemaining = (int) $pairState['locked_until'] - $now;
            } else {
                // Lock expired: clear locked_until while keeping stage so the
                // next set of failures escalates to the longer lockout.
                $pairState['locked_until'] = null;
                Cache::put($pairKey, $pairState, self::CACHE_TTL_SECONDS);
            }
        }

        $maxRemaining = max($accountRemaining, $pairRemaining);

        return $maxRemaining > 0 ? $maxRemaining : null;
    }

    /**
     * Record a failed password attempt for (email + IP) and globally for the account.
     * Returns remaining lockout seconds if a lockout is now active, otherwise null.
     */
    public function recordFailure(string $email, string $ip, ?string $tenantId = null): ?int
    {
        $normalizedEmail = $this->normalizeEmail($email);
        $now = now()->timestamp;

        $user = User::whereRaw('LOWER(email) = ?', [$normalizedEmail])->first();

        Log::warning('auth.login_failed', [
            'email' => $normalizedEmail,
            'ip' => $ip,
            'tenant_id' => $tenantId,
        ]);

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $user?->id,
            'action' => 'auth.login_failed',
            'resource_type' => User::class,
            'resource_id' => $user?->id,
            'ip_address' => $ip,
            'metadata' => [
                'email' => $normalizedEmail,
            ],
        ]);

        // 1. Progressive per (email + IP) tracking
        $pairKey = $this->pairKey($normalizedEmail, $ip);
        $this->trackPairKey($normalizedEmail, $pairKey);

        $pairState = Cache::get($pairKey, [
            'attempts' => 0,
            'stage' => 0,
            'locked_until' => null,
        ]);

        if (! empty($pairState['locked_until']) && (int) $pairState['locked_until'] <= $now) {
            $pairState['locked_until'] = null;
        }

        $pairState['attempts'] = ((int) ($pairState['attempts'] ?? 0)) + 1;

        $firstAttempts = (int) config('auth_security.first_lockout_attempts', 5);
        $firstMinutes = (int) config('auth_security.first_lockout_minutes', 15);
        $secondAttempts = (int) config('auth_security.second_lockout_attempts', 5);
        $secondMinutes = (int) config('auth_security.second_lockout_minutes', 60);

        $newlyLockedMinutes = null;

        if ((int) ($pairState['stage'] ?? 0) === 0 && $pairState['attempts'] >= $firstAttempts) {
            $pairState['stage'] = 1;
            $pairState['attempts'] = 0;
            $pairState['locked_until'] = $now + ($firstMinutes * 60);
            $newlyLockedMinutes = $firstMinutes;
            $this->logLockout($user, $normalizedEmail, $ip, $tenantId, 'ip_pair', $firstMinutes);
        } elseif ((int) ($pairState['stage'] ?? 0) >= 1 && $pairState['attempts'] >= $secondAttempts) {
            $pairState['stage'] = 2;
            $pairState['attempts'] = 0;
            $pairState['locked_until'] = $now + ($secondMinutes * 60);
            $newlyLockedMinutes = $secondMinutes;
            $this->logLockout($user, $normalizedEmail, $ip, $tenantId, 'ip_pair', $secondMinutes);
        }

        Cache::put($pairKey, $pairState, self::CACHE_TTL_SECONDS);

        // 2. Distributed account-level tracking across all IPs
        $accountKey = $this->accountKey($normalizedEmail);
        $accountState = Cache::get($accountKey, [
            'failures' => [],
            'locked_until' => null,
            'notified_until' => null,
        ]);

        $windowSeconds = ((int) config('auth_security.account_lockout_window_minutes', 60)) * 60;
        $failures = array_values(array_filter(
            $accountState['failures'] ?? [],
            fn ($entry) => is_array($entry) && isset($entry['at']) && ($now - (int) $entry['at']) <= $windowSeconds
        ));
        $failures[] = ['ip' => $ip, 'at' => $now];
        $accountState['failures'] = $failures;

        $accountLimit = (int) config('auth_security.account_lockout_attempts', 20);
        $accountLockMinutes = (int) config('auth_security.account_lockout_minutes', 60);

        if (count($failures) >= $accountLimit && (empty($accountState['locked_until']) || (int) $accountState['locked_until'] <= $now)) {
            $accountState['locked_until'] = $now + ($accountLockMinutes * 60);
            $newlyLockedMinutes = max($newlyLockedMinutes ?? 0, $accountLockMinutes);
            $distinctIps = count(array_unique(array_column($failures, 'ip')));
            $this->logLockout($user, $normalizedEmail, $ip, $tenantId, 'account_distributed', $accountLockMinutes, $distinctIps);
        }

        // Send lockout email at most once per active lock window
        $activeLockUntil = max((int) ($pairState['locked_until'] ?? 0), (int) ($accountState['locked_until'] ?? 0));
        if ($newlyLockedMinutes !== null && $user && (int) ($accountState['notified_until'] ?? 0) < $activeLockUntil) {
            $accountState['notified_until'] = $activeLockUntil;
            $user->notify(new AccountLockedNotification($ip, now(), $newlyLockedMinutes));
        }

        Cache::put($accountKey, $accountState, self::CACHE_TTL_SECONDS);

        return $this->checkLockout($normalizedEmail, $ip);
    }

    /**
     * Clear per-(email + IP) failure counter on a successful login.
     */
    public function clearOnSuccess(string $email, string $ip): void
    {
        $normalizedEmail = $this->normalizeEmail($email);
        Cache::forget($this->pairKey($normalizedEmail, $ip));
    }

    /**
     * Clear all locks (per-IP and account-wide) for an email address.
     */
    public function unlockAccount(string $email, ?User $unlockedBy = null, ?string $ip = null, ?string $tenantId = null): void
    {
        $normalizedEmail = $this->normalizeEmail($email);

        $pairListKey = $this->pairListKey($normalizedEmail);
        $pairKeys = Cache::get($pairListKey, []);
        if (is_array($pairKeys)) {
            foreach ($pairKeys as $key) {
                Cache::forget($key);
            }
        }
        Cache::forget($pairListKey);
        Cache::forget($this->accountKey($normalizedEmail));

        $targetUser = User::whereRaw('LOWER(email) = ?', [$normalizedEmail])->first();

        Log::info('auth.account_unlocked', [
            'email' => $normalizedEmail,
            'unlocked_by' => $unlockedBy?->email ?? 'password_reset',
            'ip' => $ip,
        ]);

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $unlockedBy?->id ?? $targetUser?->id,
            'action' => 'auth.account_unlocked',
            'resource_type' => User::class,
            'resource_id' => $targetUser?->id,
            'ip_address' => $ip,
            'metadata' => [
                'target_email' => $normalizedEmail,
                'unlocked_by_user_id' => $unlockedBy?->id,
                'unlocked_by_email' => $unlockedBy?->email ?? 'password_reset',
            ],
        ]);
    }

    /**
     * Check if an account currently has an active global or per-IP lock.
     */
    public function isAccountLocked(string $email): bool
    {
        $normalizedEmail = $this->normalizeEmail($email);
        $now = now()->timestamp;

        $accountState = Cache::get($this->accountKey($normalizedEmail), []);
        if (! empty($accountState['locked_until']) && (int) $accountState['locked_until'] > $now) {
            return true;
        }

        $pairKeys = Cache::get($this->pairListKey($normalizedEmail), []);
        if (is_array($pairKeys)) {
            foreach ($pairKeys as $key) {
                $state = Cache::get($key, []);
                if (! empty($state['locked_until']) && (int) $state['locked_until'] > $now) {
                    return true;
                }
            }
        }

        return false;
    }

    private function logLockout(
        ?User $user,
        string $email,
        string $ip,
        ?string $tenantId,
        string $scope,
        int $minutes,
        ?int $distinctIps = null
    ): void {
        Log::warning('auth.account_locked', [
            'email' => $email,
            'ip' => $ip,
            'scope' => $scope,
            'duration_minutes' => $minutes,
            'distinct_ips' => $distinctIps,
        ]);

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $user?->id,
            'action' => 'auth.account_locked',
            'resource_type' => User::class,
            'resource_id' => $user?->id,
            'ip_address' => $ip,
            'metadata' => array_filter([
                'email' => $email,
                'scope' => $scope,
                'duration_minutes' => $minutes,
                'distinct_ips' => $distinctIps,
            ], fn ($v) => $v !== null),
        ]);
    }

    private function trackPairKey(string $normalizedEmail, string $pairKey): void
    {
        $listKey = $this->pairListKey($normalizedEmail);
        $keys = Cache::get($listKey, []);
        if (! is_array($keys)) {
            $keys = [];
        }
        if (! in_array($pairKey, $keys, true)) {
            $keys[] = $pairKey;
            Cache::put($listKey, $keys, self::CACHE_TTL_SECONDS);
        }
    }

    private function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    private function pairKey(string $normalizedEmail, string $ip): string
    {
        return 'auth_lockout:pair:'.hash('sha256', $normalizedEmail.'|'.$ip);
    }

    private function pairListKey(string $normalizedEmail): string
    {
        return 'auth_lockout:pairs:'.hash('sha256', $normalizedEmail);
    }

    private function accountKey(string $normalizedEmail): string
    {
        return 'auth_lockout:account:'.hash('sha256', $normalizedEmail);
    }
}
