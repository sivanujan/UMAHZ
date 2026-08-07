<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PractitionerProfile extends Model
{
    use HasFactory, HasUuids;

    public const PROFESSION_MASSAGE_THERAPY = 'massage_therapy';
    public const PROFESSION_ACUPUNCTURE_TCM = 'acupuncture_tcm';
    public const PROFESSION_PERSONAL_TRAINING = 'personal_training';
    public const PROFESSION_NUTRITION = 'nutrition';
    public const PROFESSION_COLON_HYDROTHERAPY = 'colon_hydrotherapy';

    protected $fillable = [
        'staff_membership_id',
        'profession',
        'credentials',
        'registration_number',
        'biography',
        'photo_url',
        'calendar_color',
    ];

    public function staffMembership(): BelongsTo
    {
        return $this->belongsTo(StaffMembership::class);
    }
}
