<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Support\Tenancy;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public branded home page for a clinic subdomain ({clinic}.umahz.com/).
 *
 * Visible to everyone — no auth required. Renders the clinic's logo, cover
 * image, tagline, description, contact info, business hours, social links,
 * and the two default CTA buttons (Pay Invoices / Staff Login) plus any
 * custom buttons the clinic owner configured.
 */
class ClinicHomeController extends Controller
{
    public function show(Request $request): Response
    {
        $subdomain = Tenancy::normalize((string) $request->route('tenant'));

        $tenant = Tenant::withoutGlobalScopes()
            ->where('subdomain', $subdomain)
            ->firstOrFail();

        /** @var array $hp */
        $hp     = $tenant->homepage_settings ?? [];
        $social = $hp['social'] ?? [];

        $rawHtml = $hp['gjs_html'] ?? null;
        $rawCss  = $hp['gjs_css'] ?? null;

        $gjsHtml = $rawHtml ? \App\Support\HtmlSanitizer::sanitize($rawHtml) : null;
        $gjsCss  = $rawCss ? \App\Support\HtmlSanitizer::sanitizeCss($rawCss) : null;

        return Inertia::render('Clinic/PublicHome', [
            'clinic' => [
                // Core identity
                'name'         => $tenant->name,
                'subdomain'    => $tenant->subdomain,
                'logo_url'     => $tenant->logo_url,
                'brand_color'  => $tenant->brand_color ?: '#6d28d9',
                // Contact
                'email'        => $tenant->email ?: $tenant->primary_contact_email,
                'phone'        => $tenant->phone ?: $tenant->primary_contact_phone,
                'address'      => $tenant->address,
                // Hours & disciplines
                'business_hours'         => $tenant->business_hours,
                'offeredDisciplineLabels' => $tenant->offeredDisciplineLabels(),
                // Homepage settings blob
                'homepage_settings' => [
                    'cover_image_url' => $hp['cover_image_url'] ?? null,
                    'social' => [
                        'instagram' => $social['instagram'] ?? null,
                        'facebook'  => $social['facebook']  ?? null,
                        'twitter'   => $social['twitter']   ?? null,
                        'linkedin'  => $social['linkedin']  ?? null,
                        'tiktok'    => $social['tiktok']    ?? null,
                        'youtube'   => $social['youtube']   ?? null,
                        'website'   => $social['website']   ?? null,
                    ],
                ],
                // GrapesJS output
                'gjs_html' => $gjsHtml,
                'gjs_css'  => $gjsCss,
            ],
        ]);
    }
}
