<?php

namespace Tests\Unit;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DatabaseSafetyGuardTest extends TestCase
{
    public function test_tests_always_run_on_test_database(): void
    {
        $dbName = DB::connection()->getDatabaseName();
        $this->assertSame('umahz_test', $dbName);
    }

    public function test_safety_guard_strictly_blocks_non_test_database(): void
    {
        config(['database.connections.pgsql.database' => 'UMAHZ']);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('CRITICAL SAFETY GUARD');

        $this->ensureRunningOnTestDatabase();
    }
}
