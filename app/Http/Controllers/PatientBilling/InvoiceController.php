<?php

namespace App\Http\Controllers\PatientBilling;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Tenant;
use App\PatientBilling\InvoiceService;
use App\Scopes\TenantScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Patient-billing invoices: create (from a client profile or appointment),
 * view, and void. Available to owner + receptionist (route group). All records
 * are tenant-scoped via the Invoice global scope, so route-model binding of
 * another clinic's invoice 404s automatically.
 */
class InvoiceController extends Controller
{
    public function __construct(private readonly InvoiceService $invoices) {}

    public function store(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);

        $data = $request->validate([
            'client_id' => ['required', 'uuid', Rule::exists('clients', 'id')->where('tenant_id', $tenant->id)],
            'appointment_id' => ['nullable', 'uuid', Rule::exists('appointments', 'id')->where('tenant_id', $tenant->id)],
            'notes' => ['nullable', 'string', 'max:2000'],
            'due_date' => ['nullable', 'date'],
            'discount_amount' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', Rule::in([Invoice::STATUS_DRAFT, Invoice::STATUS_OPEN])],
            'line_items' => ['required', 'array', 'min:1'],
            'line_items.*.product_id' => ['nullable', 'uuid', Rule::exists('products', 'id')->where('tenant_id', $tenant->id)],
            'line_items.*.description' => ['required', 'string', 'max:255'],
            'line_items.*.quantity' => ['required', 'integer', 'min:1', 'max:100000'],
            'line_items.*.unit_amount' => ['required', 'integer', 'min:0'],
            'line_items.*.tax_amount' => ['nullable', 'integer', 'min:0'],
        ]);

