<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Config;

/**
 * The 6-digit code that verifies an applicant's email during clinic signup.
 * Sent on-demand (Notification::route) because no User exists yet.
 */
class ClinicVerificationCodeNotification extends Notification
{
    use Queueable;

    public function __construct(protected string $code)
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
        $minutes = (int) (\App\Support\EmailVerificationCode::TTL / 60);

        return (new MailMessage)
            ->subject('Your UMAHZ verification code: '.$this->code)
            ->greeting('Verify your email')
            ->line('Enter this code to continue your clinic application:')
            ->line('**'.$this->code.'**')
            ->line("This code expires in {$minutes} minutes.")
            ->line('If you didn\'t start a UMAHZ application, you can safely ignore this email.')
            ->salutation('— The '.Config::get('app.name').' team');
    }
}
