<?php

namespace App\Notifications;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class ClinicApplicationRejectionNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Tenant $tenant,
        public readonly array $sectionsToFix = [],
        public ?string $reapplyUrl = null,
    ) {
        if (! $this->reapplyUrl) {
            $holdDays = (int) \App\Models\PlatformSetting::get('clinic_subdomain_hold_days', 30);
            $this->reapplyUrl = URL::temporarySignedRoute(
                'clinic.reapply.entry',
                now()->addDays($holdDays),
                ['tenant' => $tenant->id]
            );
        }
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
        $currentAttempt = $this->tenant->reapply_count ?: 1;
        $maxAttempts = $this->tenant->maxReapplyAttempts();
        $attemptsRemaining = max(0, $maxAttempts - $currentAttempt);

        $sectionLabels = [
            'clinic_details' => 'Clinic details (name, address, business registration)',
            'documents_license' => 'Professional license / verification documents',
            'disciplines' => 'Offered disciplines & services',
            'contact' => 'Primary contact information',
            'other' => 'Other notes specified below',
        ];

        $flaggedList = array_map(
            fn ($sec) => $sectionLabels[$sec] ?? ucfirst(str_replace('_', ' ', $sec)),
            $this->sectionsToFix ?: ($this->tenant->rejection_sections ?: [])
        );

        $mail = (new MailMessage)
            ->from(config('mail.from.address'), config('mail.from.name') ?: 'UMAHZ Platform')
            ->subject("Update required for your {$this->tenant->name} application")
            ->greeting("Hello {$notifiable->name},")
            ->line("Thank you for applying to join UMAHZ with **{$this->tenant->name}**.")
            ->line("Our review team has reviewed your application and requested some updates before we can proceed.")
            ->line('**Reason for review:**')
            ->line($this->tenant->review_note ?: 'Please review and update the required information.')
            ->line('**Sections that need attention:**');

        foreach ($flaggedList as $item) {
            $mail->line("• {$item}");
        }

        $mail->line("**Application attempts:** Attempt {$currentAttempt} of {$maxAttempts} ({$attemptsRemaining} " . ($attemptsRemaining === 1 ? 'attempt' : 'attempts') . " remaining).")
            ->action('Update & Re-apply', $this->reapplyUrl)
            ->line('You can also sign in directly to your account at any time to edit and resubmit your application.')
            ->line("Your clinic's subdomain reservation will be held for 30 days.")
            ->line('If you have any questions or require assistance, please contact our support team at support@umahz.com.');

        return $mail;
    }
}
