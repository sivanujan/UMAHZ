<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ErrorPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_url_returns_404_with_branded_inertia_error_page(): void
    {
        $this->get('http://umahz.test/this-page-does-not-exist-xyz')
            ->assertStatus(404)
            ->assertInertia(fn (Assert $page) => $page
                ->component('ErrorPage')
                ->where('status', 404)
            );
    }

    public function test_forbidden_route_returns_403_with_branded_inertia_error_page(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)
            ->get('http://umahz.test/admin/dashboard')
            ->assertStatus(403)
            ->assertInertia(fn (Assert $page) => $page
                ->component('ErrorPage')
                ->where('status', 403)
            );
    }

    public function test_json_requests_still_receive_json_errors(): void
    {
        $this->getJson('http://umahz.test/this-page-does-not-exist-xyz')
            ->assertStatus(404)
            ->assertJsonStructure(['message']);
    }

    public function test_500_in_production_mode_shows_branded_page_with_no_stack_trace(): void
    {
        config(['app.debug' => false]);

        Route::get('/_test-boom-500', function () {
            throw new \RuntimeException('Sensitive database secret string');
        });

        $response = $this->get('http://umahz.test/_test-boom-500');

        $response->assertStatus(500)
            ->assertInertia(fn (Assert $page) => $page
                ->component('ErrorPage')
                ->where('status', 500)
            );

        $response->assertDontSee('Sensitive database secret string');
        $response->assertDontSee('Stack trace');
    }
}
