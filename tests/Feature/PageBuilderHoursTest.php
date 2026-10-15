<?php

namespace Tests\Feature;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The Page Builder's hours (starter page, Hours block, top bar) come from the clinic's real
 * business_hours — no hard-coded "Mon – Fri 9–6, Sat 10–3".
 */
class PageBuilderHoursTest extends TestCase
{
    use RefreshDatabase;

    private const HOURS = [
        'monday' => ['closed' => false, 'open' => '09:00', 'close' => '18:00'],
        'tuesday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
        'wednesday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
        'thursday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
        'friday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
        'saturday' => ['closed' => true, 'open' => '10:00', 'close' => '15:00'],
        'sunday' => ['closed' => true, 'open' => '09:00', 'close' => '17:00'],
    ];

    private function clinic(?array $hours, string $sub = 'maple'): Tenant
    {
        return Tenant::create([
            'name' => 'Maple Test Clinic', 'slug' => $sub, 'subdomain' => $sub,
            'status' => Tenant::STATUS_APPROVED, 'onboarding_completed_at' => now(),
            'requested_disciplines' => ['massage_therapy'], 'business_hours' => $hours,
        ]);
    }

    public function test_rows_group_identical_days_and_show_closed_days_as_closed(): void
    {
        $this->assertSame([
            ['days' => 'Monday', 'hours' => '9:00 AM – 6:00 PM', 'closed' => false],
            ['days' => 'Tuesday – Friday', 'hours' => '9:00 AM – 5:00 PM', 'closed' => false],
            ['days' => 'Saturday – Sunday', 'hours' => 'Closed', 'closed' => true], // closed even though times are stored
        ], $this->clinic(self::HOURS)->businessHoursRows());
    }

    public function test_summary_is_the_first_open_period(): void
    {
        $this->assertSame('Mon: 9:00 AM – 6:00 PM', $this->clinic(self::HOURS)->businessHoursSummary());

        $weekdays = array_merge(self::HOURS, ['monday' => self::HOURS['tuesday']]);
        $this->assertSame('Mon – Fri: 9:00 AM – 5:00 PM', $this->clinic($weekdays, 'maple2')->businessHoursSummary());
    }

    public function test_no_hours_on_file_gives_no_rows_and_no_summary(): void
    {
        $tenant = $this->clinic(null);
        $this->assertSame([], $tenant->businessHoursRows());
        $this->assertNull($tenant->businessHoursSummary());
    }

    public function test_page_builder_receives_the_real_hours(): void
    {
        $tenant = $this->clinic(self::HOURS);
        $owner = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $tenant->id, 'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER, 'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        $this->actingAs($owner)
            ->get('http://maple.umahz.test/app/settings/page-builder')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Settings/PageBuilder')
                ->where('tenant.hours_rows', $tenant->businessHoursRows())
                ->where('tenant.hours_summary', 'Mon: 9:00 AM – 6:00 PM'));
    }
}
