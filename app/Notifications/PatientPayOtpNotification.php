<?php

namespace App\Notifications;

use App\Support\PatientPayOtp;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Branded OTP notification sent to a patient attempting to view and pay their
 * invoices on a clinic's branded subdomain.
 */
class PatientPayOtpNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected string $code,
        protected string $clinicName
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $minutes = (int) (PatientPayOtp::TTL / 60);

        return (new MailMessage)
            ->subject("Your {$this->clinicName} invoice verification code: {$this->code}")
            ->greeting("Access your {$this->clinicName} invoices")
            ->line("Use the verification code below to view and pay your invoices at {$this->clinicName}:")
            ->line("**{$this->code}**")
            ->line("This one-time code expires in {$minutes} minutes and can only be used once.")
            ->line("If you did not request this code, you can safely ignore this email.")
            ->salutation("— {$this->clinicName} Billing");
    }
}
