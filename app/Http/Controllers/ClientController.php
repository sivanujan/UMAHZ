<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\Consent;
use App\Models\ConsentType;
use App\Rules\NotDisposableEmail;
use App\Scopes\TenantScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    /**
     * Display a listing of clients for the current clinic tenant.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $status = (string) $request->query('status', 'all');

        $query = Client::query()
            ->withCount('appointments');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereRaw("first_name || ' ' || last_name like ?", ["%{$search}%"]);
            });
        }

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $clients = $query
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Client $client) => $this->present($client));

        return Inertia::render('Clients/Index', [
            'clients' => $clients,
            'filters' => [
                'search' => $search ?: null,
                'status' => $status,
            ],
        ]);
    }

    /**
     * Store a newly created client for the current clinic tenant.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatedData($request);

        $client = DB::transaction(function () use ($request, $data) {
            $client = Client::create($data); // tenant_id auto-assigned by BelongsToTenant
            $this->audit($request, 'client.created', $client);

            return $client;
        });

        return back()->with('success', "Client \"{$client->full_name}\" added.");
    }

    /**
     * Display the specified client's basic profile.
     */
    public function show(Request $request, Client $client): Response
    {
        $this->authorizeClient($client);

        $client->loadCount('appointments');

        $tenantId = TenantScope::getTenantId();
        ConsentType::ensureDefaultsForTenant($tenantId);

        $consents = $client->consents()
            ->with(['witnessedBy', 'withdrawnBy'])
            ->get()
            ->map(fn (Consent $c) => [
                'id' => $c->id,
                'consent_type_name' => $c->consent_type_name,
                'consent_type_id' => $c->consent_type_id,
                'consent_body' => $c->consent_body,
                'signer_name' => $c->signer_name,
                'signature_type' => $c->signature_type,
                'signature_data' => $c->signature_data,
                'agreed_at' => $c->agreed_at->toIso8601String(),
                'witnessed_by' => $c->witnessedBy?->name ?? 'Staff',
                'status' => $c->status,
                'withdrawn_at' => $c->withdrawn_at?->toIso8601String(),
                'withdrawn_by' => $c->withdrawnBy?->name,
                'withdrawal_reason' => $c->withdrawal_reason,
            ]);

        $consentTypes = ConsentType::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'description', 'body']);

        \App\Models\IntakeFormTemplate::ensureDefaultsForTenant($tenantId);

        $tenant = $client->tenant ?: \App\Models\Tenant::find($tenantId);
        $offeredDisciplines = $tenant?->requested_disciplines ?: \App\Http\Controllers\Onboarding\ClinicRegistrationController::DISCIPLINES;

        $intakes = $client->intakes()
            ->with(['submittedByUser', 'appointment'])
            ->latest('created_at')
            ->get()
            ->map(fn (\App\Models\ClientIntake $i) => [
                'id' => $i->id,
                'discipline' => $i->discipline,
                'template_name' => $i->template_name,
                'status' => $i->status,
                'submission_type' => $i->submission_type,
                'token' => $i->token,
                'public_fill_url' => $i->token ? url("/intake/{$i->token}") : null,
                'expires_at' => $i->expires_at?->toIso8601String(),
                'is_expired' => $i->isExpired(),
                'submitted_at' => $i->submitted_at?->toIso8601String(),
                'submitted_by' => $i->submittedByUser?->name,
                'contraindication_flags' => $i->contraindication_flags ?? [],
                'flags_count' => count($i->contraindication_flags ?? []),
                'appointment' => $i->appointment ? [
                    'id' => $i->appointment->id,
                    'starts_at' => $i->appointment->starts_at->toIso8601String(),
                    'service_name' => $i->appointment->service_name,
                ] : null,
            ]);

        $intakeTemplates = \App\Models\IntakeFormTemplate::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->whereIn('discipline', $offeredDisciplines)
            ->get(['id', 'discipline', 'name', 'description', 'schema']);

        $clientAppointments = $client->appointments()
            ->latest('starts_at')
            ->take(10)
            ->get(['id', 'starts_at', 'service_name', 'status']);

        return Inertia::render('Clients/Show', [
            'client' => $this->present($client),
            'consents' => $consents,
            'consentTypes' => $consentTypes,
            'intakes' => $intakes,
            'intakeTemplates' => $intakeTemplates,
            'clientAppointments' => $clientAppointments,
            'offeredDisciplines' => $offeredDisciplines,
        ]);
    }

    /**
     * Update the specified client's details.
     */
    public function update(Request $request, Client $client): RedirectResponse
    {
        $this->authorizeClient($client);

        $data = $this->validatedData($request, $client);

        DB::transaction(function () use ($request, $client, $data) {
            $client->update($data);
            $this->audit($request, 'client.updated', $client);
        });

        return back()->with('success', "Client \"{$client->full_name}\" updated.");
    }

    /**
     * Toggle client active / inactive status.
     */
    public function toggle(Request $request, Client $client): RedirectResponse
    {
        $this->authorizeClient($client);

        DB::transaction(function () use ($request, $client) {
            $client->update(['is_active' => ! $client->is_active]);
            $this->audit(
                $request,
                $client->is_active ? 'client.reactivated' : 'client.deactivated',
                $client
            );
        });

        return back()->with(
            'success',
            $client->is_active
                ? "Client \"{$client->full_name}\" reactivated."
                : "Client \"{$client->full_name}\" deactivated."
        );
    }

    /**
     * Delete a client if no appointment history exists; otherwise guide to deactivate.
     */
    public function destroy(Request $request, Client $client): RedirectResponse
    {
        $this->authorizeClient($client);

        if (Appointment::where('client_id', $client->id)->exists()) {
            return back()->withErrors([
                'client' => 'This client has appointment history and cannot be deleted. Deactivate them instead to preserve clinical history.',
            ]);
        }

        $name = $client->full_name;

        DB::transaction(function () use ($request, $client) {
            $this->audit($request, 'client.deleted', $client);
            $client->delete();
        });

        return redirect()->route('app.clients.index')->with('success', "Client \"{$name}\" removed.");
    }

    /**
     * Ensure client strictly belongs to the current active tenant;
     * return a clean 404 otherwise to avoid existence disclosure.
     */
    protected function authorizeClient(Client $client): void
    {
        abort_unless($client->tenant_id === TenantScope::getTenantId(), 404);
    }

    /**
     * Validate client creation or update payload.
     *
     * @return array<string, mixed>
     */
    protected function validatedData(Request $request, ?Client $client = null): array
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255', new NotDisposableEmail],
            'phone' => ['nullable', 'string', 'max:50'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'sex' => ['nullable', 'string', Rule::in(Client::SEXES)],
            'preferred_contact_method' => ['nullable', 'string', Rule::in(['email', 'phone', 'sms'])],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:50'],
            'emergency_contact_relationship' => ['nullable', 'string', 'max:100'],
        ]);

        $emergencyContact = null;
        if (! empty($validated['emergency_contact_name']) || ! empty($validated['emergency_contact_phone']) || ! empty($validated['emergency_contact_relationship'])) {
            $emergencyContact = [
                'name' => $validated['emergency_contact_name'] ?? null,
                'phone' => $validated['emergency_contact_phone'] ?? null,
                'relationship' => $validated['emergency_contact_relationship'] ?? null,
            ];
        }

        return [
            'first_name' => trim($validated['first_name']),
            'last_name' => trim($validated['last_name']),
            'email' => ! empty($validated['email']) ? strtolower(trim($validated['email'])) : null,
            'phone' => ! empty($validated['phone']) ? trim($validated['phone']) : null,
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'sex' => $validated['sex'] ?? null,
            'preferred_contact_method' => $validated['preferred_contact_method'] ?? 'email',
            'emergency_contact' => $emergencyContact,
        ];
    }

    /**
     * Present client attributes for Inertia views.
     */
    protected function present(Client $client): array
    {
        return [
            'id' => $client->id,
            'first_name' => $client->first_name,
            'last_name' => $client->last_name,
            'name' => $client->full_name,
            'email' => $client->email,
            'phone' => $client->phone,
            'date_of_birth' => $client->date_of_birth?->format('Y-m-d'),
            'sex' => $client->sex,
            'preferred_contact_method' => $client->preferred_contact_method ?? 'email',
            'emergency_contact' => $client->emergency_contact ?? null,
            'is_active' => (bool) $client->is_active,
            'appointments_count' => (int) ($client->appointments_count ?? 0),
            'created_at' => $client->created_at?->format('M j, Y'),
        ];
    }

    /**
     * Record an audit event for client mutations.
     */
    protected function audit(Request $request, string $action, Client $client): void
    {
        AuditEvent::create([
            'tenant_id' => TenantScope::getTenantId(),
            'user_id' => $request->user()?->id,
            'action' => $action,
            'resource_type' => Client::class,
            'resource_id' => $client->id,
            'ip_address' => $request->ip(),
        ]);
    }
}
