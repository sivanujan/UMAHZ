<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class PlatformSetting extends Model
{
    protected $table = 'platform_settings';
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
        'group',
        'description',
    ];

    protected $casts = [
        'value' => 'json',
    ];

    public const CACHE_KEY = 'platform_settings_all';

    public static function defaults(): array
    {
        return [
            // General
            'platform_name' => 'UMAHZ',
            'support_email' => 'support@umahz.com',
            'contact_phone' => '+1 (555) 234-5678',
            'central_domain' => config('tenancy.central_domain', 'umahz.com'),
            'default_currency' => 'USD',
            'default_timezone' => 'America/New_York',

            // Onboarding & Approvals
            'require_admin_approval' => true,
            'allow_self_registration' => true,
            'require_license_document' => true,
            'trial_period_days' => 14,

            // Security
            'enforce_2fa_staff' => false,
            'session_timeout_minutes' => 120,
            'max_failed_login_attempts' => 5,

            // System & Announcements
            'system_announcement' => '',
            'show_announcement' => false,
        ];
    }

    /**
     * Get a setting by key with a fallback to defaults.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $all = static::getAll();

        return $all[$key] ?? $default ?? static::defaults()[$key] ?? null;
    }

    /**
     * Set a setting value by key.
     */
    public static function set(string $key, mixed $value, string $group = 'general', ?string $description = null): void
    {
        static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'group' => $group,
                'description' => $description,
            ]
        );

        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Get all platform settings merged with defaults.
     */
    public static function getAll(): array
    {
        return Cache::remember(self::CACHE_KEY, 3600, function () {
            $defaults = static::defaults();
            try {
                $saved = static::all()->pluck('value', 'key')->toArray();

                return array_merge($defaults, $saved);
            } catch (\Throwable) {
                return $defaults;
            }
        });
    }

    /**
     * Clear the platform settings cache.
     */
    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
