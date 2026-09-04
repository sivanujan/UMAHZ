<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SubscriptionTierConfig extends Model
{
    protected $table = 'subscription_tier_configs';
    protected $primaryKey = 'tier';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'tier',
        'name',
        'tagline',
        'base_price',
        'included_full_time',
        'max_practitioners',
        'max_appointments_per_month',
        'allows_addons',
        'addon_price_ft',
        'addon_price_pt',
        'stripe_price_id',
        'stripe_addon_price_ft_id',
        'stripe_addon_price_pt_id',
        'features',
        'badge',
    ];

    protected $casts = [
        'base_price' => 'float',
        'included_full_time' => 'integer',
        'max_practitioners' => 'integer',
        'max_appointments_per_month' => 'integer',
        'allows_addons' => 'boolean',
        'addon_price_ft' => 'float',
        'addon_price_pt' => 'float',
        'features' => 'array',
    ];

    public const CACHE_KEY = 'platform_subscription_tiers';

    /**
     * Get all active subscription tier definitions, indexed by tier key.
     * Cached with graceful fallback to config('billing.tiers').
     *
     * @return array<string, array<string, mixed>>
     */
    public static function allTiers(): array
    {
        return Cache::remember(self::CACHE_KEY, 3600, function () {
            try {
                $records = static::all();
                if ($records->isEmpty()) {
                    return config('billing.tiers', []);
                }

                $tiers = [];
                foreach ($records as $record) {
                    $tiers[$record->tier] = [
                        'id' => $record->tier,
                        'tier' => $record->tier,
                        'tier_key' => $record->tier,
                        'name' => $record->name,
                        'tagline' => $record->tagline,
                        'base_price' => (float) $record->base_price,
                        'monthly_base_price' => (float) $record->base_price,
                        'included_full_time' => (int) $record->included_full_time,
                        'included_ft_practitioners' => (int) $record->included_full_time,
                        'max_practitioners' => $record->max_practitioners !== null ? (int) $record->max_practitioners : null,
                        'max_total_practitioners' => $record->max_practitioners !== null ? (int) $record->max_practitioners : null,
                        'max_appointments_per_month' => $record->max_appointments_per_month !== null ? (int) $record->max_appointments_per_month : null,
                        'allows_addons' => (bool) $record->allows_addons,
                        'addon_price_ft' => (float) $record->addon_price_ft,
                        'addon_ft_price' => (float) $record->addon_price_ft,
                        'addon_price_pt' => (float) $record->addon_price_pt,
                        'addon_pt_price' => (float) $record->addon_price_pt,
                        'stripe_price_id' => $record->stripe_price_id ?: config("billing.tiers.{$record->tier}.stripe_price_id"),
                        'stripe_addon_price_ft_id' => $record->stripe_addon_price_ft_id ?: config("billing.tiers.{$record->tier}.stripe_addon_price_ft_id"),
                        'stripe_addon_price_pt_id' => $record->stripe_addon_price_pt_id ?: config("billing.tiers.{$record->tier}.stripe_addon_price_pt_id"),
                        'features' => is_array($record->features) ? $record->features : [],
                        'badge' => $record->badge,
                    ];
                }

                return $tiers;
            } catch (\Throwable $e) {
                // Table might not exist yet during early migration or test setup
                return config('billing.tiers', []);
            }
        });
    }

    /**
     * Get a specific tier's definition.
     */
    public static function getTier(string $tier): ?array
    {
        $all = static::allTiers();

        return $all[$tier] ?? config("billing.tiers.{$tier}");
    }

    /**
     * Clear the cached tiers.
     */
    public static function clearTierCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
