<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * UMAHZ-branded email verification notification.
 *
 * Extends Laravel's built-in VerifyEmail so the signed verification URL and
 * its 60-minute expiry (config: auth.verification.expire) are still generated
 * by the framework — we only override the presentation to match UMAHZ branding.
 */
class VerifyEmailNotification extends VerifyEmail
{
    /**
     * Build the mail representation of the notification using our branded view.
     */
    public function toMail($notifiable): MailMessage
    {
        // verificationUrl() (parent) produces the signed, expiring link.
        $url = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Verify your UMAHZ account')
            ->view('emails.verify-email', [
                'url' => $url,
                'name' => $notifiable->name,
            ]);
    }
}
