<?php

namespace Tests\Unit;

use App\Support\Tenancy;
use Tests\TestCase;

class SubdomainGeneratorTest extends TestCase
{
    public function test_it_slugifies_a_clinic_name(): void
    {
        $this->assertSame('lotus-wellness', Tenancy::generateSubdomain('Lotus Wellness', []));
    }

    public function test_it_suffixes_to_avoid_collisions(): void
    {
        $this->assertSame(
            'lotus-wellness-2',
            Tenancy::generateSubdomain('Lotus Wellness', ['lotus-wellness']),
        );
        $this->assertSame(
            'lotus-wellness-3',
            Tenancy::generateSubdomain('Lotus Wellness', ['lotus-wellness', 'lotus-wellness-2']),
        );
    }

    public function test_it_pads_a_too_short_seed_to_the_minimum_length(): void
    {
        $result = Tenancy::generateSubdomain('a', []);

        $this->assertGreaterThanOrEqual((int) config('tenancy.subdomain_min'), strlen($result));
        $this->assertMatchesRegularExpression(config('tenancy.subdomain_pattern'), $result);
    }

    public function test_it_never_returns_a_reserved_word(): void
    {
        $result = Tenancy::generateSubdomain('admin', []);

        $this->assertNotSame('admin', $result);
        $this->assertFalse(Tenancy::isReserved($result));
    }
}
