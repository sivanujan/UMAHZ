<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

/**
 * A short (~12s) self-contained slice of encounter audio. The raw bytes are
 * encrypted at rest on the private disk and purged per the clinic's retention
 * setting; the row itself stays as an audit trail of what was captured.
 */
class ScribeAudioChunk extends Model
{
    use BelongsToTenant, HasUuids;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_TRANSCRIBED = 'transcribed';

    public const STATUS_FAILED = 'failed';

    public const STATUS_DISCARDED = 'discarded';

    protected $fillable = [
        'tenant_id',
        'scribe_session_id',
        'sequence',
        'storage_path',
        'mime_type',
        'byte_size',
        'duration_ms',
        'offset_ms',
        'status',
        'attempts',
        'last_error',
        'transcribed_at',
        'audio_purged_at',
    ];

    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
            'byte_size' => 'integer',
            'duration_ms' => 'integer',
            'offset_ms' => 'integer',
            'attempts' => 'integer',
            'transcribed_at' => 'datetime',
            'audio_purged_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ScribeSession::class, 'scribe_session_id');
    }

    public static function disk(): string
    {
        return config('scribe.audio_disk', 'local');
    }

    public function hasAudio(): bool
    {
        return $this->storage_path !== null && Storage::disk(self::disk())->exists($this->storage_path);
    }

    /**
     * Decrypted raw audio bytes.
     */
    public function readAudio(): string
    {
        return Crypt::decryptString(Storage::disk(self::disk())->get($this->storage_path));
    }

    public static function storeAudio(string $path, string $bytes): void
    {
        Storage::disk(self::disk())->put($path, Crypt::encryptString($bytes));
    }

    /**
     * Permanently delete the raw audio file (idempotent).
     */
    public function purgeAudio(): void
    {
        if ($this->storage_path) {
            Storage::disk(self::disk())->delete($this->storage_path);
        }

        $this->forceFill([
            'storage_path' => null,
            'audio_purged_at' => $this->audio_purged_at ?? now(),
        ])->save();
    }
}
