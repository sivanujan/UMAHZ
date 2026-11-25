<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Support\RoleRedirect;
use App\Support\Tenancy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class AuthenticatedSessionController extends Controller
{
    private const LAST_CLINIC_COOKIE = 'umahz_last_clinic';

    /**
     * Display the login view.
     */
    public function create(Request $request): Response
    {
        $props = $this->baseLoginProps($request);

        if ($props['isCentral'] && $props['clinic'] === null) {
            $props['lastClinic'] = $this->resolveLastClinicFromCookie($request);
        }

        return Inertia::render('Auth/Login', $props);
    }

    /**
     * Identifier-first email lookup on the central domain.
     * Routes staff to their clinic subdomain (1 clinic), renders a clinic
     * chooser (>1 clinic), keeps platform admins / pending owners on the
     * central domain password step, or shows a neutral fallback without
     * revealing whether an email exists.
     */
    public function lookup(Request $request): Response|HttpResponse|RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $email = mb_strtolower(trim($validated['email']));

        // Security audit log — never log passwords.
        Log::info('auth.identifier_lookup', [
            'email' => $email,
            'ip' => $request->ip(),
            'host' => $request->getHost(),
        ]);

        $props = $this->baseLoginProps($request);
        $props['lookupEmail'] = $email;

        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        // 1. Platform admin stays on the central domain for the password step.
        if ($user && $user->isPlatformAdmin()) {
            $props['step'] = 'password';
            $props['prefilledEmail'] = $user->email;

            return Inertia::render('Auth/Login', $props);
        }

        if ($user) {
            $memberships = $user->activeWorkspaceMemberships()->with('tenant')->get();

            $approvedMemberships = $memberships->filter(
                fn($m) => $m->tenant && $m->tenant->isApproved() && !$m->tenant->is_manually_suspended
            )->values();

            $unapprovedMemberships = $memberships->filter(
                fn($m) => $m->tenant && (!$m->tenant->isApproved() || $m->tenant->is_manually_suspended)
            )->values();

            // 2. Exactly one approved clinic -> redirect with short-lived encrypted token.
            if ($approvedMemberships->count() === 1) {
                $tenant = $approvedMemberships->first()->tenant;
                $token = $this->createLoginToken($user->email, $tenant);

                return Tenancy::redirectTo($request, $tenant->appUrl('/login?lt=' . urlencode($token)));
            }

            // 3. Multiple approved clinics -> show clinic chooser.
            if ($approvedMemberships->count() > 1) {
                $props['step'] = 'choose_clinic';
                $props['clinics'] = $approvedMemberships->map(fn($m) => [
                    'tenant_id' => $m->tenant->id,
                    'name' => $m->tenant->name,
                    'subdomain' => $m->tenant->subdomain,
                    'logo_url' => $m->tenant->logo_url,
                    'accent_color' => $m->tenant->brand_color,
                    'role' => $m->role,
                ])->values()->all();

                return Inertia::render('Auth/Login', $props);
            }

            // 4. Pending / not-yet-approved / suspended clinic owner -> password step
            //    on the central domain so they land on /clinic/status instead of 403.
            if ($unapprovedMemberships->isNotEmpty()) {
                $props['step'] = 'password';
                $props['prefilledEmail'] = $user->email;
                $props['status'] = 'Your clinic application is currently under review or needs attention. Sign in to view its status.';

                return Inertia::render('Auth/Login', $props);
            }
        }

        // 5. Email not found (or has no active staff workspace) -> neutral message,
        //    no account-existence leak.
        $props['step'] = 'not_found';
        $props['neutralMessage'] = "If this email has a UMAHZ account, continue to your clinic's login page.";

        return Inertia::render('Auth/Login', $props);
    }

    /**
     * Complete clinic selection when a user belongs to multiple clinics.
     */
    public function chooseClinic(Request $request): HttpResponse|RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'tenant_id' => ['required', 'uuid'],
        ]);

        $email = mb_strtolower(trim($validated['email']));
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if (!$user) {
            return back()->withErrors([
                'email' => 'Unable to continue to the selected clinic. Please try again.',
            ]);
        }

        $membership = $user->activeWorkspaceMemberships()
            ->with('tenant')
            ->where('tenant_id', $validated['tenant_id'])
            ->first();

        $tenant = $membership?->tenant;

        if (!$tenant || !$tenant->isApproved() || $tenant->is_manually_suspended) {
            return back()->withErrors([
                'email' => 'This clinic workspace is not available.',
            ]);
        }

        $token = $this->createLoginToken($user->email, $tenant);

        return Tenancy::redirectTo($request, $tenant->appUrl('/login?lt=' . urlencode($token)));
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request): HttpResponse|RedirectResponse
    {
        $subdomain = Tenancy::subdomainFromHost($request->getHost());
        $tenant = null;

        if ($subdomain !== null) {
            $tenant = Tenant::withoutGlobalScopes()->where('subdomain', $subdomain)->first();
            if (!$tenant || $tenant->status !== Tenant::STATUS_APPROVED) {
                return back()->withErrors([
                    'email' => 'This clinic workspace was not found or is currently inactive.',
                ])->onlyInput('email');
            }
        }

        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors([
                'email' => 'The provided credentials do not match our records.',
            ])->onlyInput('email');
        }

        $user = $request->user();

        // Strict clinic membership check on subdomain logins: a user cannot
        // log in to a clinic they do not belong to.
        if ($tenant !== null) {
            $belongs = $user->activeWorkspaceMemberships()
                ->where('tenant_id', $tenant->id)
                ->exists();

            if (!$belongs) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return back()->withErrors([
                    'email' => 'You do not have access to this clinic workspace.',
                ])->onlyInput('email');
            }
        }

        $request->session()->regenerate();

        // Remember last clinic on a cross-subdomain cookie for the main-domain
        // shortcut (never auto-redirects).
        if ($tenant !== null) {
            Cookie::queue(cookie(
                self::LAST_CLINIC_COOKIE,
                json_encode([
                    'name' => $tenant->name,
                    'subdomain' => $tenant->subdomain,
                ]),
                60 * 24 * 30,
                '/',
                config('session.domain'),
                (bool) config('session.secure'),
                true,
                false,
                config('session.same_site', 'lax')
            ));
        }

        // Pending / unapproved clinic owners signing in on the central domain
        // go straight to the existing clinic status page flow, not a 403.
        if ($subdomain === null && !$user->isPlatformAdmin()) {
            $memberships = $user->activeWorkspaceMemberships()->with('tenant')->get();
            $approved = $memberships->filter(
                fn($m) => $m->tenant && $m->tenant->isApproved() && !$m->tenant->is_manually_suspended
            );

            if ($approved->isEmpty() && $memberships->isNotEmpty()) {
                $request->session()->put('current_tenant_id', $memberships->first()->tenant_id);

                return redirect('/clinic/status');
            }
        }

        $target = RoleRedirect::path($request, $user);
        $host = parse_url($target, PHP_URL_HOST);

        if ($host && $host !== $request->getHost()) {
            return Inertia::location($target);
        }

        return redirect()->intended($target);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }

    /**
     * Shared Inertia props for the login screen across central, subdomain, and portal hosts.
     */
    private function baseLoginProps(Request $request): array
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
                if (!$resolvedTenant || $resolvedTenant->status !== Tenant::STATUS_APPROVED) {
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

            if (!$clinic) {
                $clinicNotFound = true;
            }
        }

        $prefilledEmail = $this->decodeLoginToken(
            $request->query('lt'),
            $resolvedTenant
        );

        $baseUrl = parse_url(config('app.url'));

        return [
            'status' => session('status'),
            'canRegisterClient' => $isPortal,
            'canRegisterClinic' => $isCentral,
            'isCentral' => $isCentral,
            'clinic' => $clinic,
            'clinicNotFound' => $clinicNotFound,
            'centralLoginUrl' => Tenancy::centralUrl('/login'),
            'centralDomain' => Tenancy::centralDomain(),
            'appScheme' => $baseUrl['scheme'] ?? 'https',
            'appPort' => isset($baseUrl['port']) ? (string) $baseUrl['port'] : '',
            'step' => $isCentral ? 'email' : 'password',
            'prefilledEmail' => $prefilledEmail,
            'lookupEmail' => $prefilledEmail ?? '',
            'clinics' => [],
            'neutralMessage' => null,
            'lastClinic' => null,
        ];
    }

    private function createLoginToken(string $email, Tenant $tenant): string
    {
        return Crypt::encryptString(json_encode([
            'email' => $email,
            'tenant_id' => $tenant->id,
            'exp' => now()->addMinutes(10)->timestamp,
        ]));
    }

    private function decodeLoginToken(mixed $token, ?Tenant $tenant): ?string
    {
        if (!is_string($token) || $token === '' || !$tenant) {
            return null;
        }

        try {
            $payload = json_decode(Crypt::decryptString($token), true);
        } catch (\Throwable) {
            return null;
        }

        if (!is_array($payload)) {
            return null;
        }

        if (
            empty($payload['email'])
            || empty($payload['tenant_id'])
            || empty($payload['exp'])
            || $payload['tenant_id'] !== $tenant->id
            || (int) $payload['exp'] < now()->timestamp
        ) {
            return null;
        }

        return (string) $payload['email'];
    }

    private function resolveLastClinicFromCookie(Request $request): ?array
    {
        $raw = $request->cookie(self::LAST_CLINIC_COOKIE);
        if (!is_string($raw) || $raw === '') {
            return null;
        }

        $data = json_decode($raw, true);
        $subdomain = is_array($data) ? ($data['subdomain'] ?? null) : null;
        if (!is_string($subdomain) || $subdomain === '') {
            return null;
        }

        $tenant = Tenant::withoutGlobalScopes()
            ->where('subdomain', Tenancy::normalize($subdomain))
            ->where('status', Tenant::STATUS_APPROVED)
            ->where('is_manually_suspended', false)
            ->first();

        if (!$tenant) {
            return null;
        }

        return [
            'name' => $tenant->name,
            'subdomain' => $tenant->subdomain,
            'login_url' => $tenant->appUrl('/login'),
        ];
    }
}
