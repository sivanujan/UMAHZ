<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\ClientInsurancePolicy;
use App\Models\InsuranceClaim;
use App\Models\InsuranceClaimEvent;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InsuranceClaimController extends Controller
{
    /**
     * Record a manual insurance portion / claim against an invoice.
     * Only clinic_owner and receptionist can record claims.
     */
    public function recordManual(Request $request, Invoice $invoice): JsonResponse|RedirectResponse
    {
        $this->guardTenantAndRole($request, $invoice, canEdit: true);

        if (! $invoice->isPayable()) {
            throw ValidationException::withMessages([
                'amount_approved' => 'Insurance portion cannot be recorded on a settled, draft, or void invoice.',
            ]);
        }

        $tenantId = TenantScope::getTenantId();
        $amountDue = $invoice->amountDue();

        $data = $request->validate([
            'client_insurance_policy_id' => [
                'required',
                'uuid',
                Rule::exists('client_insurance_policies', 'id')->where(function ($query) use ($tenantId, $invoice) {
                    $query->where('tenant_id', $tenantId)
                        ->where('client_id', $invoice->client_id);
                }),
            ],
            // Accept amount in minor units (cents)
            'amount_approved' => [
                'required',
                'integer',
                'min:1',
                'max:' . max(1, $amountDue),
            ],
            'external_reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', Rule::in([InsuranceClaim::STATUS_APPROVED, InsuranceClaim::STATUS_PAID])],
        ]);

        $policy = ClientInsurancePolicy::where('tenant_id', $tenantId)->findOrFail($data['client_insurance_policy_id']);
        $amountApproved = (int) $data['amount_approved'];
        $claimStatus = $data['status'] ?? InsuranceClaim::STATUS_APPROVED;

        $claim = DB::transaction(function () use ($invoice, $policy, $amountApproved, $claimStatus, $data, $tenantId, $request) {
            $lockedInvoice = Invoice::whereKey($invoice->getKey())->lockForUpdate()->firstOrFail();
            $patientBalance = max(0, $lockedInvoice->amountDue() - $amountApproved);

            // 1. Create Insurance Claim
            $claim = new InsuranceClaim([
                'client_id' => $lockedInvoice->client_id,
                'appointment_id' => $lockedInvoice->appointment_id,
                'invoice_id' => $lockedInvoice->id,
                'client_insurance_policy_id' => $policy->id,
                'claim_type' => InsuranceClaim::TYPE_MANUAL,
                'status' => $claimStatus,
                'amount_claimed' => $amountApproved,
                'amount_approved' => $amountApproved,
                'patient_balance' => $patientBalance,
                'external_reference' => $data['external_reference'] ?? null,
                'submitted_at' => now(),
                'responded_at' => now(),
                'created_by' => $request->user()->id,
            ]);
            $claim->tenant_id = $tenantId;
            $claim->save();

            // 2. Status event history
            InsuranceClaimEvent::create([
                'claim_id' => $claim->id,
                'status' => $claim->status,
                'note' => $claimStatus === InsuranceClaim::STATUS_PAID
                    ? 'Manual insurance claim portion recorded and paid: ' . ($data['notes'] ?? 'Paid by insurer')
                    : 'Manual insurance claim portion recorded: ' . ($data['notes'] ?? 'Approved by insurer, awaiting payment'),
                'user_id' => $request->user()->id,
                'created_at' => now(),
            ]);

            // 3. Only record payment and reduce balance if claim is marked 'paid'
            if ($claimStatus === InsuranceClaim::STATUS_PAID) {
                $payment = new Payment([
                    'invoice_id' => $lockedInvoice->id,
                    'method' => Payment::METHOD_INSURANCE,
                    'status' => Payment::STATUS_SUCCEEDED,
                    'amount' => $amountApproved,
                    'currency' => $lockedInvoice->currency,
                    'application_fee_amount' => 0,
                    'notes' => 'Insurance portion: ' . ($policy->provider?->name ?? 'Insurer') . ' (' . $policy->maskedMemberId() . ')' . (! empty($data['external_reference']) ? " Ref: {$data['external_reference']}" : ''),
                    'recorded_by' => $request->user()->id,
                    'processed_at' => now(),
                ]);
                $payment->tenant_id = $tenantId;
                $payment->save();

                // 4. Update invoice paid amount and status
                $lockedInvoice->amount_paid = (int) $lockedInvoice->amount_paid + $amountApproved;
                if ($lockedInvoice->amount_paid >= (int) $lockedInvoice->total_amount && ! $lockedInvoice->isVoid()) {
                    $lockedInvoice->status = Invoice::STATUS_PAID;
                    $lockedInvoice->paid_at = now();
                }
                $lockedInvoice->save();
            }

            // 5. Audit Log (Never log full policy or member numbers!)
            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()->id,
                'action' => 'insurance.claim.created',
                'resource_type' => InsuranceClaim::class,
                'resource_id' => $claim->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'invoice_id' => $lockedInvoice->id,
                    'policy_id' => $policy->id,
                    'amount_approved' => $amountApproved,
                    'patient_balance' => $patientBalance,
                    'claim_status' => $claim->status,
                    'masked_member_id' => $policy->maskedMemberId(),
                    'masked_policy_number' => $policy->maskedPolicyNumber(),
                ],
            ]);

            return $claim;
        });

        if ($request->wantsJson()) {
            return response()->json([
                'claim' => $claim->load(['policy.provider', 'events']),
                'patient_balance' => $claim->patient_balance,
                'invoice_amount_due' => $invoice->fresh()->amountDue(),
                'message' => 'Insurance portion recorded successfully.',
            ], 201);
        }

        return back()->with('success', 'Insurance portion recorded successfully.');
    }

    /**
     * Mark an approved insurance claim as paid upon receiving payment from the insurer.
     * Creates a Payment with method 'insurance', updates invoice paid amount and status,
     * logs an insurance_claim_events status history entry, and records an audit event.
     */
    public function markPaymentReceived(Request $request, Invoice $invoice, InsuranceClaim $claim): JsonResponse|RedirectResponse
    {
        $this->guardTenantAndRole($request, $invoice, canEdit: true);
        $tenantId = TenantScope::getTenantId();

        abort_unless($claim->tenant_id === $tenantId && $claim->invoice_id === $invoice->id, 404);

        if ($claim->status === InsuranceClaim::STATUS_PAID) {
            throw ValidationException::withMessages([
                'claim' => 'This insurance claim has already been marked as paid.',
            ]);
        }

        if ($claim->status !== InsuranceClaim::STATUS_APPROVED && $claim->status !== InsuranceClaim::STATUS_PARTIALLY_APPROVED) {
            throw ValidationException::withMessages([
                'claim' => 'Only approved or partially approved insurance claims can be marked as paid.',
            ]);
        }

        $paymentAmount = (int) $claim->amount_approved;
        if ($paymentAmount <= 0) {
            throw ValidationException::withMessages([
                'claim' => 'The claim has an approved amount of zero and cannot record a payment.',
            ]);
        }

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
            'external_reference' => ['nullable', 'string', 'max:100'],
        ]);

        DB::transaction(function () use ($invoice, $claim, $paymentAmount, $data, $tenantId, $request) {
            $lockedInvoice = Invoice::whereKey($invoice->getKey())->lockForUpdate()->firstOrFail();
            $policy = $claim->policy;

            // 1. Update claim status to paid
            $claim->status = InsuranceClaim::STATUS_PAID;
            $claim->responded_at = $claim->responded_at ?? now();
            if (! empty($data['external_reference'])) {
                $claim->external_reference = $data['external_reference'];
            }
            $claim->save();

            // 2. Add claim event
            InsuranceClaimEvent::create([
                'claim_id' => $claim->id,
                'status' => InsuranceClaim::STATUS_PAID,
                'note' => 'Insurance payment received: ' . ($data['notes'] ?? 'Payment received from insurer.'),
                'user_id' => $request->user()->id,
                'created_at' => now(),
            ]);

            // 3. Record Payment against the invoice
            $payment = new Payment([
                'invoice_id' => $lockedInvoice->id,
                'method' => Payment::METHOD_INSURANCE,
                'status' => Payment::STATUS_SUCCEEDED,
                'amount' => $paymentAmount,
                'currency' => $lockedInvoice->currency,
                'application_fee_amount' => 0,
                'notes' => 'Insurance payment received: ' . ($policy?->provider?->name ?? 'Insurer') . ' (' . ($policy ? $policy->maskedMemberId() : '—') . ')' . (! empty($claim->external_reference) ? " Ref: {$claim->external_reference}" : ''),
                'recorded_by' => $request->user()->id,
                'processed_at' => now(),
            ]);
            $payment->tenant_id = $tenantId;
            $payment->save();

            // 4. Update invoice paid amount and status
            $wasPaidBefore = $lockedInvoice->isPaid();
            $lockedInvoice->amount_paid = (int) $lockedInvoice->amount_paid + $paymentAmount;
            if ($lockedInvoice->amount_paid >= (int) $lockedInvoice->total_amount && ! $lockedInvoice->isVoid()) {
                $lockedInvoice->status = Invoice::STATUS_PAID;
                $lockedInvoice->paid_at = now();
            }
            $lockedInvoice->save();

            if (! $wasPaidBefore && $lockedInvoice->isPaid()) {
                app(\App\Services\InventoryService::class)->deductForInvoice($lockedInvoice, $request->user());
            }

            // 5. Audit Log (Never log full policy or member numbers!)
            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()->id,
                'action' => 'insurance.claim.payment_received',
                'resource_type' => InsuranceClaim::class,
                'resource_id' => $claim->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'invoice_id' => $lockedInvoice->id,
                    'claim_id' => $claim->id,
                    'amount' => $paymentAmount,
                    'masked_member_id' => $policy ? $policy->maskedMemberId() : null,
                ],
            ]);
        });

        if ($request->wantsJson()) {
            return response()->json([
                'claim' => $claim->fresh(['policy.provider', 'events']),
                'invoice_amount_due' => $invoice->fresh()->amountDue(),
                'message' => 'Insurance payment marked as received.',
            ]);
        }

        return back()->with('success', 'Insurance payment marked as received.');
    }

    /**
     * Guard tenant isolation and role permissions.
     */
    private function guardTenantAndRole(Request $request, Invoice $invoice, bool $canEdit = false): void
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($invoice->tenant_id === $tenantId, 404);

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
}
