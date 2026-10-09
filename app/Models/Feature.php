<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Feature extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'key',
        'name',
        'category',
        'description',
        'is_implemented',
    ];

    protected $casts = [
        'is_implemented' => 'boolean',
    ];

    public function plans(): BelongsToMany
    {
        return $this->belongsToMany(Plan::class, 'plan_features')
            ->withPivot('is_enabled')
            ->withTimestamps();
    }
}
