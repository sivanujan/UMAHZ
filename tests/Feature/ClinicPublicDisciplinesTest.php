<?php

namespace Tests\Feature;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The public home page and the Page Builder receive the clinic's offered disciplines as a
 * LIST of {code, label} (a code => label map arrives in JS as an object, which broke both
 * pages: the public site crashed blank and the builder fell back to made-up services).
 */
class ClinicPublicDisciplinesTest extends TestCase
{
    use RefreshDatabase;

    private function clinic(array $overrides = []): Tenant
    {
        return Tenant::create(array_merge([
            'name' => 'Maple Test Clinic', 'slug' => 'maple', 'subdomain' => 'maple',
            'status' => Tenant::STATUS_APPROVED, 'onboarding_completed_at' => now(),
            'requested_disciplines' => ['massage_therapy', 'acupuncture_tcm'],
            'custom_disciplines' => [],
        ], $overrides));
    }

    private function publicDisciplines(Tenant $tenant): array
    {
        $props = null;
        $this->get("http://{$tenant->subdomain}.umahz.test/")
            ->assertOk()
            ->assertInertia(function ($page) use (&$props) {
                $page->component('Clinic/PublicHome');
                $props = $page->toArray()['props'];
            });
        $this->assertArrayNotHasKey('offeredDisciplineLabels', $props['clinic'], 'the old map prop is gone');

        return $props['clinic']['offeredDisciplines'];
    }

    public function test_public_home_renders_for_a_clinic_without_a_published_layout(): void
    {
        $tenant = $this->clinic();
        $this->assertEmpty($tenant->homepage_settings['gjs_html'] ?? null);

        $list = $this->publicDisciplines($tenant);

        $this->assertTrue(array_is_list($list), 'must be a JSON array, not an object');
        $this->assertSame([
            ['code' => 'massage_therapy', 'label' => 'Massage Therapy'],
            ['code' => 'acupuncture_tcm', 'label' => 'Acupuncture & TCM'],
        ], $list);
        // and the JSON the page actually receives is an array
        $this->assertStringStartsWith('[', json_encode($list));
    }

    public function test_public_home_lists_custom_disciplines_with_their_labels(): void
    {
        $tenant = $this->clinic([
            'custom_disciplines' => [['slug' => 'kinesiology', 'label' => 'Kinesiology']],
            'requested_disciplines' => ['kinesiology', 'massage_therapy'],
        ]);

        $this->assertSame([
            ['code' => 'kinesiology', 'label' => 'Kinesiology'],
            ['code' => 'massage_therapy', 'label' => 'Massage Therapy'],
        ], $this->publicDisciplines($tenant));
    }

    public function test_a_clinic_with_no_disciplines_gets_an_empty_list_not_made_up_ones(): void
    {
        $tenant = $this->clinic(['requested_disciplines' => []]);

        $this->assertSame([], $this->publicDisciplines($tenant)); // the page hides its Services section
    }

    public function test_page_builder_receives_the_same_list(): void
    {
        $tenant = $this->clinic([
            'custom_disciplines' => [['slug' => 'kinesiology', 'label' => 'Kinesiology']],
            'requested_disciplines' => ['acupuncture_tcm', 'kinesiology'],
        ]);
        $owner = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $tenant->id, 'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER, 'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        $props = null;
        $this->actingAs($owner)
            ->get('http://maple.umahz.test/app/settings/page-builder')
            ->assertOk()
            ->assertInertia(function ($page) use (&$props) {
                $page->component('Settings/PageBuilder');
                $props = $page->toArray()['props'];
            });

        $this->assertArrayNotHasKey('offeredDisciplineLabels', $props['tenant']);
        $this->assertSame([
            ['code' => 'acupuncture_tcm', 'label' => 'Acupuncture & TCM'],
            ['code' => 'kinesiology', 'label' => 'Kinesiology'],
        ], $props['tenant']['offeredDisciplines']);
    }

    public function test_offered_discipline_codes_are_always_a_list(): void
    {
        // a saved array with gaps (e.g. after removing an item) must still reach JS as an array
        $tenant = $this->clinic(['requested_disciplines' => [0 => 'massage_therapy', 2 => 'acupuncture_tcm']]);

        $this->assertTrue(array_is_list($tenant->fresh()->offeredDisciplineCodes()));
        $this->assertTrue(array_is_list($tenant->fresh()->offeredDisciplineList()));
    }
}
