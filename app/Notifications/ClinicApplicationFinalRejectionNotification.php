<?php

namespace App\Notifications;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ClinicApplicationFinalRejectionNotification extends Notification
{
    use Queueable;

    public function __construct(protected Tenant $tenant)
    {
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
        $maxAttempts = $this->tenant->maxReapplyAttempts();

        return (new MailMessage)
            ->from(config('mail.from.address'), config('mail.from.name') ?: 'UMAHZ Platform')
            ->subject("Your application for {$this->tenant->name} has been closed")
            ->greeting("Hello {$notifiable->name},")
            ->line("We are writing to let you know that after {$maxAttempts} review attempts, we are unable to approve the clinic application for **{$this->tenant->name}**.")
            ->line('**Final decision note:**')
            ->line($this->tenant->review_note ?: 'The application did not meet our verification criteria.')
            ->line('As the maximum number of application attempts has been reached, this application has now been closed and further submissions from this email cannot be accepted at this time.')
            ->line('No charges have been made to your payment method.')
            ->line('If you believe this decision was made in error or have documentation to provide, please contact our support team at support@umahz.com.');
    }
}
