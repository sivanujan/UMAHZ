<?php

namespace App\Scribe;

use App\Models\ScribeLanguage;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class LanguageRegistry
{
    public const CACHE_KEY = 'scribe:languages:all:v2';

    public function __call(string $method, array $args)
    {
        return static::$method(...$args);
    }

    /**
     * @return Collection<int, ScribeLanguage>
     */
    public static function all(): Collection
    {
        try {
            $cached = Cache::get(self::CACHE_KEY);
        } catch (\Throwable) {
            $cached = null;
        }

        // If corrupted, incomplete class, or not an array, forget and re-query
        if (! is_array($cached)) {
            $cached = self::fetchFromDatabase();
            try {
                Cache::put(self::CACHE_KEY, $cached, 3600);
            } catch (\Throwable) {
                // If cache write fails, proceed with $cached
            }
        }

        return ScribeLanguage::hydrate($cached)->values();
    }

    /**
     * Languages visible for clinical encounter recording (active + beta, supports_transcription = true).
     *
     * @return Collection<int, ScribeLanguage>
     */
    public static function forEncounter(): Collection
    {
        return self::all()
            ->filter(fn (ScribeLanguage $lang) => $lang->isVisible() && $lang->supports_transcription)
            ->values();
    }

    /**
     * Languages supported for clinical note generation (active + beta, supports_note_output = true).
     *
     * @return Collection<int, ScribeLanguage>
     */
    public static function forNoteOutput(): Collection
    {
        return self::all()
            ->filter(fn (ScribeLanguage $lang) => $lang->isVisible() && $lang->supports_note_output)
            ->values();
    }

    public static function findByCode(string $code): ?ScribeLanguage
    {
        return self::all()->firstWhere('code', $code);
    }

    public static function isValidEncounterLanguage(string $code, array $clinicAllowedCodes = []): bool
    {
        $lang = self::findByCode($code);
        if (! $lang || ! $lang->isVisible() || ! $lang->supports_transcription) {
            return false;
        }

        if (! empty($clinicAllowedCodes)) {
            return in_array($code, $clinicAllowedCodes, true);
        }

        return true;
    }

    public static function isValidNoteOutputLanguage(string $code): bool
    {
        $lang = self::findByCode($code);

        return $lang !== null && $lang->isVisible() && $lang->supports_note_output;
    }

    public static function clearCache(): void
    {
        try {
            Cache::forget(self::CACHE_KEY);
            Cache::forget('scribe:languages:all:v1');
        } catch (\Throwable) {
            // Ignore cache forget failures
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function fetchFromDatabase(): array
    {
        try {
            if (! Schema::hasTable('scribe_languages')) {
                return self::fallbackArray();
            }

            $rows = ScribeLanguage::orderBy('sort_order')->orderBy('label')->get()->toArray();

            return ! empty($rows) ? $rows : self::fallbackArray();
        } catch (\Throwable) {
            return self::fallbackArray();
        }
    }

    /**
     * Fallback array if the table does not exist or is empty.
     *
     * @return array<int, array<string, mixed>>
     */
    private static function fallbackArray(): array
    {
        return [
            [
                'code' => 'en',
                'label' => 'English',
                'native_name' => 'English',
                'provider' => 'assemblyai',
                'provider_code' => 'en',
                'supports_transcription' => true,
                'supports_note_output' => true,
                'status' => ScribeLanguage::STATUS_ACTIVE,
                'sort_order' => 1,
            ],
            [
                'code' => 'zh',
                'label' => 'Mandarin (Chinese)',
                'native_name' => '中文 (普通话)',
                'provider' => 'assemblyai',
                'provider_code' => 'zh',
                'supports_transcription' => true,
                'supports_note_output' => false,
                'status' => ScribeLanguage::STATUS_ACTIVE,
                'sort_order' => 2,
            ],
            [
                'code' => 'fr',
                'label' => 'French',
                'native_name' => 'Français',
                'provider' => 'assemblyai',
                'provider_code' => 'fr',
                'supports_transcription' => true,
                'supports_note_output' => true,
                'status' => ScribeLanguage::STATUS_ACTIVE,
                'sort_order' => 3,
            ],
        ];
    }
}
