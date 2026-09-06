<?php

namespace App\Notifications;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use App\Support\Tenancy;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PatientPaymentReceiptNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Invoice $invoice,
        public Payment $payment,
        public ?Tenant $tenant = null
    ) {
        $this->tenant = $tenant ?? $invoice->tenant;
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->invoice->loadMissing(['client', 'lineItems']);
        $tenant = $this->tenant ?? $this->invoice->tenant;
        $clinicName = $tenant?->name ?? 'Clinic';
        $clientName = $this->invoice->client?->full_name ?: 'Valued Patient';
        $receiptUrl = Tenancy::urlFor((string) $tenant?->subdomain, "/pay/invoices/{$this->invoice->id}/receipt");

        $currency = strtoupper($this->payment->currency ?: ($this->invoice->currency ?: 'CAD'));
        $amountFormatted = $currency . ' $' . number_format($this->payment->amount / 100, 2);
        $balanceFormatted = $currency . ' $' . number_format($this->invoice->amountDue() / 100, 2);

        $dateFormatted = ($this->payment->processed_at ?? now())->format('F j, Y g:i A');
        $methodName = $this->payment->method === Payment::METHOD_CARD ? 'Credit / Debit Card' : ucfirst($this->payment->method);

        $fromAddress = config('mail.from.address', 'billing@umahz.com');
        $replyToEmail = $tenant?->email ?: ($tenant?->primary_contact_email ?: null);

        $mail = (new MailMessage)
            ->from($fromAddress, $clinicName)
            ->subject("Payment Receipt: {$this->invoice->reference()} from {$clinicName}")
            ->greeting("Thank you for your payment, {$clientName}!")
            ->line("We have successfully received your payment of **{$amountFormatted}** for invoice **{$this->invoice->reference()}** at **{$clinicName}**.")
            ->line("**Payment Details:**")
            ->line("• **Invoice Reference:** {$this->invoice->reference()}")
            ->line("• **Amount Paid:** {$amountFormatted}")
            ->line("• **Payment Method:** {$methodName}")
            ->line("• **Date & Time:** {$dateFormatted}")
            ->line("• **Remaining Balance:** {$balanceFormatted}")
            ->action('View & Print Official Receipt', $receiptUrl)
            ->line("If you have any questions about this payment or your care, please contact {$clinicName} directly" . ($tenant?->phone ? " at {$tenant->phone}" : "") . ($replyToEmail ? " or reply to {$replyToEmail}" : "") . ".")
            ->salutation("Best regards,\n{$clinicName} Billing Team");

        if (! empty($replyToEmail)) {
            $mail->replyTo($replyToEmail, $clinicName);
        }

        return $mail;
    }
}
