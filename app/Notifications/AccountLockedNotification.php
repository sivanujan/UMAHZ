<?php

namespace App\Notifications;

use App\Support\Tenancy;
use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountLockedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $ipAddress,
        public readonly CarbonInterface $lockedAt,
        public readonly int $lockMinutes,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $resetUrl = Tenancy::centralUrl('/forgot-password');
        $timeFormatted = $this->lockedAt->copy()->utc()->format('M j, Y \a\t g:i A \U\T\C');

        return (new MailMessage)
            ->subject('Security alert: Temporary sign-in lock on your UMAHZ account')
            ->greeting("Hi {$notifiable->name},")
            ->line("We noticed several failed sign-in attempts on your UMAHZ account and temporarily locked sign-ins for {$this->lockMinutes} minutes to protect your account.")
            ->line("Time: {$timeFormatted}")
            ->line("IP address: {$this->ipAddress}")
            ->line('If this was not you, reset your password immediately using the button below.')
            ->action('Reset Your Password', $resetUrl)
            ->line('If this was you, you can wait for the lockout period to expire or ask your clinic owner / platform administrator to unlock your account.');
    }
}
