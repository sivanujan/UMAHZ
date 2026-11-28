<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StaffBookingAlertNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Appointment $appointment) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->appointment->loadMissing(['client', 'tenant']);
        $tenant = $this->appointment->tenant;
        $tz = $tenant?->timezone ?: 'UTC';
        $localStart = $this->appointment->starts_at->setTimezone($tz);
        $isRequest = $appointmentStatus = $this->appointment->status === Appointment::STATUS_REQUESTED;
        $clientName = $this->appointment->client?->full_name ?: 'A patient';

        $subject = $isRequest
            ? "New booking request from {$clientName}"
            : "New online booking: {$clientName}";

        $url = $tenant?->appUrl('/app/calendar') ?? url('/app/calendar');
        if (app()->environment('production')) {
            $url = preg_replace('/^http:\/\//i', 'https://', $url);
        }

        return (new MailMessage)
            ->subject($subject)
            ->line("{$clientName} booked {$this->appointment->service_name} for {$localStart->format('M j, Y g:i A')} ({$tz}).")
            ->action($isRequest ? 'Review Booking Request' : 'View Calendar', $url);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $this->appointment->loadMissing('client');
        $isRequest = $this->appointment->status === Appointment::STATUS_REQUESTED;
        $clientName = $this->appointment->client?->full_name ?: 'Patient';

        return [
            'appointment_id' => $this->appointment->id,
            'type' => $isRequest ? 'public_booking_request' : 'public_booking_confirmed',
            'title' => $isRequest ? "Booking request: {$clientName}" : "Online booking: {$clientName}",
            'body' => $this->appointment->service_name,
            'url' => '/app/calendar',
        ];
    }
}
