<?php

namespace Tests\Feature\Auth;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TempEmailRegistrationBlockTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_registration_rejects_disposable_email(): void
    {
        $tenant = Tenant::create([
            'name' => 'Demo Health Clinic',
            'slug' => 'demo-clinic',
            'subdomain' => 'demo-clinic',
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $response = $this->post('/register', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane.doe@mailinator.com',
            'phone' => '+1 555 0199',
            'password' => 'SecurePass1234!',
            'password_confirmation' => 'SecurePass1234!',
            'date_of_birth' => '1995-05-15',
            'preferred_contact_method' => 'email',
            'tenant_id' => $tenant->id,
            'tos_accepted' => true,
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertDatabaseMissing('users', [
            'email' => 'jane.doe@mailinator.com',
        ]);
    }

    public function test_user_registration_accepts_valid_email(): void
    {
        $tenant = Tenant::create([
            'name' => 'Demo Health Clinic',
            'slug' => 'demo-clinic-2',
            'subdomain' => 'demo-clinic-2',
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $response = $this->post('/register', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane.doe@legitimate-clinic.com',
            'phone' => '+1 555 0199',
            'password' => 'SecurePass1234!',
            'password_confirmation' => 'SecurePass1234!',
            'date_of_birth' => '1995-05-15',
            'preferred_contact_method' => 'email',
            'tenant_id' => $tenant->id,
            'tos_accepted' => true,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('users', [
            'email' => 'jane.doe@legitimate-clinic.com',
        ]);
    }

    public function test_clinic_onboarding_send_code_rejects_disposable_email(): void
    {
        $response = $this->postJson('http://umahz.test/clinics/register/send-code', [
            'email' => 'clinic-owner@10minutemail.com',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('email');
    }
}
