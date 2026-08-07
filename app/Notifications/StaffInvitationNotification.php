<?php

namespace App\Notifications;

use App\Models\StaffMembership;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class StaffInvitationNotification extends Notification
{
    use Queueable;

    public function __construct(protected StaffMembership $staffMembership)
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
        $this->staffMembership->loadMissing('tenant');

        $acceptUrl = URL::temporarySignedRoute(
            'invite.accept',
            now()->addDays(7),
            ['staffMembership' => $this->staffMembership->id]
        );

        $roleLabel = ucwords(str_replace('_', ' ', $this->staffMembership->role));

        return (new MailMessage)
            ->subject("You've been invited to join {$this->staffMembership->tenant->name} on UMAHZ")
            ->greeting('Hi there,')
            ->line("You've been invited to join **{$this->staffMembership->tenant->name}** on UMAHZ as a **{$roleLabel}**.")
            ->action('Accept Invitation & Set Password', $acceptUrl)
            ->line('This invitation link expires in 7 days.')
            ->line('If you were not expecting this invitation, you can safely ignore this email.');
    }
}
