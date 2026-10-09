<?php

namespace App\Notifications;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ClinicApplicationPermanentRejectionNotification extends Notification
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
        return (new MailMessage)
            ->from(config('mail.from.address'), config('mail.from.name') ?: 'UMAHZ Platform')
            ->subject("Your application for {$this->tenant->name} has been permanently declined")
            ->greeting("Hello {$notifiable->name},")
            ->line("Following an administrative review, the clinic application for **{$this->tenant->name}** has been permanently declined.")
            ->line('**Administrative reason:**')
            ->line($this->tenant->review_note ?: 'The application does not comply with UMAHZ platform policy.')
            ->line('This decision is final and further applications from this account cannot be accepted.')
            ->line('Any saved payment details have been released and no charges have occurred.')
            ->line('If you have urgent inquiries regarding this matter, please contact support@umahz.com.');
    }
}
