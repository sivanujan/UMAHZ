<?php

namespace App\Notifications;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class ClinicApplicationApprovedNotification extends Notification implements ShouldQueue
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
            ->subject("{$this->tenant->name} is approved — you're live on UMAHZ")
            ->greeting('Good news,')
            ->line("**{$this->tenant->name}** has been approved. Your workspace is active and ready to use.")
            ->action('Go to your dashboard', $this->tenant->appUrl('/app/dashboard'))
            ->line("Next step: finish the short setup wizard (business hours, branding) — you'll land there automatically when you sign in.");
    }
}
