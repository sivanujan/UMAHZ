<?php

namespace App\Notifications;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ClinicApplicationReceivedNotification extends Notification
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
            ->subject("We've received your application for {$this->tenant->name}")
            ->greeting('Hi there,')
            ->line("Thanks for applying to join UMAHZ. We've received your application for **{$this->tenant->name}** and it's now in front of our review team.")
            ->line('A team member checks license and registration details before any new clinic goes live — this usually takes 1–2 business days.')
            ->line("We'll email you as soon as a decision is made. No action is needed from you right now.");
    }
}
