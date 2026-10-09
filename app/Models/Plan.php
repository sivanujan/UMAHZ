<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Plan extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'slug',
        'name',
        'tagline',
        'description',
        'badge',
        'is_active',
        'display_order',
        'trial_days',
        'included_practitioners',
        'max_practitioners',
        'allows_extra_practitioners',
        'appointment_limit_monthly',
        'appointment_limit_behavior',
        'location_limit',
        'support_level',
        'scribe_allowance_unit',
        'scribe_allowance_amount',
        'scribe_limit_behavior',
        'stripe_product_id',
        'needs_review',
        'needs_review_fields',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
        'trial_days' => 'integer',
        'included_practitioners' => 'integer',
        'max_practitioners' => 'integer',
        'allows_extra_practitioners' => 'boolean',
        'appointment_limit_monthly' => 'integer',
        'location_limit' => 'integer',
        'scribe_allowance_amount' => 'integer',
        'needs_review' => 'boolean',
        'needs_review_fields' => 'array',
    ];

    public function prices(): HasMany
    {
        return $this->hasMany(PlanPrice::class);
    }

    public function activePrices(): HasMany
    {
        return $this->hasMany(PlanPrice::class)->where('is_active', true);
    }

    public function monthlyPrice(): HasOne
    {
        return $this->hasOne(PlanPrice::class)->where('interval', 'month')->where('is_active', true);
    }

    public function annualPrice(): HasOne
    {
        return $this->hasOne(PlanPrice::class)->where('interval', 'year')->where('is_active', true);
    }

    public function activePriceForInterval(string $interval): ?PlanPrice
    {
        return $this->activePrices()->where('interval', $interval)->first();
    }

    public function features(): BelongsToMany
    {
        return $this->belongsToMany(Feature::class, 'plan_features')
            ->withPivot('is_enabled', 'display_label')
            ->withTimestamps();
    }

    public function enabledFeatures(): BelongsToMany
    {
        return $this->belongsToMany(Feature::class, 'plan_features')
            ->wherePivot('is_enabled', true)
            ->withPivot('is_enabled', 'display_label')
            ->withTimestamps();
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }

    public function promoCodes(): BelongsToMany
    {
        return $this->belongsToMany(PromoCode::class, 'plan_promo_codes');
    }

    public function hasFeature(string $featureKey): bool
    {
        return $this->enabledFeatures()->where('key', $featureKey)->exists();
    }

    public function isFieldUnderReview(string $field): bool
    {
        $fields = (array) ($this->needs_review_fields ?? []);

        return in_array($field, $fields, true);
    }
}
