<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PromoCode extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'code',
        'stripe_coupon_id',
        'stripe_promo_code_id',
        'discount_type',
        'discount_value',
        'duration',
        'duration_in_months',
        'max_redemptions',
        'times_redeemed',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'duration_in_months' => 'integer',
        'max_redemptions' => 'integer',
        'times_redeemed' => 'integer',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function plans(): BelongsToMany
    {
        return $this->belongsToMany(Plan::class, 'plan_promo_codes');
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }

    /**
     * Check whether this promo code is currently valid for a given plan.
     */
    public function isValidForPlan(?string $planId = null, bool $allowExpired = false): bool
    {
        if (! $allowExpired) {
            if (! $this->is_active) {
                return false;
            }

            if ($this->expires_at && $this->expires_at->isPast()) {
                return false;
            }

            if ($this->max_redemptions !== null && $this->times_redeemed >= $this->max_redemptions) {
                return false;
            }
        }

        if ($planId) {
            $applicablePlanIds = $this->plans()->pluck('plans.id')->toArray();
            if (! empty($applicablePlanIds) && ! in_array($planId, $applicablePlanIds, true)) {
                return false;
            }
        }

        return true;
    }
}
