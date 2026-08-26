<?php

namespace App\Notifications;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class ClinicApplicationNeedsInfoNotification extends Notification implements ShouldQueue
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
            ->subject("Action needed on your {$this->tenant->name} application")
            ->greeting('Hi there,')
            ->line("We need a bit more information before we can approve **{$this->tenant->name}**:")
            ->line($this->tenant->review_note ?: 'Please review and update your application.')
            ->action('Update your application', url('/clinic/status'))
            ->line("You don't need to sign up again — just update the details above and resubmit.");
    }
}
