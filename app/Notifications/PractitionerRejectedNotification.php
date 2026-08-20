<?php

namespace App\Notifications;

use App\Models\PractitionerProfile;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PractitionerRejectedNotification extends Notification
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
            ->subject('We could not verify your license')
            ->greeting('Hi there,')
            ->line("We couldn't verify your license details for **{$tenantName}** on UMAHZ.")
            ->line('Reason: '.($this->practitionerProfile->review_note ?: 'Not specified.'))
            ->line('Contact your clinic owner to have your license information corrected and resubmitted.');
    }
}
