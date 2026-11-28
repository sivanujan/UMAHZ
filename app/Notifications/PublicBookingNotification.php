<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PublicBookingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Appointment $appointment,
        public string $kind,
        public ?string $manageToken = null,
        public ?string $intakeToken = null,
        public ?string $reason = null,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->appointment->loadMissing(['client', 'tenant', 'staffMembership.user', 'location']);
        $tenant = $this->appointment->tenant;
        $clinicName = $tenant?->name ?? config('app.name');
        $tz = $tenant?->timezone ?: 'UTC';
        $localStart = $this->appointment->starts_at->setTimezone($tz);
        $dateLine = $localStart->format('l, F j, Y \a\t g:i A')." ({$tz})";
        $practitioner = $this->appointment->staffMembership?->user?->name ?? 'your practitioner';

        $subject = match ($this->kind) {
            'request_received' => "Booking request received — {$clinicName}",
            'approved' => "Your appointment at {$clinicName} is approved",
            'declined' => "Update on your booking request — {$clinicName}",
            'cancelled_by_patient', 'cancelled_by_clinic' => "Appointment cancelled — {$clinicName}",
            'reminder_24h' => "Reminder: Appointment tomorrow at {$clinicName}",
            default => "Your appointment at {$clinicName} is confirmed",
        };

        $intro = match ($this->kind) {
            'request_received' => "We received your booking request for {$this->appointment->service_name} with {$practitioner} on {$dateLine}. Our team will confirm shortly.",
            'approved' => "Your booking request for {$this->appointment->service_name} with {$practitioner} on {$dateLine} has been approved.",
            'declined' => "Unfortunately {$clinicName} could not accommodate your request for {$this->appointment->service_name} on {$dateLine}."
                .($this->reason ? " Reason: {$this->reason}" : ''),
            'cancelled_by_patient' => "Your appointment for {$this->appointment->service_name} on {$dateLine} has been cancelled.",
            'cancelled_by_clinic' => "Your appointment for {$this->appointment->service_name} on {$dateLine} was cancelled by {$clinicName}."
                .($this->reason ? " Reason: {$this->reason}" : ''),
            'reminder_24h' => "Friendly reminder: you have {$this->appointment->service_name} with {$practitioner} scheduled for {$dateLine}.",
            default => "Your appointment for {$this->appointment->service_name} with {$practitioner} is confirmed for {$dateLine}.",
        };

        $mail = (new MailMessage)
            ->from(config('mail.appointments.from_address', 'appointments@umahz.com'), $clinicName)
            ->subject($subject)
            ->greeting('Hi '.($this->appointment->client?->first_name ?? 'there').',')
            ->line($intro);

        if ($this->intakeToken && $tenant) {
            $mail->line('Please complete your health intake form before your visit: '.$this->clinicHttpsUrl($tenant, "/intake/{$this->intakeToken}"));
        }

        if ($this->manageToken && $tenant && ! in_array($this->kind, ['declined', 'cancelled_by_patient', 'cancelled_by_clinic'], true)) {
            $mail->action('Manage or Cancel Booking', $this->clinicHttpsUrl($tenant, "/book/manage/{$this->manageToken}"));
        } elseif ($tenant && in_array($this->kind, ['declined', 'cancelled_by_patient', 'cancelled_by_clinic'], true)) {
            $mail->action('Book Another Time', $this->clinicHttpsUrl($tenant, '/book'));
        }

        return $mail;
    }

    private function clinicHttpsUrl($tenant, string $path): string
    {
        $url = $tenant->appUrl($path) ?? url($path);

        if (app()->environment('production')) {
            return preg_replace('/^http:\/\//i', 'https://', $url);
        }

        return $url;
    }
}
