<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Client extends Model
{
    use BelongsToTenant, HasFactory, HasUuids, LogsActivity, Notifiable, SoftDeletes;

    public const SEX_FEMALE = 'female';
    public const SEX_MALE = 'male';
    public const SEX_OTHER = 'other';
    public const SEX_PREFER_NOT_TO_SAY = 'prefer_not_to_say';

    public const SEXES = [
        self::SEX_FEMALE,
        self::SEX_MALE,
        self::SEX_OTHER,
        self::SEX_PREFER_NOT_TO_SAY,
    ];

    protected $fillable = [
        'tenant_id',
        'user_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'date_of_birth',
        'sex',
        'preferred_contact_method',
        'emergency_contact',
        'notification_preferences',
        'deletion_requested_at',
        'theme_preference',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'emergency_contact' => 'array',
            'notification_preferences' => 'array',
            'deletion_requested_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function getFullNameAttribute(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }

    /**
     * Notification preferences with defaults filled in for keys the client
     * hasn't explicitly set yet.
     */
    public function notificationPreferences(): array
    {
        return array_merge([
            'email_reminders' => true,
            'sms_reminders' => true,
        ], $this->notification_preferences ?? []);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['first_name', 'last_name', 'email', 'phone'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function clinicalNotes(): HasMany
    {
        return $this->hasMany(ClinicalNote::class);
    }

    public function forms(): HasMany
    {
        return $this->hasMany(ClientForm::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function consents(): HasMany
    {
        return $this->hasMany(Consent::class)->latest('agreed_at');
    }

    public function intakes(): HasMany
    {
        return $this->hasMany(ClientIntake::class)->latest('created_at');
    }
}
