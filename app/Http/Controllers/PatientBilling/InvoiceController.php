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
        $invoice->load(['lineItems', 'client', 'appointment', 'payments' => fn ($q) => $q->latest('created_at')]);
        $tenant = $this->currentTenant($request);

        return Inertia::render('PatientBilling/InvoiceShow', [
            'invoice' => $this->presentInvoice($invoice),
            'canAcceptCards' => $tenant->canAcceptCardPayments(),
            'stripePublishableKey' => config('cashier.key'),
        ]);
    }

    public function receipt(Request $request, Invoice $invoice): Response
    {
        $this->guardTenant($invoice, $request);
        $invoice->load(['lineItems', 'client', 'payments' => fn ($q) => $q->where('status', 'succeeded')->latest('processed_at')]);
        $tenant = $this->currentTenant($request);

        return Inertia::render('PatientBilling/Receipt', [
            'invoice' => $this->presentInvoice($invoice),
            'clinic' => [
                'name' => $tenant->name,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
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

    private function presentInvoice(Invoice $invoice): array
    {
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
            'due_date' => $invoice->due_date?->toDateString(),
            'issued_at' => $invoice->issued_at?->toIso8601String(),
            'paid_at' => $invoice->paid_at?->toIso8601String(),
            'voided_at' => $invoice->voided_at?->toIso8601String(),
            'void_reason' => $invoice->void_reason,
            'is_payable' => $invoice->isPayable(),
            'client' => $invoice->relationLoaded('client') && $invoice->client ? [
                'id' => $invoice->client->id,
                'name' => $invoice->client->full_name,
                'email' => $invoice->client->email,
            ] : null,
            'line_items' => $invoice->relationLoaded('lineItems') ? $invoice->lineItems->map(fn ($li) => [
                'id' => $li->id,
                'description' => $li->description,
                'quantity' => $li->quantity,
                'unit_amount' => $li->unit_amount,
                'tax_amount' => $li->tax_amount,
                'total_amount' => $li->total_amount,
            ])->all() : [],
            'payments' => $invoice->relationLoaded('payments') ? $invoice->payments->map(fn ($p) => [
                'id' => $p->id,
                'method' => $p->method,
                'status' => $p->status,
                'amount' => $p->amount,
                'processed_at' => $p->processed_at?->toIso8601String(),
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
