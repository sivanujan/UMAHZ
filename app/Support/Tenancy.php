<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Host/URL helpers for the multi-domain layout (central domain, per-clinic
 * staff subdomains, common patient portal host) plus the shared subdomain
 * validation rules. Single source of truth so the availability endpoint, the
 * registration store and the backfill all agree.
 */
class Tenancy
{
    public static function centralDomain(): string
    {
        return config('tenancy.central_domain');
    }

    public static function portalHost(): string
    {
        return config('tenancy.portal_host');
    }

    /**
     * The fully-qualified host for a clinic subdomain, e.g.
     * "lotus.umahz.com" (no scheme, no port).
     */
    public static function hostFor(string $subdomain): string
    {
        return strtolower($subdomain).'.'.static::centralDomain();
    }

    /**
     * An absolute URL on a clinic's subdomain, carrying the scheme and port
     * of the configured APP_URL so it works identically on lvh.me:8000 and
     * https://umahz.com.
     */
    public static function urlFor(string $subdomain, string $path = ''): string
    {
        return static::urlForHost(static::hostFor($subdomain), $path);
    }

    /**
     * An absolute URL on the patient portal host.
     */
    public static function portalUrl(string $path = ''): string
    {
        return static::urlForHost(static::portalHost(), $path);
    }

    protected static function urlForHost(string $host, string $path): string
    {
        $base = parse_url(config('app.url'));
        $scheme = $base['scheme'] ?? 'https';
        $port = isset($base['port']) ? ':'.$base['port'] : '';
        $path = $path === '' ? '' : '/'.ltrim($path, '/');

        return "{$scheme}://{$host}{$port}{$path}";
    }

    /**
     * Normalise raw user input into a candidate subdomain (lowercased, trimmed).
     */
    public static function normalize(?string $value): string
    {
        return strtolower(trim((string) $value));
    }

    public static function isReserved(string $subdomain): bool
    {
        return in_array($subdomain, config('tenancy.reserved_subdomains'), true);
    }

    /**
     * Redirect to a URL that may live on a DIFFERENT host (a clinic subdomain
     * or the portal host). Inertia's client can't follow a cross-origin
     * redirect from an XHR visit — it needs a full-page location visit — so
     * for a cross-host target we return Inertia::location(); for a same-host
     * target an ordinary redirect is fine. Works for non-Inertia requests too
     * (Inertia::location falls back to a normal redirect).
     */
    public static function redirectTo(Request $request, string $url): Response
    {
        $host = parse_url($url, PHP_URL_HOST);

        if ($host && $host !== $request->getHost()) {
            return Inertia::location($url);
        }

        return redirect()->to($url);
    }

    /**
     * Derive a valid, unique subdomain from a seed (clinic name or slug),
     * avoiding a set of already-taken values. Used to backfill existing
     * tenants. Guarantees the result satisfies the same length/format/reserved
     * rules the wizard enforces.
     *
     * @param  array<int, string>  $taken  subdomains already in use
     */
    public static function generateSubdomain(string $seed, array $taken = []): string
    {
        $min = (int) config('tenancy.subdomain_min');
        $max = (int) config('tenancy.subdomain_max');
        $pattern = config('tenancy.subdomain_pattern');

        $base = trim(Str::slug($seed) ?: 'clinic', '-');

        // Pad short bases so they clear the minimum length.
        if (strlen($base) < $min) {
            $base = trim(substr($base.'-clinic', 0, $max), '-');
        }

        $base = substr($base, 0, $max);
        $candidate = $base;
        $suffix = 1;

        while (
            in_array($candidate, $taken, true)
            || static::isReserved($candidate)
            || ! preg_match($pattern, $candidate)
        ) {
            $suffix++;
            $tail = '-'.$suffix;
            $candidate = trim(substr($base, 0, $max - strlen($tail)).$tail, '-');
        }

        return $candidate;
    }

    /**
     * Validation rules for the `subdomain` field. Pass the id of a tenant to
     * ignore (e.g. when editing an existing clinic) — omitted at registration.
     *
     * @return array<int, mixed>
     */
    public static function rules(?string $ignoreTenantId = null): array
    {
        $unique = Rule::unique('tenants', 'subdomain');

        if ($ignoreTenantId !== null) {
            $unique->ignore($ignoreTenantId);
        }

        return [
            'required',
            'string',
            'lowercase',
            'min:'.config('tenancy.subdomain_min'),
            'max:'.config('tenancy.subdomain_max'),
            'regex:'.config('tenancy.subdomain_pattern'),
            Rule::notIn(config('tenancy.reserved_subdomains')),
            $unique,
        ];
    }
}
