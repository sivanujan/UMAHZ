<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\ClientInsurancePolicy;
use App\Models\InsuranceProvider;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ClientInsurancePolicyController extends Controller
{
    /**
     * List all insurance policies for a client.
     * Viewable by clinic_owner, receptionist, and practitioner.
     */
    public function index(Request $request, Client $client): JsonResponse
    {
        $this->authorizeAccess($request, $client, canEdit: false);

        $policies = $client->insurancePolicies()
            ->with(['provider', 'verifiedBy'])
            ->get()
            ->map(fn (ClientInsurancePolicy $p) => $this->presentPolicy($p));

        return response()->json([
            'policies' => $policies,
        ]);
    }

    /**
     * Create a new insurance policy for a client.
     * Only clinic_owner and receptionist can edit.
     */
    public function store(Request $request, Client $client): JsonResponse|RedirectResponse
    {
        $this->authorizeAccess($request, $client, canEdit: true);
        $tenantId = TenantScope::getTenantId();

        $data = $this->validatePolicy($request, $tenantId);

        $policy = DB::transaction(function () use ($tenantId, $client, $data, $request) {
            if ($data['priority'] === ClientInsurancePolicy::PRIORITY_PRIMARY) {
                // If setting a primary policy, downgrade any existing primary to secondary
                ClientInsurancePolicy::where('tenant_id', $tenantId)
                    ->where('client_id', $client->id)
                    ->where('priority', ClientInsurancePolicy::PRIORITY_PRIMARY)
                    ->update(['priority' => ClientInsurancePolicy::PRIORITY_SECONDARY]);
            }

            $policy = new ClientInsurancePolicy([
                'client_id' => $client->id,
                'insurance_provider_id' => $data['insurance_provider_id'],
                'policy_number' => $data['policy_number'],
                'group_number' => $data['group_number'] ?? $data['policy_number'],
                'member_id' => $data['member_id'],
                'certificate_id' => $data['certificate_id'] ?? $data['member_id'],
                'plan_holder_name' => $data['plan_holder_name'],
                'relationship_to_patient' => $data['relationship_to_patient'],
                'plan_holder_dob' => $data['plan_holder_dob'] ?? null,
                'coverage_start_date' => $data['coverage_start_date'] ?? null,
                'coverage_end_date' => $data['coverage_end_date'] ?? null,
                'priority' => $data['priority'],
                'notes' => $data['notes'] ?? null,
            ]);
            $policy->tenant_id = $tenantId;
            $policy->save();

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()->id,
                'action' => 'insurance.policy.created',
                'resource_type' => ClientInsurancePolicy::class,
                'resource_id' => $policy->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'client_id' => $client->id,
                    'provider_id' => $policy->insurance_provider_id,
                    'priority' => $policy->priority,
                    'masked_policy_number' => $policy->maskedPolicyNumber(),
                    'masked_member_id' => $policy->maskedMemberId(),
                    'relationship' => $policy->relationship_to_patient,
                ],
            ]);

            return $policy;
        });

        if ($request->wantsJson()) {
            return response()->json([
                'policy' => $this->presentPolicy($policy->load(['provider', 'verifiedBy'])),
                'message' => 'Insurance policy added successfully.',
            ], 201);
        }

        return back()->with('success', 'Insurance policy added successfully.');
    }

    /**
     * Update an existing insurance policy.
     * Only clinic_owner and receptionist can edit.
     */
    public function update(Request $request, Client $client, ClientInsurancePolicy $policy): JsonResponse|RedirectResponse
    {
        $this->authorizeAccess($request, $client, canEdit: true);
        $this->guardTenantPolicy($client, $policy);
        $tenantId = TenantScope::getTenantId();

        $data = $this->validatePolicy($request, $tenantId);

        DB::transaction(function () use ($tenantId, $client, $policy, $data, $request) {
            if ($data['priority'] === ClientInsurancePolicy::PRIORITY_PRIMARY) {
                ClientInsurancePolicy::where('tenant_id', $tenantId)
                    ->where('client_id', $client->id)
                    ->where('id', '!=', $policy->id)
                    ->where('priority', ClientInsurancePolicy::PRIORITY_PRIMARY)
                    ->update(['priority' => ClientInsurancePolicy::PRIORITY_SECONDARY]);
            }

            $policy->update([
                'insurance_provider_id' => $data['insurance_provider_id'],
                'policy_number' => $data['policy_number'],
                'group_number' => $data['group_number'] ?? $data['policy_number'],
                'member_id' => $data['member_id'],
                'certificate_id' => $data['certificate_id'] ?? $data['member_id'],
                'plan_holder_name' => $data['plan_holder_name'],
                'relationship_to_patient' => $data['relationship_to_patient'],
                'plan_holder_dob' => $data['plan_holder_dob'] ?? null,
                'coverage_start_date' => $data['coverage_start_date'] ?? null,
                'coverage_end_date' => $data['coverage_end_date'] ?? null,
                'priority' => $data['priority'],
                'notes' => $data['notes'] ?? null,
            ]);

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()->id,
                'action' => 'insurance.policy.updated',
                'resource_type' => ClientInsurancePolicy::class,
                'resource_id' => $policy->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'client_id' => $client->id,
                    'provider_id' => $policy->insurance_provider_id,
                    'priority' => $policy->priority,
                    'masked_policy_number' => $policy->maskedPolicyNumber(),
                    'masked_member_id' => $policy->maskedMemberId(),
                ],
            ]);
        });

        if ($request->wantsJson()) {
            return response()->json([
                'policy' => $this->presentPolicy($policy->fresh(['provider', 'verifiedBy'])),
                'message' => 'Insurance policy updated successfully.',
            ]);
        }

        return back()->with('success', 'Insurance policy updated successfully.');
    }

    /**
     * Delete an insurance policy.
     * Only clinic_owner and receptionist can edit.
     */
    public function destroy(Request $request, Client $client, ClientInsurancePolicy $policy): JsonResponse|RedirectResponse
    {
        $this->authorizeAccess($request, $client, canEdit: true);
        $this->guardTenantPolicy($client, $policy);
        $tenantId = TenantScope::getTenantId();

        $maskedNumber = $policy->maskedPolicyNumber();
        $maskedMember = $policy->maskedMemberId();
        $policyId = $policy->id;

        DB::transaction(function () use ($tenantId, $client, $policy, $policyId, $maskedNumber, $maskedMember, $request) {
            $policy->delete();

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()->id,
                'action' => 'insurance.policy.deleted',
                'resource_type' => ClientInsurancePolicy::class,
                'resource_id' => $policyId,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'client_id' => $client->id,
                    'masked_policy_number' => $maskedNumber,
                    'masked_member_id' => $maskedMember,
                ],
            ]);
        });

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Insurance policy removed.',
            ]);
        }

        return back()->with('success', 'Insurance policy removed.');
    }

    /**
     * Reveal the full decrypted member ID and policy details.
     * Restricted strictly to clinic_owner and receptionist roles.
     * Writes an audit entry: insurance.policy.revealed.
     * Practitioners are rejected with 403.
     */
    public function reveal(Request $request, Client $client, ClientInsurancePolicy $policy): JsonResponse
    {
        $this->authorizeAccess($request, $client, canEdit: true);
        $this->guardTenantPolicy($client, $policy);
        $tenantId = TenantScope::getTenantId();

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'insurance.policy.revealed',
            'resource_type' => ClientInsurancePolicy::class,
            'resource_id' => $policy->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'client_id' => $client->id,
                'masked_policy_number' => $policy->maskedPolicyNumber(),
                'masked_member_id' => $policy->maskedMemberId(),
            ],
        ]);

        return response()->json([
            'policy_number' => $policy->policy_number,
            'group_number' => $policy->group_number ?? $policy->policy_number,
            'member_id' => $policy->member_id,
            'certificate_id' => $policy->certificate_id ?? $policy->member_id,
            'plan_holder_dob' => $policy->plan_holder_dob,
        ]);
    }

    /**
     * Mark an insurance policy as verified.
     */
    public function verify(Request $request, Client $client, ClientInsurancePolicy $policy): JsonResponse|RedirectResponse
    {
        $this->authorizeAccess($request, $client, canEdit: true);
        $this->guardTenantPolicy($client, $policy);
        $tenantId = TenantScope::getTenantId();

        $policy->update([
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
        ]);

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'insurance.policy.verified',
            'resource_type' => ClientInsurancePolicy::class,
            'resource_id' => $policy->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'client_id' => $client->id,
                'masked_policy_number' => $policy->maskedPolicyNumber(),
                'masked_member_id' => $policy->maskedMemberId(),
                'verified_at' => $policy->verified_at->toIso8601String(),
            ],
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'policy' => $this->presentPolicy($policy->fresh(['provider', 'verifiedBy'])),
                'message' => 'Policy marked as verified.',
            ]);
        }

        return back()->with('success', 'Policy marked as verified.');
    }

    /**
     * Validate policy input.
     */
    private function validatePolicy(Request $request, string $tenantId): array
    {
        return $request->validate([
            'insurance_provider_id' => [
                'required',
                'uuid',
                Rule::exists('insurance_providers', 'id')->where(function ($query) use ($tenantId) {
                    $query->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
                }),
            ],
            'policy_number' => ['required', 'string', 'max:100'],
            'group_number' => ['nullable', 'string', 'max:100'],
            'member_id' => ['required', 'string', 'max:100'],
            'certificate_id' => ['nullable', 'string', 'max:100'],
            'plan_holder_name' => ['required', 'string', 'max:255'],
            'relationship_to_patient' => ['required', Rule::in([
                ClientInsurancePolicy::RELATIONSHIP_SELF,
                ClientInsurancePolicy::RELATIONSHIP_SPOUSE,
                ClientInsurancePolicy::RELATIONSHIP_CHILD,
                ClientInsurancePolicy::RELATIONSHIP_PARENT,
                ClientInsurancePolicy::RELATIONSHIP_OTHER,
            ])],
            'plan_holder_dob' => ['nullable', 'date'],
            'coverage_start_date' => ['nullable', 'date'],
            'coverage_end_date' => ['nullable', 'date', 'after_or_equal:coverage_start_date'],
            'priority' => ['required', Rule::in([
                ClientInsurancePolicy::PRIORITY_PRIMARY,
                ClientInsurancePolicy::PRIORITY_SECONDARY,
            ])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    /**
     * Present a policy for UI consumption. Never exposes raw unmasked numbers in normal page props.
     * Full values are only retrievable via the dedicated /reveal endpoint by authorized roles.
     */
    public function presentPolicy(ClientInsurancePolicy $p): array
    {
        return [
            'id' => $p->id,
            'client_id' => $p->client_id,
            'insurance_provider_id' => $p->insurance_provider_id,
            'provider' => $p->provider ? [
                'id' => $p->provider->id,
                'name' => $p->provider->name,
                'code' => $p->provider->code,
                'network' => $p->provider->network,
                'province' => $p->provider->province,
                'supports_direct_billing' => $p->provider->supports_direct_billing,
            ] : null,
            'masked_policy_number' => $p->maskedPolicyNumber(),
            'masked_member_id' => $p->maskedMemberId(),
            'plan_holder_name' => $p->plan_holder_name,
            'relationship_to_patient' => $p->relationship_to_patient,
            'plan_holder_dob' => $p->plan_holder_dob,
            'coverage_start_date' => $p->coverage_start_date?->toDateString(),
            'coverage_end_date' => $p->coverage_end_date?->toDateString(),
            'priority' => $p->priority,
            'notes' => $p->notes,
            'is_verified' => $p->isVerified(),
            'is_active' => $p->isActive(),
            'verified_at' => $p->verified_at?->toIso8601String(),
            'verified_by' => $p->verifiedBy ? [
                'id' => $p->verifiedBy->id,
                'name' => $p->verifiedBy->name,
            ] : null,
            'created_at' => $p->created_at?->toIso8601String(),
        ];
    }

    /**
     * Authorize access to client insurance policies:
     * - Tenant isolation: client must belong to active tenant.
     * - Role permissions: clinic_owner and receptionist can edit. Practitioners can view.
     */
    private function authorizeAccess(Request $request, Client $client, bool $canEdit = false): void
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($client->tenant_id === $tenantId, 404);

        $membership = $request->attributes->get('staffMembership')
            ?? StaffMembership::where('user_id', $request->user()->id)
                ->where('tenant_id', $tenantId)
                ->where('status', StaffMembership::STATUS_ACTIVE)
                ->first();

        abort_unless($membership !== null, 403);

        $isEditor = in_array($membership->role, [
            StaffMembership::ROLE_CLINIC_OWNER,
            StaffMembership::ROLE_RECEPTIONIST,
        ], true);

        if ($canEdit) {
            abort_unless($isEditor, 403);
        } else {
            $canView = $isEditor || $membership->role === StaffMembership::ROLE_PRACTITIONER;
            abort_unless($canView, 403);
        }
    }

    /**
     * Guard that the policy belongs to the tenant and client.
     */
    private function guardTenantPolicy(Client $client, ClientInsurancePolicy $policy): void
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($policy->tenant_id === $tenantId && $policy->client_id === $client->id, 404);
    }
}
