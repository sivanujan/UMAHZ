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

class PatientPaymentFailedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Invoice $invoice,
        public ?Payment $payment = null,
        public ?Tenant $tenant = null,
        public ?string $errorMessage = null
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
        $this->invoice->loadMissing(['client']);
        $tenant = $this->tenant ?? $this->invoice->tenant;
        $clinicName = $tenant?->name ?? 'Clinic';
        $clientName = $this->invoice->client?->full_name ?: 'Valued Patient';
        $payUrl = Tenancy::urlFor((string) $tenant?->subdomain, '/pay');

        $currency = strtoupper($this->invoice->currency ?: 'CAD');
        $amountFormatted = $currency . ' $' . number_format($this->invoice->amountDue() / 100, 2);

        $reason = $this->errorMessage ?: 'The transaction was declined by your card issuer.';
        $fromAddress = config('mail.from.address', 'billing@umahz.com');
        $replyToEmail = $tenant?->email ?: ($tenant?->primary_contact_email ?: null);

        $mail = (new MailMessage)
            ->from($fromAddress, $clinicName)
            ->subject("Payment Unsuccessful: Invoice {$this->invoice->reference()} at {$clinicName}")
            ->greeting("Hello {$clientName},")
            ->line("An attempted card payment for **{$amountFormatted}** on invoice **{$this->invoice->reference()}** at **{$clinicName}** could not be completed.")
            ->line("**Failure Details:**")
            ->line("• **Reason:** {$reason}")
            ->line("• **Invoice Reference:** {$this->invoice->reference()}")
            ->line("• **Outstanding Amount:** {$amountFormatted}")
            ->line("No funds have been charged to your card. You can securely retry with the same card or use a different payment method.")
            ->action('Retry Payment Online', $payUrl)
            ->line("If you continue experiencing issues, please contact your card provider or reach out to {$clinicName}" . ($tenant?->phone ? " at {$tenant->phone}" : "") . ".")
            ->salutation("Best regards,\n{$clinicName} Billing Team");

        if (! empty($replyToEmail)) {
            $mail->replyTo($replyToEmail, $clinicName);
        }

        return $mail;
    }
}
