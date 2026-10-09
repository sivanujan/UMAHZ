<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlockedEmail extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'reason',
        'blocked_by_user_id',
        'tenant_id',
        'business_registration_number',
        'phone',
    ];

    /**
     * Check if a given email is blocked from applying.
     */
    public static function isBlocked(?string $email): bool
    {
        if (empty($email)) {
            return false;
        }

        return static::where('email', strtolower(trim($email)))->exists();
    }

    public function blockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocked_by_user_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}
