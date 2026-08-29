<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use DomainException;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientIntake extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const STATUS_PENDING = 'pending';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FLAGGED = 'flagged';

    public const SUBMISSION_PATIENT_LINK = 'patient_link';
    public const SUBMISSION_STAFF_RECORDED = 'staff_recorded';

    protected $fillable = [
        'tenant_id',
        'client_id',
        'appointment_id',
        'intake_form_template_id',
        'discipline',
        'template_name',
        'schema_snapshot',
        'responses',
        'contraindication_flags',
        'status',
        'submission_type',
        'token',
        'expires_at',
        'submitted_at',
        'submitted_by_user_id',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'schema_snapshot' => 'array',
            'responses' => 'array',
            'contraindication_flags' => 'array',
            'expires_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function intakeFormTemplate(): BelongsTo
    {
        return $this->belongsTo(IntakeFormTemplate::class);
    }

    public function submittedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function isCompleted(): bool
    {
        return in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_FLAGGED], true)
            && $this->submitted_at !== null;
    }

    public static function makeToken(): string
    {
        return bin2hex(random_bytes(32)); // 64-char unguessable token
    }

    /**
     * Immutability enforcement: Once submitted, completed client intakes cannot be altered.
     */
    protected static function booted(): void
    {
        static::updating(function (ClientIntake $intake) {
            $originalStatus = $intake->getOriginal('status');
            $isAlreadyCompleted = in_array($originalStatus, [self::STATUS_COMPLETED, self::STATUS_FLAGGED], true);

            if ($isAlreadyCompleted) {
                $immutable = ['tenant_id', 'client_id', 'discipline', 'schema_snapshot', 'responses', 'submitted_at'];
                foreach ($immutable as $field) {
                    if ($intake->isDirty($field)) {
                        throw new DomainException("Completed intake records are legally immutable healthcare documents and cannot be modified.");
                    }
                }
            }
        });
    }
}
