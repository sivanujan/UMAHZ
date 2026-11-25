<?php

use App\Models\AssessmentTest;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $splitList = static function (?array $values, bool $lowercase): array {
            if (empty($values)) {
                return [];
            }

            $out = [];
            foreach ($values as $value) {
                foreach (preg_split('/[;,]/', (string) $value) ?: [] as $part) {
                    $item = trim($part);
                    if ($item === '') {
                        continue;
                    }
                    if ($lowercase) {
                        $item = mb_strtolower($item);
                    }
                    $out[] = $item;
                }
            }

            return array_values(array_unique($out));
        };

        AssessmentTest::withTrashed()->chunkById(100, function ($tests) use ($splitList) {
            foreach ($tests as $test) {
                $newDisciplines = $splitList($test->disciplines, true);
                $newAliases = $splitList($test->aliases, false);

                if ($newDisciplines !== ($test->disciplines ?? []) || $newAliases !== ($test->aliases ?? [])) {
                    $test->disciplines = $newDisciplines;
                    $test->aliases = $newAliases;
                    $test->saveQuietly();
                }
            }
        });
    }

    public function down(): void
    {
        // Data repair migration; intentionally irreversible.
    }
};
