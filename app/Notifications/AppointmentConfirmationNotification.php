<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AppointmentConfirmationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Appointment $appointment) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->appointment->loadMissing([
            'client',
            'tenant',
            'staffMembership.user',
            'location',
            'room',
        ]);

        $tenant = $this->appointment->tenant;
        $clinicName = $tenant?->name ?? config('app.name');
        $fromAddress = config('mail.appointments.from_address', 'appointments@umahz.com');
        $replyToEmail = $tenant?->email ?: ($tenant?->primary_contact_email ?: null);

        $tz = $tenant?->timezone ?: 'UTC';
        $localStart = $this->appointment->starts_at->setTimezone($tz);
        $appointmentDate = $localStart->format('l, F j, Y');
        $appointmentTime = $localStart->format('g:i A');

        $client = $this->appointment->client;
        $clientName = $client?->full_name ?: trim(($client?->first_name ?? '').' '.($client?->last_name ?? ''));

        $locationAddress = null;
        if ($this->appointment->location) {
            $rawAddress = $this->appointment->location->address;
            $locationAddress = is_array($rawAddress)
                ? implode(', ', array_filter($rawAddress))
                : $rawAddress;
        }

        $mail = (new MailMessage)
            ->from($fromAddress, $clinicName)
            ->subject("Your appointment at {$clinicName} is confirmed")
            ->view('emails.appointment-confirmation', [
                'clinicName' => $clinicName,
                'clientName' => $clientName,
                'serviceName' => $this->appointment->service_name,
                'practitionerName' => $this->appointment->staffMembership?->user?->name,
                'appointmentDate' => $appointmentDate,
                'appointmentTime' => $appointmentTime,
                'clinicTimezone' => $tz,
                'durationMinutes' => $this->appointment->duration_minutes,
                'locationName' => $this->appointment->location?->name,
                'locationAddress' => $locationAddress,
                'roomName' => $this->appointment->room?->name,
                'clinicPhone' => $tenant?->phone,
                'clinicEmail' => $replyToEmail,
            ]);

        if (! empty($replyToEmail)) {
            $mail->replyTo($replyToEmail, $clinicName);
        }

        return $mail;
    }
}
