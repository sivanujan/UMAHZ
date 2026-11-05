<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InsuranceProviderSeeder extends Seeder
{
    /**
     * Seed global reference insurance providers (tenant_id = null).
     * These providers are platform-wide reference data available to all clinics,
     * and are not editable or removable by individual tenants.
     */
    public function run(): void
    {
        $now = now();

        $starterProviders = [
            [
                'name' => 'Manulife',
                'code' => 'manulife',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Canada Life',
                'code' => 'canada_life',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Sun Life',
                'code' => 'sun_life',
                'province' => null,
                'network' => 'sun_life',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'GreenShield Canada',
                'code' => 'greenshield',
                'province' => null,
                'network' => 'greenshield',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Desjardins Insurance',
                'code' => 'desjardins',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Industrial Alliance (iA Financial Group)',
                'code' => 'industrial_alliance',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Equitable Life of Canada',
                'code' => 'equitable',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Beneva',
                'code' => 'beneva',
                'province' => null,
                'network' => 'telus_eclaims',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Alberta Blue Cross',
                'code' => 'alberta_blue_cross',
                'province' => 'AB',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Pacific Blue Cross',
                'code' => 'pacific_blue_cross',
                'province' => 'BC',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Medavie Blue Cross',
                'code' => 'medavie_blue_cross',
                'province' => null,
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Ontario Blue Cross',
                'code' => 'ontario_blue_cross',
                'province' => 'ON',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Quebec Blue Cross',
                'code' => 'quebec_blue_cross',
                'province' => 'QC',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Manitoba Blue Cross',
                'code' => 'manitoba_blue_cross',
                'province' => 'MB',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Saskatchewan Blue Cross',
                'code' => 'saskatchewan_blue_cross',
                'province' => 'SK',
                'network' => 'blue_cross',
                'supports_direct_billing' => true,
                'active' => true,
            ],
            [
                'name' => 'Other',
                'code' => 'other',
                'province' => null,
                'network' => 'other',
                'supports_direct_billing' => false,
                'active' => true,
            ],
        ];

        foreach ($starterProviders as $provider) {
            $existing = DB::table('insurance_providers')
                ->whereNull('tenant_id')
                ->where('code', $provider['code'])
                ->first();

            if ($existing) {
                DB::table('insurance_providers')
                    ->where('id', $existing->id)
                    ->update(array_merge($provider, [
                        'updated_at' => $now,
                    ]));
            } else {
                DB::table('insurance_providers')->insert(array_merge($provider, [
                    'id' => (string) Str::uuid(),
                    'tenant_id' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]));
            }
        }
    }
}

