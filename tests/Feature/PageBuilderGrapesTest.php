<?php

namespace Tests\Feature;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Support\HtmlSanitizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageBuilderGrapesTest extends TestCase
{
    use RefreshDatabase;

    private function tenant(array $overrides = []): Tenant
    {
        return Tenant::create(array_merge([
            'name' => 'Grapes Clinic',
            'slug' => 'grapes-clinic',
            'subdomain' => 'grapes-clinic',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
        ], $overrides));
    }

    private function member(Tenant $tenant, string $role): User
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id'   => $user->id,
            'role'      => $role,
            'status'    => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return $user;
    }

    public function test_html_sanitizer_strips_script_tags_and_inline_events(): void
    {
        $dirtyHtml = '<div><h1>Safe Title</h1><script>alert("xss")</script><img src="test.jpg" onerror="alert(1)" /><a href="javascript:alert(1)">Click</a></div>';
        $cleanHtml = HtmlSanitizer::sanitize($dirtyHtml);

        $this->assertStringNotContainsString('<script>', $cleanHtml);
        $this->assertStringNotContainsString('onerror=', $cleanHtml);
        $this->assertStringNotContainsString('javascript:', $cleanHtml);
        $this->assertStringContainsString('<h1>Safe Title</h1>', $cleanHtml);
        $this->assertStringContainsString('src="test.jpg"', $cleanHtml);
    }

    public function test_html_sanitizer_preserves_safe_elements(): void
    {
        $safeHtml = '<section class="hero"><h1 id="title">Welcome</h1><a href="/pay" class="btn">Pay Invoice</a></section>';
        $cleanHtml = HtmlSanitizer::sanitize($safeHtml);

        $this->assertStringContainsString('<section', $cleanHtml);
        $this->assertStringContainsString('href="/pay"', $cleanHtml);
        $this->assertStringContainsString('Welcome', $cleanHtml);
    }

    public function test_owner_can_view_page_builder_and_save_grapesjs_layout(): void
    {
        $tenant = $this->tenant();
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $this->actingAs($owner)
            ->get('http://grapes-clinic.umahz.test/app/settings/page-builder')
            ->assertOk();

        // Save GrapesJS layout
        $response = $this->actingAs($owner)
            ->postJson('http://grapes-clinic.umahz.test/app/settings/page-layout', [
                'gjs_project' => ['components' => []],
                'gjs_html'    => '<section><h1>Custom GrapesJS Header</h1></section>',
                'gjs_css'     => 'h1 { color: purple; }',
            ]);

        $response->assertOk()
            ->assertJson(['ok' => true]);

        $tenant->refresh();
        $this->assertStringContainsString('Custom GrapesJS Header', $tenant->homepage_settings['gjs_html']);
        $this->assertStringContainsString('purple', $tenant->homepage_settings['gjs_css']);
    }

    public function test_public_subdomain_renders_saved_grapesjs_layout(): void
    {
        $tenant = $this->tenant([
            'homepage_settings' => [
                'gjs_html' => '<section class="hero"><h1>Grapes Public Headline</h1><a href="/pay">Pay Now</a></section>',
                'gjs_css'  => '.hero { background: blue; }',
            ],
        ]);

        $response = $this->get('http://grapes-clinic.umahz.test/');

        $response->assertOk()
            ->assertSee('Grapes Public Headline')
            ->assertSee('/pay');
    }
}
