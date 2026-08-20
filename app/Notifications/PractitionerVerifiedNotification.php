<?php

namespace App\Notifications;

use App\Models\PractitionerProfile;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PractitionerVerifiedNotification extends Notification
{
    use Queueable;

    public function __construct(protected PractitionerProfile $practitionerProfile)
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
        $this->practitionerProfile->loadMissing('staffMembership.tenant');
        $tenantName = $this->practitionerProfile->staffMembership->tenant->name;

        return (new MailMessage)
            ->subject('Your license is verified')
            ->greeting('Hi there,')
            ->line("Your license details have been verified. You're fully set up at **{$tenantName}** on UMAHZ.")
            ->action('Go to your dashboard', url('/app/dashboard'));
    }
}
