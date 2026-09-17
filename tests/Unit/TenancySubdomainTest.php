<?php

namespace Tests\Unit;

use App\Support\Tenancy;
use Tests\TestCase;

class TenancySubdomainTest extends TestCase
{
    public function test_central_domain_returns_null(): void
    {
        $this->assertNull(Tenancy::subdomainFromHost('umahz.test'));
        $this->assertNull(Tenancy::subdomainFromHost('umahz.test:8000'));
    }

    public function test_portal_host_returns_null(): void
    {
        $this->assertNull(Tenancy::subdomainFromHost('portal.umahz.test'));
        $this->assertNull(Tenancy::subdomainFromHost('portal.umahz.test:8000'));
    }

    public function test_reserved_subdomain_returns_null(): void
    {
        $this->assertNull(Tenancy::subdomainFromHost('admin.umahz.test'));
        $this->assertNull(Tenancy::subdomainFromHost('api.umahz.test'));
        $this->assertNull(Tenancy::subdomainFromHost('www.umahz.test'));
    }

    public function test_nested_subdomain_returns_null(): void
    {
        $this->assertNull(Tenancy::subdomainFromHost('a.b.umahz.test'));
    }

    public function test_unrelated_host_returns_null(): void
    {
        $this->assertNull(Tenancy::subdomainFromHost('example.com'));
        $this->assertNull(Tenancy::subdomainFromHost(null));
        $this->assertNull(Tenancy::subdomainFromHost(''));
    }

    public function test_valid_clinic_subdomain_is_resolved_and_normalized(): void
    {
        $this->assertSame('astrogenapp', Tenancy::subdomainFromHost('astrogenapp.umahz.test'));
        $this->assertSame('astrogenapp', Tenancy::subdomainFromHost('ASTROGENAPP.umahz.test'));
        $this->assertSame('astrogenapp', Tenancy::subdomainFromHost('astrogenapp.umahz.test:8000'));
        $this->assertSame('lotus-wellness', Tenancy::subdomainFromHost('lotus-wellness.umahz.test'));
    }

    public function test_central_url_generation(): void
    {
        $url = Tenancy::centralUrl('/login');
        $this->assertStringContainsString('umahz.test/login', $url);
    }
}
