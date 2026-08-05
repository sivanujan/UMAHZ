<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'timezone',
        'currency',
        'address',
        'phone',
        'email',
        'is_active',
        'settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
    ];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'staff_memberships')
            ->withPivot('role', 'status', 'permissions')
            ->withTimestamps();
    }

    public function staffMemberships(): HasMany
    {
        return $this->hasMany(StaffMembership::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }
}