        $invoice = $this->invoices->create($tenant, $data, $request->user());

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'patient_billing.invoice.created',
            'resource_type' => Invoice::class,
            'resource_id' => $invoice->id,
            'metadata' => [
                'invoice_number' => $invoice->invoice_number,
                'client_id' => $invoice->client_id,
                'total_amount' => $invoice->total_amount,
                'currency' => $invoice->currency,
            ],
            'ip_address' => $request->ip(),
        ]);

        return redirect()
            ->to($tenant->appUrl('/app/invoices/'.$invoice->id))
            ->with('success', "Invoice {$invoice->reference()} created.");
    }

    public function show(Request $request, Invoice $invoice): Response
    {
        $this->guardTenant($invoice, $request);
        $invoice->load([
            'lineItems',
            'client.insurancePolicies.provider',
            'appointment.staffMembership.user',
            'appointment.staffMembership.practitionerProfile',
            'payments' => fn ($q) => $q->latest('created_at'),
            'insuranceClaims.policy.provider',
        ]);
        $tenant = $this->currentTenant($request);

        return Inertia::render('PatientBilling/InvoiceShow', [
            'invoice' => $this->presentInvoice($invoice, $tenant),
            'canAcceptCards' => $tenant->canAcceptCardPayments(),
            'stripePublishableKey' => config('cashier.key'),
        ]);
    }

    public function receipt(Request $request, Invoice $invoice): Response
    {
        $this->guardTenant($invoice, $request);
        $invoice->load([
            'lineItems',
            'client.insurancePolicies.provider',
            'appointment.staffMembership.user',
            'appointment.staffMembership.practitionerProfile',
            'payments' => fn ($q) => $q->where('status', 'succeeded')->latest('processed_at'),
            'insuranceClaims.policy.provider',
        ]);
        $tenant = $this->currentTenant($request);

        return Inertia::render('PatientBilling/Receipt', [
            'invoice' => $this->presentInvoice($invoice, $tenant),
            'clinic' => [
                'name' => $tenant->name,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
                'address_text' => $tenant->addressText(),
            ],
        ]);
    }

    public function void(Request $request, Invoice $invoice): RedirectResponse
    {
        $this->guardTenant($invoice, $request);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $this->invoices->void($invoice, $data['reason'], $request->user());

        AuditEvent::create([
            'tenant_id' => $invoice->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'patient_billing.invoice.voided',
            'resource_type' => Invoice::class,
            'resource_id' => $invoice->id,
            'reason' => $data['reason'],
            'metadata' => ['invoice_number' => $invoice->invoice_number],
            'ip_address' => $request->ip(),
        ]);

        return back()->with('success', "Invoice {$invoice->reference()} voided.");
    }

    private function presentInvoice(Invoice $invoice, ?Tenant $tenant = null): array
    {
        $tenant = $tenant ?? Tenant::find($invoice->tenant_id);

        $clientPolicies = [];
        $activePolicy = null;
        if ($invoice->relationLoaded('client') && $invoice->client && $invoice->client->relationLoaded('insurancePolicies')) {
            $clientPolicies = $invoice->client->insurancePolicies->map(fn ($p) => [
                'id' => $p->id,
                'priority' => $p->priority,
                'provider_name' => $p->provider?->name,
                'masked_member_id' => $p->maskedMemberId(),
                'masked_policy_number' => $p->maskedPolicyNumber(),
                'plan_holder_name' => $p->plan_holder_name,
                'relationship' => $p->relationship_to_patient,
                'is_verified' => $p->isVerified(),
                'is_active' => $p->isActive(),
            ])->all();

            $primary = $invoice->client->insurancePolicies->firstWhere('priority', 'primary')
                ?? $invoice->client->insurancePolicies->first();
            if ($primary) {
                $activePolicy = [
                    'id' => $primary->id,
                    'priority' => $primary->priority,
                    'provider_name' => $primary->provider?->name,
                    'masked_member_id' => $primary->maskedMemberId(),
                    'masked_policy_number' => $primary->maskedPolicyNumber(),
                    'plan_holder_name' => $primary->plan_holder_name,
                    'relationship' => $primary->relationship_to_patient,
                    'is_verified' => $primary->isVerified(),
                    'is_active' => $primary->isActive(),
                ];
            }
        }

        $formatDate = function ($date) {
            if (! $date) {
                return null;
            }
            if ($date instanceof \DateTimeInterface) {
                return $date->format('M j, Y');
            }
            try {
                return Carbon::parse($date)->format('M j, Y');
            } catch (\Throwable) {
                return (string) $date;
            }
        };

        $claims = [];
        $claim = null;
        if ($invoice->relationLoaded('insuranceClaims')) {
            $claims = $invoice->insuranceClaims->map(fn ($c) => [
                'id' => $c->id,
                'status' => $c->status,
                'claim_type' => $c->claim_type,
                'amount_claimed' => $c->amount_claimed,
                'amount_approved' => $c->amount_approved,
                'patient_balance' => $c->patient_balance,
                'external_reference' => $c->external_reference,
                'insurer_name' => $c->policy?->provider?->name,
                'masked_member_id' => $c->policy?->maskedMemberId(),
                'created_at' => $c->created_at?->toIso8601String(),
                'created_at_formatted' => $formatDate($c->created_at),
            ])->all();
            $claim = $invoice->insuranceClaims->first();
        }

        $policyForReceipt = $claim?->policy
            ?? ($invoice->relationLoaded('client') && $invoice->client && $invoice->client->relationLoaded('insurancePolicies')
                ? ($invoice->client->insurancePolicies->firstWhere('priority', 'primary') ?? $invoice->client->insurancePolicies->first())
                : null);

        $appointment = $invoice->relationLoaded('appointment') ? $invoice->appointment : null;
        $appointmentDuration = $appointment?->durationMinutes();
        $appointmentService = $appointment?->service_name;
        $serviceWithDuration = null;
        if ($appointmentService) {
            $serviceWithDuration = $appointmentDuration
                ? "{$appointmentService} - {$appointmentDuration} min"
                : $appointmentService;
        }

        $practitioner = $invoice->relationLoaded('appointment') && $invoice->appointment && $invoice->appointment->relationLoaded('staffMembership')
            ? $invoice->appointment->staffMembership?->user
            : null;

        $profile = $invoice->relationLoaded('appointment') && $invoice->appointment && $invoice->appointment->relationLoaded('staffMembership')
            ? $invoice->appointment->staffMembership?->practitionerProfile
            : null;

        $discipline = $profile?->profession;
        $profession = $tenant?->professionLabelForDiscipline($discipline) ?? $profile?->professionLabel();
        
        $rawRegNum = $profile?->registration_number ?: $profile?->license_number;
        $hasRegNum = ! empty($rawRegNum);
        $registrationNumber = $hasRegNum ? $rawRegNum : 'Not provided';

        $serviceDate = $formatDate(
            $invoice->appointment?->starts_at
                ?? $invoice->issued_at
                ?? $invoice->created_at
        );

        $receiptDate = $formatDate(
            $invoice->paid_at
                ?? $invoice->issued_at
                ?? $invoice->created_at
        );

        $receiptDetails = [
            'insurer_name' => $policyForReceipt?->provider?->name,
            'member_id_masked' => $policyForReceipt?->maskedMemberId(),
            'policy_number_masked' => $policyForReceipt?->maskedPolicyNumber(),
            'practitioner_name' => $practitioner?->name,
            'profession' => $profession,
            'registration_number' => $registrationNumber,
            'has_registration_number' => $hasRegNum,
            'service' => $serviceWithDuration ?? $appointmentService,
            'service_name' => $appointmentService,
            'duration_minutes' => $appointmentDuration,
            'service_date' => $serviceDate,
            'amount_claimed' => $claim?->amount_claimed,
            'amount_approved' => $claim?->amount_approved,
            'patient_balance' => $claim?->patient_balance,
        ];

        return [
            'id' => $invoice->id,
            'reference' => $invoice->reference(),
            'invoice_number' => $invoice->invoice_number,
            'status' => $invoice->status,
            'currency' => strtoupper($invoice->currency),
            'subtotal_amount' => $invoice->subtotal_amount,
            'tax_amount' => $invoice->tax_amount,
            'discount_amount' => $invoice->discount_amount,
            'total_amount' => $invoice->total_amount,
            'amount_paid' => $invoice->amount_paid,
            'amount_due' => $invoice->amountDue(),
            'notes' => $invoice->notes,
            'due_date' => $formatDate($invoice->due_date),
            'due_date_formatted' => $formatDate($invoice->due_date),
            'issued_at' => $invoice->issued_at?->toIso8601String(),
            'issued_at_formatted' => $formatDate($invoice->issued_at ?? $invoice->created_at),
            'paid_at' => $invoice->paid_at?->toIso8601String(),
            'paid_at_formatted' => $formatDate($invoice->paid_at),
            'receipt_date' => $receiptDate,
            'is_payable' => $invoice->isPayable(),
            'active_policy' => $activePolicy,
            'client_policies' => $clientPolicies,
            'insurance_claims' => $claims,
            'receipt_details' => $receiptDetails,
            'appointment' => $appointment ? [
                'id' => $appointment->id,
                'service_name' => $appointmentService,
                'duration_minutes' => $appointmentDuration,
                'service_with_duration' => $serviceWithDuration,
            ] : null,
            'client' => $invoice->relationLoaded('client') && $invoice->client ? [
                'id' => $invoice->client->id,
                'name' => $invoice->client->full_name,
                'email' => $invoice->client->email,
            ] : null,
            'line_items' => $invoice->relationLoaded('lineItems') ? $invoice->lineItems->map(function ($li) use ($invoice, $appointment, $appointmentDuration, $serviceWithDuration) {
                $desc = $li->description;
                if ($appointment && $appointmentDuration && ! str_contains(strtolower($desc), 'min')) {
                    if ($desc === $appointment->service_name || $desc === 'Treatment' || count($invoice->lineItems) === 1) {
                        $desc = $serviceWithDuration ?? "{$desc} - {$appointmentDuration} min";
                    }
                }

                return [
                    'id' => $li->id,
                    'product_id' => $li->product_id,
                    'product_name' => $li->product_name_snapshot,
                    'product_tax_rate' => $li->product_tax_rate_snapshot,
                    'is_product' => $li->isProduct(),
                    'description' => $desc,
                    'quantity' => $li->quantity,
                    'unit_amount' => $li->unit_amount,
                    'tax_amount' => $li->tax_amount,
                    'total_amount' => $li->total_amount,
                ];
            })->all() : [],
            'payments' => $invoice->relationLoaded('payments') ? $invoice->payments->map(fn ($p) => [
                'id' => $p->id,
                'method' => $p->method,
                'status' => $p->status,
                'amount' => $p->amount,
                'processed_at' => $p->processed_at?->toIso8601String(),
                'processed_at_formatted' => $formatDate($p->processed_at ?? $p->created_at),
                'notes' => $p->notes,
            ])->all() : [],
        ];
    }

    protected function currentTenant(Request $request): Tenant
    {
        $membership = $request->attributes->get('staffMembership');

        return $membership?->tenant ?? Tenant::findOrFail(TenantScope::getTenantId());
    }

    /**
     * Defence in depth: route-model binding can resolve before the tenant
     * context is set, so verify the invoice belongs to the current tenant and
     * 404 otherwise. A clinic must never reach another clinic's invoice.
     */
    protected function guardTenant(Invoice $invoice, Request $request): void
    {
        abort_unless($invoice->tenant_id === $this->currentTenant($request)->id, 404);
    }
}
