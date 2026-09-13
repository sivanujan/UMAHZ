<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\PlatformSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PlatformSettingsController extends Controller
{
    /**
     * Display the platform settings editor with system diagnostics.
     */
    public function index(Request $request): Response
    {
        $settings = PlatformSetting::getAll();

        $systemInfo = [
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'environment' => app()->environment(),
            'database_driver' => config('database.default'),
            'cache_driver' => config('cache.default'),
            'queue_driver' => config('queue.default'),
            'server_time' => now()->format('Y-m-d H:i:s T'),
            'timezone' => config('app.timezone'),
        ];

        return Inertia::render('Admin/Settings/Index', [
            'settings' => $settings,
            'systemInfo' => $systemInfo,
        ]);
    }

    /**
     * Save updated platform settings.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            // General
            'platform_name' => ['required', 'string', 'max:100'],
            'support_email' => ['required', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'default_currency' => ['required', 'string', 'size:3'],
            'default_timezone' => ['required', 'string', 'max:100'],

            // Onboarding & Approvals
            'require_admin_approval' => ['required', 'boolean'],
            'allow_self_registration' => ['required', 'boolean'],
            'require_license_document' => ['required', 'boolean'],
            'trial_period_days' => ['required', 'integer', 'min:0', 'max:365'],

            // Security
            'enforce_2fa_staff' => ['required', 'boolean'],
            'session_timeout_minutes' => ['required', 'integer', 'min:15', 'max:1440'],
            'max_failed_login_attempts' => ['required', 'integer', 'min:3', 'max:20'],

            // System & Announcements
            'system_announcement' => ['nullable', 'string', 'max:1000'],
            'show_announcement' => ['required', 'boolean'],
        ]);

        $groups = [
            'platform_name' => 'general',
            'support_email' => 'general',
            'contact_phone' => 'general',
            'default_currency' => 'general',
            'default_timezone' => 'general',

            'require_admin_approval' => 'onboarding',
            'allow_self_registration' => 'onboarding',
            'require_license_document' => 'onboarding',
            'trial_period_days' => 'onboarding',

            'enforce_2fa_staff' => 'security',
            'session_timeout_minutes' => 'security',
            'max_failed_login_attempts' => 'security',

            'system_announcement' => 'maintenance',
            'show_announcement' => 'maintenance',
        ];

        DB::transaction(function () use ($validated, $groups, $request) {
            foreach ($validated as $key => $value) {
                PlatformSetting::set(
                    $key,
                    $value,
                    $groups[$key] ?? 'general'
                );
            }

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'action' => 'platform_settings.updated',
                'resource_type' => PlatformSetting::class,
                'resource_id' => 'all',
                'ip_address' => $request->ip(),
                'metadata' => $validated,
            ]);
        });

        PlatformSetting::clearCache();

        return back()->with('success', 'Platform settings saved successfully.');
    }

    /**
     * Clear all application, route, config, and view caches.
     */
    public function clearCache(Request $request): RedirectResponse
    {
        try {
            Artisan::call('optimize:clear');
            PlatformSetting::clearCache();

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'action' => 'system.cache_cleared',
                'resource_type' => PlatformSetting::class,
                'resource_id' => 'cache',
                'ip_address' => $request->ip(),
            ]);

            return back()->with('success', 'All system, configuration, and route caches cleared successfully.');
        } catch (\Throwable $e) {
            return back()->withErrors(['cache' => 'Failed to clear cache: ' . $e->getMessage()]);
        }
    }
}
