<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LoginPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_central_login_shows_clinic_signup_only(): void
    {
        $this->get('http://umahz.test/login')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('canRegisterClient', false)
                ->where('canRegisterClinic', true));
    }

    public function test_clinic_subdomain_login_hides_the_signup_links(): void
    {
        // Staff on a clinic subdomain are invited, not self-registered, and new
        // clinics are created on the central domain — so both links are hidden.
        $this->get('http://acme.umahz.test/login')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('canRegisterClient', false)
                ->where('canRegisterClinic', false));
    }

    public function test_portal_login_shows_client_signup_only(): void
    {
        $this->get('http://portal.umahz.test/login')
            ->assertInertia(fn (Assert $page) => $page
                ->where('canRegisterClient', true)
                ->where('canRegisterClinic', false));
    }
}
