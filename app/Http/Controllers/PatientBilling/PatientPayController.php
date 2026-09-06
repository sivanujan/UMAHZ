<?php

namespace App\Http\Controllers\PatientBilling;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use App\Notifications\PatientPayOtpNotification;
use App\PatientBilling\PaymentService;
use App\Rules\NotDisposableEmail;
use App\Support\PatientPayOtp;
use App\Support\Tenancy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

/**
 * Public, branded patient pay portal on clinic subdomains ({clinic}.umahz.com/pay).
 *
 * Patients verify their email via a 6-digit one-time code (OTP), then view and pay
 * their open invoices via Stripe Connect (direct charge, 0 platform fee).
 */
class PatientPayController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    /**
     * Show the public branded pay page.
     */
    public function show(Request $request): Response
    {
        $tenant = $this->resolveTenant($request);
        $token = $this->extractToken($request, $tenant->id);
        $verifiedEmail = PatientPayOtp::validateSessionToken($tenant->id, $token);

        $invoices = [];
        if ($verifiedEmail) {
            $invoices = $this->getInvoicesForEmail($tenant->id, $verifiedEmail);
        }

        return Inertia::render('PatientBilling/PublicPay', [
            'clinic' => [
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'logo_url' => $tenant->logo_url,
                'brand_color' => $tenant->brand_color,
                'email' => $tenant->email ?: $tenant->primary_contact_email,
                'phone' => $tenant->phone ?: $tenant->primary_contact_phone,
                'address' => $tenant->address,
                'currency' => strtoupper($tenant->currency ?: 'CAD'),
                'can_accept_cards' => $tenant->canAcceptCardPayments(),
            ],
            'verifiedEmail' => $verifiedEmail,
            'sessionToken' => $verifiedEmail ? $token : null,
            'invoices' => $invoices,
            'publishableKey' => config('cashier.key'),
        ]);
    }

    /**
     * Send a 6-digit OTP verification code to the requested email.
     * Prevents email enumeration by returning identical success responses.
     */
    public function sendOtp(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);

        $data = $request->validate([
            'email' => ['required', 'string', 'email', new NotDisposableEmail()],
        ]);

        $email = PatientPayOtp::normalize($data['email']);
        $wait = PatientPayOtp::remainingCooldown($tenant->id, $email);

        if ($wait > 0) {
            return response()->json([
                'sent' => false,
                'reason' => "Please wait {$wait}s before requesting another code.",
                'cooldown' => $wait,
            ], 429);
        }

        $hasClient = Client::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('email', $email)
            ->exists();

        if ($hasClient) {
            $code = PatientPayOtp::generate($tenant->id, $email);
            Notification::route('mail', $email)->notify(
                new PatientPayOtpNotification($code, $tenant->name)
            );
        }

        return response()->json([
            'sent' => true,
            'cooldown' => PatientPayOtp::RESEND_COOLDOWN,
            'message' => "If an invoice exists for that email, a verification code has been sent.",
        ]);
    }

    /**
     * Verify a submitted 6-digit OTP code and establish a verified session.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);

        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'code' => ['required', 'string'],
        ]);

        $email = PatientPayOtp::normalize($data['email']);
        $result = PatientPayOtp::verify($tenant->id, $email, $data['code']);

        if ($result['status'] !== 'ok') {
            return response()->json([
                'verified' => false,
                'reason' => match ($result['status']) {
                    'expired' => 'That code has expired. Please request a new one.',
                    'locked' => 'Too many failed attempts. Please request a new code.',
                    default => 'That code is incorrect.',
                },
            ], 422);
        }

        $token = $result['token'];
        $request->session()->put('patient_pay_token_'.$tenant->id, $token);

        $invoices = $this->getInvoicesForEmail($tenant->id, $email);

        return response()->json([
            'verified' => true,
            'token' => $token,
            'email' => $email,
            'invoices' => $invoices,
        ]);
    }

    /**
     * Start a Stripe card payment for an invoice on behalf of a verified patient.
     */
    public function startPayment(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);
        $token = $this->extractToken($request, $tenant->id);
        $verifiedEmail = PatientPayOtp::validateSessionToken($tenant->id, $token);

        if (! $verifiedEmail) {
            return response()->json(['message' => 'Your session has expired. Please verify your email again.'], 401);
        }

        $invoiceId = (string) $request->route('invoice');

        // Verify that the invoice strictly belongs to this clinic AND this verified patient.
        $invoiceModel = Invoice::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereKey($invoiceId)
            ->with('client')
            ->first();

        if (
            ! $invoiceModel ||
            ! $invoiceModel->client ||
            PatientPayOtp::normalize((string) $invoiceModel->client->email) !== $verifiedEmail
        ) {
            abort(404);
        }

        if (! $tenant->canAcceptCardPayments()) {
            return response()->json(['message' => 'Online card payments are currently unavailable for this clinic.'], 422);
        }

        if (! $invoiceModel->isPayable()) {
            return response()->json(['message' => 'This invoice is already paid or not open for payment.'], 422);
        }

        try {
            $result = $this->payments->startCardPayment($invoiceModel);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => null,
            'action' => 'patient_billing.patient_pay.card_initiated',
            'resource_type' => Payment::class,
            'resource_id' => $result['payment']->id,
            'metadata' => [
                'invoice_id' => $invoiceModel->id,
                'amount' => $result['payment']->amount,
                'email' => $verifiedEmail,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'client_secret' => $result['client_secret'],
            'payment_intent_id' => $result['payment_intent_id'],
            'connected_account_id' => $result['payment']->stripe_connect_account_id,
            'publishable_key' => config('cashier.key'),
        ]);
    }

    /**
     * View a printable patient receipt for a paid invoice.
     */
    public function receipt(Request $request): Response|RedirectResponse
    {
        $tenant = $this->resolveTenant($request);
        $token = $this->extractToken($request, $tenant->id);
        $verifiedEmail = PatientPayOtp::validateSessionToken($tenant->id, $token);

        if (! $verifiedEmail) {
            return redirect()->to(Tenancy::urlFor($tenant->subdomain, '/pay'));
        }

        $invoiceId = (string) $request->route('invoice');

        $invoiceModel = Invoice::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereKey($invoiceId)
            ->with(['client', 'lineItems', 'payments' => fn ($q) => $q->where('status', 'succeeded')->latest('processed_at')])
            ->first();

        if (
            ! $invoiceModel ||
            ! $invoiceModel->client ||
            PatientPayOtp::normalize((string) $invoiceModel->client->email) !== $verifiedEmail
        ) {
            abort(404);
        }

        return Inertia::render('PatientBilling/Receipt', [
            'invoice' => [
                'id' => $invoiceModel->id,
                'reference' => $invoiceModel->reference(),
                'invoice_number' => $invoiceModel->invoice_number,
                'status' => $invoiceModel->status,
                'currency' => strtoupper($invoiceModel->currency),
                'subtotal_amount' => $invoiceModel->subtotal_amount,
                'tax_amount' => $invoiceModel->tax_amount,
                'discount_amount' => $invoiceModel->discount_amount,
                'total_amount' => $invoiceModel->total_amount,
                'amount_paid' => $invoiceModel->amount_paid,
                'amount_due' => $invoiceModel->amountDue(),
                'notes' => $invoiceModel->notes,
                'due_date' => $invoiceModel->due_date?->toDateString(),
                'issued_at' => $invoiceModel->issued_at?->toIso8601String(),
                'paid_at' => $invoiceModel->paid_at?->toIso8601String(),
                'voided_at' => $invoiceModel->voided_at?->toIso8601String(),
                'client' => [
                    'id' => $invoiceModel->client->id,
                    'name' => $invoiceModel->client->full_name,
                    'email' => $invoiceModel->client->email,
                ],
                'line_items' => $invoiceModel->lineItems->map(fn ($li) => [
                    'id' => $li->id,
                    'description' => $li->description,
                    'quantity' => $li->quantity,
                    'unit_amount' => $li->unit_amount,
                    'tax_amount' => $li->tax_amount,
                    'total_amount' => $li->total_amount,
                ])->all(),
                'payments' => $invoiceModel->payments->map(fn ($p) => [
                    'id' => $p->id,
                    'method' => $p->method,
                    'status' => $p->status,
                    'amount' => $p->amount,
                    'processed_at' => $p->processed_at?->toIso8601String(),
                ])->all(),
            ],
            'clinic' => [
                'name' => $tenant->name,
                'email' => $tenant->email ?: $tenant->primary_contact_email,
                'phone' => $tenant->phone ?: $tenant->primary_contact_phone,
            ],
        ]);
    }

    /**
     * Clear the verified session.
     */
    public function logout(Request $request): RedirectResponse
    {
        $tenant = $this->resolveTenant($request);
        $token = $this->extractToken($request, $tenant->id);

        if ($token) {
            PatientPayOtp::clear($tenant->id, '', $token);
            $request->session()->forget('patient_pay_token_'.$tenant->id);
        }

        return redirect()->to(Tenancy::urlFor($tenant->subdomain, '/pay'));
    }

    /**
     * Fetch and present all invoices for a verified client email at this clinic.
     *
     * @return array<int, array<string, mixed>>
     */
    private function getInvoicesForEmail(string $tenantId, string $email): array
    {
        $clientIds = Client::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('email', $email)
            ->pluck('id');

        if ($clientIds->isEmpty()) {
            return [];
        }

        return Invoice::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereIn('client_id', $clientIds)
            ->whereIn('status', [Invoice::STATUS_OPEN, Invoice::STATUS_PAID])
            ->with(['lineItems', 'payments' => fn ($q) => $q->latest('created_at')])
            ->orderByRaw("CASE WHEN status = 'open' THEN 1 ELSE 2 END")
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Invoice $invoice) => [
                'id' => $invoice->id,
                'reference' => $invoice->reference(),
                'status' => $invoice->status,
                'currency' => strtoupper($invoice->currency),
                'subtotal_amount' => $invoice->subtotal_amount,
                'tax_amount' => $invoice->tax_amount,
                'discount_amount' => $invoice->discount_amount,
                'total_amount' => $invoice->total_amount,
                'amount_paid' => $invoice->amount_paid,
                'amount_due' => $invoice->amountDue(),
                'is_payable' => $invoice->isPayable(),
                'notes' => $invoice->notes,
                'due_date' => $invoice->due_date?->toDateString(),
                'issued_at' => $invoice->issued_at?->toIso8601String(),
                'paid_at' => $invoice->paid_at?->toIso8601String(),
                'line_items' => $invoice->lineItems->map(fn ($li) => [
                    'id' => $li->id,
                    'description' => $li->description,
                    'quantity' => $li->quantity,
                    'unit_amount' => $li->unit_amount,
                    'tax_amount' => $li->tax_amount,
                    'total_amount' => $li->total_amount,
                ])->all(),
                'payments' => $invoice->payments->map(fn ($p) => [
                    'id' => $p->id,
                    'method' => $p->method,
                    'status' => $p->status,
                    'amount' => $p->amount,
                    'processed_at' => $p->processed_at?->toIso8601String(),
                ])->all(),
            ])
            ->all();
    }

    private function resolveTenant(Request $request): Tenant
    {
        $subdomain = Tenancy::normalize((string) $request->route('tenant'));

        return Tenant::withoutGlobalScopes()
            ->where('subdomain', $subdomain)
            ->firstOrFail();
    }

    private function extractToken(Request $request, string $tenantId): ?string
    {
        return $request->header('X-Patient-Pay-Token')
            ?? $request->input('token')
            ?? $request->session()->get('patient_pay_token_'.$tenantId);
    }
}
