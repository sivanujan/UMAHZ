<?php

namespace App\Support;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AuthBranding
{
    /**
     * Resolve shared multi-tenant branding props for auth pages (Login,
     * ForgotPassword, ResetPassword, VerifyEmail).
     *
     * @return array{
     *     props: array<string, mixed>,
     *     tenant: ?Tenant,
     * }
     */
    public static function resolve(Request $request): array
    {
        $host = $request->getHost();
        $isCentral = $host === Tenancy::centralDomain();
        $isPortal = $host === Tenancy::portalHost();
        $subdomain = Tenancy::subdomainFromHost($host);

        $clinic = null;
        $clinicNotFound = false;
        $resolvedTenant = null;

        if ($subdomain !== null) {
            $resolvedTenant = Tenant::withoutGlobalScopes()
                ->where('subdomain', $subdomain)
                ->first();

            $clinic = Cache::remember("tenant_login_branding_{$subdomain}", 300, function () use ($resolvedTenant) {
                if (! $resolvedTenant || $resolvedTenant->status !== Tenant::STATUS_APPROVED) {
                    return null;
                }

                return [
                    'name' => $resolvedTenant->name,
                    'subdomain' => $resolvedTenant->subdomain,
                    'logo_url' => $resolvedTenant->logo_url,
                    'accent_color' => $resolvedTenant->brand_color,
                    'tagline' => $resolvedTenant->homepage_settings['tagline'] ?? null,
                ];
            });

            if (! $clinic) {
                $clinicNotFound = true;
            }
        }

        $baseUrl = parse_url(config('app.url'));

        return [
            'tenant' => $resolvedTenant,
            'props' => [
                'canRegisterClient' => $isPortal,
                'canRegisterClinic' => $isCentral,
                'isCentral' => $isCentral,
                'clinic' => $clinic,
                'clinicNotFound' => $clinicNotFound,
                'centralLoginUrl' => Tenancy::centralUrl('/login'),
                'centralDomain' => Tenancy::centralDomain(),
                'appScheme' => $baseUrl['scheme'] ?? 'https',
                'appPort' => isset($baseUrl['port']) ? (string) $baseUrl['port'] : '',
            ],
        ];
    }
}
