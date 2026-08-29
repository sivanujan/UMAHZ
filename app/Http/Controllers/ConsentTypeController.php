<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\ConsentType;
use App\Scopes\TenantScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ConsentTypeController extends Controller
{
    /**
     * Display the clinic's consent types and text configuration.
     */
    public function index(Request $request): Response
    {
        $tenantId = TenantScope::getTenantId();
        ConsentType::ensureDefaultsForTenant($tenantId);

        $consentTypes = ConsentType::where('tenant_id', $tenantId)
            ->withCount('consents')
            ->orderBy('name')
            ->get();

        return Inertia::render('Settings/Consents', [
            'consentTypes' => $consentTypes,
        ]);
    }

    /**
     * Store a new custom consent type for the clinic.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = TenantScope::getTenantId();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'body' => ['nullable', 'string', 'max:50000'],
        ]);

        $code = Str::slug($data['name'], '_');

        $consentType = ConsentType::create([
            'tenant_id' => $tenantId,
            'name' => trim($data['name']),
            'code' => $code,
            'description' => $data['description'] ?? null,
            'body' => $data['body'] ?? null,
            'is_active' => true,
        ]);

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'consent_type.created',
            'resource_type' => ConsentType::class,
            'resource_id' => $consentType->id,
            'ip_address' => $request->ip(),
        ]);

        return back()->with('success', "Consent type \"{$consentType->name}\" created.");
    }

    /**
     * Update an existing consent type's name, description, or legal agreement body text.
     */
    public function update(Request $request, ConsentType $consentType): RedirectResponse
    {
        abort_unless($consentType->tenant_id === TenantScope::getTenantId(), 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'body' => ['nullable', 'string', 'max:50000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $consentType->update($data);

        AuditEvent::create([
            'tenant_id' => TenantScope::getTenantId(),
            'user_id' => $request->user()->id,
            'action' => 'consent_type.updated',
            'resource_type' => ConsentType::class,
            'resource_id' => $consentType->id,
            'ip_address' => $request->ip(),
        ]);

        return back()->with('success', "Consent settings for \"{$consentType->name}\" saved.");
    }
}
