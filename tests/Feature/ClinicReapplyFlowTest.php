<?php

namespace Tests\Feature;

use App\Billing\PlatformBilling;
use App\Models\AuditEvent;
use App\Models\BlockedEmail;
use App\Models\PlatformSetting;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\ClinicApplicationFinalRejectionNotification;
use App\Notifications\ClinicApplicationPermanentRejectionNotification;
use App\Notifications\ClinicApplicationRejectionNotification;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Mockery;
use Tests\TestCase;

class ClinicReapplyFlowTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): User
    {
        $hq = Tenant::create([
            'name' => 'HQ',
            'slug' => 'hq',
            'subdomain' => 'hq',
            'status' => Tenant::STATUS_APPROVED,
        ]);
        $user = User::factory()->create([
            'email' => 'admin@umahz.com',
            'email_verified_at' => now(),
        ]);
        StaffMembership::create([
            'tenant_id' => $hq->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return $user;
    }

    private function createPendingClinic(string $subdomain = 'wellness', string $email = 'owner@wellness.test'): array
    {
        $tenant = Tenant::create([
            'name' => 'Wellness Clinic',
            'slug' => $subdomain,
            'subdomain' => $subdomain,
            'status' => Tenant::STATUS_PENDING_REVIEW,
            'business_registration_number' => 'BRN-12345',
            'primary_contact_name' => 'Dr. Jane Smith',
            'primary_contact_email' => $email,
            'primary_contact_phone' => '+15551234567',
            'requested_disciplines' => ['massage_therapy', 'acupuncture_tcm'],
            'estimated_practitioner_count' => 3,
            'plan_tier' => 'practice',
            'billing_interval' => 'month',
            'stripe_pm_id' => 'pm_test_card_123',
            'reapply_count' => 1,
            'submitted_at' => now(),
        ]);

        $user = User::factory()->create([
            'name' => 'Dr. Jane Smith',
            'email' => $email,
            'email_verified_at' => now(),
        ]);

        $membership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $profile = PractitionerProfile::create([
            'staff_membership_id' => $membership->id,
            'user_id' => $user->id,
            'profession' => 'Massage Therapist',
            'license_number' => 'RMT-998877',
            'licensing_body' => 'College of Massage Therapists',
            'is_primary_contact' => true,
            'verification_status' => PractitionerProfile::VERIFICATION_PENDING,
        ]);

        return [$tenant, $user, $profile];
    }

    /**
     * Test 1: Admin rejects application with reason and sections; notification sent; verified card kept on file.
     */
    public function test_admin_can_reject_with_sections_and_card_is_retained(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$tenant, $owner, $profile] = $this->createPendingClinic();

        $response = $this->actingAs($admin)
            ->post("http://umahz.test/admin/clinics/{$tenant->id}/reject", [
                'note' => 'Please update your business registration number and license document.',
                'sections' => ['clinic_details', 'documents_license'],
            ]);

        $response->assertSessionHasNoErrors();
        $tenant->refresh();

        $this->assertSame(Tenant::STATUS_REJECTED, $tenant->status);
        $this->assertSame('pm_test_card_123', $tenant->stripe_pm_id);
        $this->assertSame(['clinic_details', 'documents_license'], $tenant->rejection_sections);
        $this->assertNotNull($tenant->rejected_at);
        $this->assertTrue($tenant->canReapply());

        // Check notification sent to owner
        Notification::assertSentTo($owner, ClinicApplicationRejectionNotification::class, function ($n) {
            return count($n->sectionsToFix) === 2;
        });

        // Audit event logged
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $tenant->id,
            'action' => 'clinic.rejected',
        ]);
    }

    /**
     * Test 2: Applicant can access status page showing "needs changes", attempt count, and can re-apply.
     */
    public function test_applicant_sees_changes_needed_and_can_reapply(): void
    {
        [$tenant, $owner, $profile] = $this->createPendingClinic();
        $tenant->update([
            'status' => Tenant::STATUS_REJECTED,
            'rejected_at' => now(),
            'review_note' => 'Update documents please',
            'rejection_sections' => ['documents_license'],
            'reapply_count' => 1,
        ]);

        $response = $this->actingAs($owner)
            ->get("http://{$tenant->subdomain}.umahz.test/clinic/status");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Clinic/Status')
            ->where('canReapply', true)
            ->where('tenant.status', Tenant::STATUS_REJECTED)
            ->where('tenant.reapply_count', 1)
            ->where('tenant.attempts_remaining', 2)
        );
    }

    /**
     * Test 3: Signed link entry authenticates owner and redirects to reapply form.
     */
    public function test_signed_link_entry_authenticates_owner_and_redirects(): void
    {
        [$tenant, $owner, $profile] = $this->createPendingClinic();
        $tenant->update([
            'status' => Tenant::STATUS_REJECTED,
            'rejected_at' => now(),
            'reapply_count' => 1,
        ]);

        $signedUrl = URL::temporarySignedRoute(
            'clinic.reapply.entry',
            now()->addDays(7),
            ['tenant' => $tenant->id]
        );

        $response = $this->get($signedUrl);
        $response->assertRedirect("http://{$tenant->subdomain}.umahz.test/clinic/reapply");
        $this->assertAuthenticatedAs($owner);
    }

    /**
     * Test 4: Expired signed link returns 403.
     */
    public function test_expired_signed_link_is_forbidden(): void
    {
        [$tenant, $owner, $profile] = $this->createPendingClinic();
        $tenant->update([
            'status' => Tenant::STATUS_REJECTED,
            'rejected_at' => now(),
            'reapply_count' => 1,
        ]);

        $expiredUrl = URL::temporarySignedRoute(
            'clinic.reapply.entry',
            now()->subMinutes(1),
            ['tenant' => $tenant->id]
        );

        $response = $this->get($expiredUrl);
        $response->assertForbidden();
    }

    /**
     * Test 5: Re-application submission resets status to pending_review, increments attempt, audits changes.
     */
    public function test_reapply_submission_increments_attempt_and_sets_pending_review(): void
    {
        [$tenant, $owner, $profile] = $this->createPendingClinic();
        $tenant->update([
            'status' => Tenant::STATUS_REJECTED,
            'rejected_at' => now(),
            'review_note' => 'Please fix business number',
            'rejection_sections' => ['clinic_details'],
            'reapply_count' => 1,
            'stripe_pm_id' => 'pm_existing_card_123',
            'rejection_history' => [[
                'attempt' => 1,
                'rejected_at' => now()->toIso8601String(),
                'reason' => 'Please fix business number',
            ]],
        ]);

        $response = $this->actingAs($owner)
            ->post("http://{$tenant->subdomain}.umahz.test/clinic/reapply", [
                'clinic_name' => 'Wellness Clinic Updated',
                'subdomain' => $tenant->subdomain,
                'business_registration_number' => 'BRN-NEW-99999',
                'address_line1' => '456 King St W',
                'address_city' => 'Toronto',
                'address_region' => 'ON',
                'address_country' => 'CA',
                'primary_contact_name' => 'Dr. Jane Smith',
                'primary_contact_phone' => '+15559876543',
                'requested_disciplines' => ['massage_therapy'],
                'estimated_practitioner_count' => 4,
                'license_number' => 'RMT-998877-REV',
                'licensing_body' => 'College of Massage Therapists of Ontario',
            ]);

        $response->assertRedirect("http://{$tenant->subdomain}.umahz.test/clinic/status");
        $tenant->refresh();
        $profile->refresh();

        $this->assertSame(Tenant::STATUS_PENDING_REVIEW, $tenant->status);
        $this->assertSame(2, $tenant->reapply_count);
        $this->assertSame('Wellness Clinic Updated', $tenant->name);
        $this->assertSame('pm_existing_card_123', $tenant->stripe_pm_id);
        $this->assertSame('RMT-998877-REV', $profile->license_number);
        $this->assertNull($tenant->rejection_sections);
        $this->assertNull($tenant->review_note);

        // Check audit event
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $tenant->id,
            'action' => 'clinic.reapplied',
            'reason' => 'Re-applied for review (attempt 2)',
        ]);
    }

    /**
     * Test 6: Rejection at max attempts results in final rejection, blocks email, sends final email.
     */
    public function test_reaching_max_attempts_results_in_final_rejection_and_blocks_email(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$tenant, $owner, $profile] = $this->createPendingClinic('thirdtry', 'third@test.com');
        $tenant->update([
            'reapply_count' => 3, // reached default max of 3
        ]);

        $billingMock = Mockery::mock(PlatformBilling::class);
        $billingMock->shouldReceive('discardPaymentMethod')->atLeast()->once();
        $this->app->instance(PlatformBilling::class, $billingMock);

        $response = $this->actingAs($admin)
            ->post("http://umahz.test/admin/clinics/{$tenant->id}/reject", [
                'note' => 'Final rejection: unable to verify license credentials.',
                'sections' => ['documents_license'],
            ]);

        $response->assertSessionHasNoErrors();
        $tenant->refresh();

        $this->assertSame(Tenant::STATUS_REJECTED, $tenant->status);
        $this->assertFalse($tenant->canReapply());

        // Email is blocked
        $this->assertTrue(BlockedEmail::isBlocked('third@test.com'));
        $this->assertDatabaseHas('blocked_emails', [
            'email' => 'third@test.com',
            'tenant_id' => $tenant->id,
        ]);

        Notification::assertSentTo($owner, ClinicApplicationFinalRejectionNotification::class);
    }

    /**
     * Test 7: Permanent rejection immediately blocks email, unsets canReapply, audits and notifies.
     */
    public function test_permanent_rejection_immediately_blocks_email_and_marks_permanent(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$tenant, $owner, $profile] = $this->createPendingClinic('fraudclinic', 'fraud@badactor.com');

        $billingMock = Mockery::mock(PlatformBilling::class);
        $billingMock->shouldReceive('discardPaymentMethod')->atLeast()->once();
        $this->app->instance(PlatformBilling::class, $billingMock);

        $response = $this->actingAs($admin)
            ->post("http://umahz.test/admin/clinics/{$tenant->id}/reject-permanent", [
                'note' => 'Confirmed fraudulent license documentation.',
            ]);

        $response->assertSessionHasNoErrors();
        $tenant->refresh();

        $this->assertTrue((bool) $tenant->is_permanently_rejected);
        $this->assertSame(Tenant::STATUS_PERMANENTLY_REJECTED, $tenant->status);
        $this->assertFalse($tenant->canReapply());

        $this->assertTrue(BlockedEmail::isBlocked('fraud@badactor.com'));
        $this->assertDatabaseHas('blocked_emails', [
            'email' => 'fraud@badactor.com',
            'tenant_id' => $tenant->id,
        ]);

        Notification::assertSentTo($owner, ClinicApplicationPermanentRejectionNotification::class);

        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $tenant->id,
            'action' => 'clinic.permanently_rejected',
        ]);
    }

    /**
     * Test 8: Blocked email is prevented from registering anew with exact error message.
     */
    public function test_blocked_email_cannot_register_with_exact_error_message(): void
    {
        $admin = $this->createAdmin();
        BlockedEmail::create([
            'email' => 'blocked@example.com',
            'reason' => 'Previous permanent rejection',
            'blocked_by_user_id' => $admin->id,
        ]);

        $expectedMessage = "Applications from this email can't be accepted. Please contact support@umahz.com.";

        // Test send-code endpoint
        $response = $this->postJson('http://umahz.test/clinics/register/send-code', [
            'email' => 'blocked@example.com',
        ]);

        $response->assertStatus(422);
        $this->assertSame($expectedMessage, $response->json('reason'));

        // Test prepare endpoint
        $response2 = $this->postJson('http://umahz.test/clinics/register/prepare', [
            'email' => 'blocked@example.com',
        ]);
        $response2->assertStatus(422);
        $response2->assertJsonValidationErrors(['email']);
        $this->assertSame($expectedMessage, $response2->json('errors.email.0'));
    }

    /**
     * Test 9: Admin unbans email from /admin/blocked-emails, allowing re-registration.
     */
    public function test_admin_can_unban_email_with_reason_and_audit(): void
    {
        $admin = $this->createAdmin();
        [$tenant, $owner, $profile] = $this->createPendingClinic('unbancase', 'unban@example.com');
        $tenant->update(['is_permanently_rejected' => true, 'status' => Tenant::STATUS_PERMANENTLY_REJECTED]);

        $blocked = BlockedEmail::create([
            'email' => 'unban@example.com',
            'reason' => 'Appealed',
            'tenant_id' => $tenant->id,
            'blocked_by_user_id' => $admin->id,
        ]);

        $this->assertTrue(BlockedEmail::isBlocked('unban@example.com'));

        $response = $this->actingAs($admin)
            ->post("http://umahz.test/admin/blocked-emails/{$blocked->id}/unban", [
                'reason' => 'Provided valid government identification upon appeal.',
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertFalse(BlockedEmail::isBlocked('unban@example.com'));
        $this->assertFalse((bool) $tenant->refresh()->is_permanently_rejected);

        $this->assertDatabaseHas('audit_events', [
            'action' => 'clinic.email_unbanned',
            'reason' => 'Provided valid government identification upon appeal.',
        ]);
    }

    /**
     * Test 10: Subdomain release command frees expired held subdomains.
     */
    public function test_subdomain_release_command_releases_expired_subdomains(): void
    {
        [$tenant, $owner, $profile] = $this->createPendingClinic('oldheldsub', 'held@sub.com');
        $tenant->update([
            'status' => Tenant::STATUS_REJECTED,
            'rejected_at' => now()->subDays(35), // > 30 days default hold
        ]);

        $this->assertNull($tenant->subdomain_released_at);

        $this->artisan('clinics:release-subdomains')
            ->assertExitCode(0);

        $tenant->refresh();
        $this->assertNotNull($tenant->subdomain_released_at);
    }

    /**
     * Test 11: Document purge command deletes license documents for rejected clinics older than retention days.
     */
    public function test_document_purge_command_deletes_old_rejected_license_files(): void
    {
        Storage::fake('local');
        [$tenant, $owner, $profile] = $this->createPendingClinic('purgedoc', 'purge@clinic.com');

        $fakeFilePath = "licenses/{$tenant->id}/license.pdf";
        Storage::disk('local')->put($fakeFilePath, 'dummy pdf content');

        $profile->update([
            'license_document_path' => $fakeFilePath,
        ]);

        $tenant->update([
            'status' => Tenant::STATUS_PERMANENTLY_REJECTED,
            'is_permanently_rejected' => true,
            'rejected_at' => now()->subDays(95), // > 90 days retention
        ]);

        $this->assertTrue(Storage::disk('local')->exists($fakeFilePath));

        $this->artisan('clinics:purge-rejected-documents')
            ->assertExitCode(0);

        $tenant->refresh();
        $profile->refresh();

        $this->assertNotNull($tenant->documents_purged_at);
        $this->assertFalse(Storage::disk('local')->exists($fakeFilePath));
        $this->assertNull($profile->license_document_path);
    }

    /**
     * Test 12: Review queue flags matching blocked business registration number or phone.
     */
    public function test_review_queue_flags_matching_blocked_clinic(): void
    {
        $admin = $this->createAdmin();

        BlockedEmail::create([
            'email' => 'badactor@firm.com',
            'reason' => 'Fraud',
            'business_registration_number' => 'BRN-MATCH-777',
            'phone' => '+15554443333',
            'blocked_by_user_id' => $admin->id,
        ]);

        // New clinic with different email but matching business registration number
        [$newTenant, $owner, $profile] = $this->createPendingClinic('newattempt', 'innocentlooking@firm.com');
        $newTenant->update([
            'business_registration_number' => 'BRN-MATCH-777',
        ]);

        $response = $this->actingAs($admin)
            ->get("http://umahz.test/admin/clinics/{$newTenant->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Clinics/Show')
            ->where('tenant.matches_blocked', true)
            ->where('tenant.blocked_match_reason', fn ($r) => str_contains($r, 'business registration number'))
        );
    }
}
