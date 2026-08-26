<?php

namespace App\Notifications;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class ClinicApplicationRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

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
            ->subject("Your {$this->tenant->name} application was not approved")
            ->greeting('Hi there,')
            ->line("We're unable to approve **{$this->tenant->name}** at this time.")
            ->line('Reason: '.($this->tenant->review_note ?: 'Not specified.'))
            ->line('If you believe this is a mistake or can address the issue above, reply to this email and we can take another look.');
    }
}
