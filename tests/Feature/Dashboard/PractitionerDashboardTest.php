<?php

namespace Tests\Feature\Dashboard;

use App\Models\Client;
use App\Models\ClinicalNote;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PractitionerDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_practitioner_dashboard_summarizes_structured_draft_note_content_as_string(): void
    {
        $tenant = Tenant::create([
            'name' => 'Lotus Clinic',
            'slug' => 'lotus',
            'subdomain' => 'lotus',
            'status' => Tenant::STATUS_APPROVED,
            'onboarded_at' => now(),
        ]);

        $user = User::factory()->create();
        $membership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        $client = Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Jordan',
            'last_name' => 'Taylor',
        ]);

        ClinicalNote::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'discipline' => 'physiotherapy',
            'template_name' => 'Physiotherapy Clinical SOAP Note',
            'content' => [
                'chief_complaint' => 'Right shoulder pain with overhead reach.',
                'range_of_motion' => 'Limited abduction to 110 degrees.',
                'strength_and_palpation' => '4/5 supraspinatus',
                'special_tests' => 'Neer positive',
                'clinical_assessment' => 'Subacromial impingement',
                'treatment_administered' => 'Manual therapy and mobility work',
                'pain_score' => '5',
                'return_schedule' => '1 week',
            ],
            'status' => ClinicalNote::STATUS_DRAFT,
        ]);

        $response = $this->actingAs($user)->get('http://lotus.umahz.test/app/dashboard');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Practitioner')
            ->has('unsignedNotes', 1)
            ->where('unsignedNotes.0.client_name', 'Jordan Taylor')
            ->where('unsignedNotes.0.service', 'Physiotherapy Clinical SOAP Note')
        );
    }
}
