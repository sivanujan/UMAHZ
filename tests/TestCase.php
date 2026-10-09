<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->ensureRunningOnTestDatabase();
    }

    /**
     * Safety guard: Abort immediately if the active database does not end with '_test'.
     * This protects development and production databases from accidental wipes by RefreshDatabase.
     */
    protected function ensureRunningOnTestDatabase(): void
    {
        $defaultConnection = config('database.default');
        $databaseName = (string) config("database.connections.{$defaultConnection}.database");

        // Allow SQLite in-memory databases (:memory:) or test sqlite files
        if ($defaultConnection === 'sqlite') {
            if ($databaseName === ':memory:' || str_ends_with(strtolower($databaseName), '_test') || str_ends_with(strtolower($databaseName), '_test.sqlite')) {
                return;
            }
        }

        $lowerDb = strtolower($databaseName);
        if (! str_ends_with($lowerDb, '_test') && ! str_ends_with($lowerDb, '_testing')) {
            throw new \RuntimeException(
                "CRITICAL SAFETY GUARD: Test suite aborted because the active database [{$databaseName}] on connection [{$defaultConnection}] does not end with '_test' or '_testing'. " .
                "Running tests with RefreshDatabase against development or production databases will wipe data. " .
                "Please configure a test database (e.g. umahz_test) in phpunit.xml or .env.testing."
            );
        }
    }
}
