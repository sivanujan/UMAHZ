<?php

namespace App\Notifications;

use App\Models\ClientIntake;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ClientIntakeLinkNotification extends Notification
{
    use Queueable;

    public function __construct(public ClientIntake $intake, public string $fillUrl) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->intake->loadMissing(['client', 'tenant']);

        $tenant = $this->intake->tenant;
        $clinicName = $tenant?->name ?? config('app.name');
        $fromAddress = config('mail.appointments.from_address', 'appointments@umahz.com');
        $replyToEmail = $tenant?->email ?: ($tenant?->primary_contact_email ?: null);

        $client = $this->intake->client;
        $clientName = $client?->full_name ?: 'Client';

        $disciplineLabel = ucwords(str_replace('_', ' ', $this->intake->discipline));

        $mail = (new MailMessage)
            ->from($fromAddress, $clinicName)
            ->subject("Please complete your {$disciplineLabel} intake form for {$clinicName}")
            ->greeting("Hi {$clientName},")
            ->line("To prepare for your care at **{$clinicName}**, please take a moment to complete your **{$disciplineLabel}** health history questionnaire online.")
            ->action('Complete Intake Form', $this->fillUrl)
            ->line('This secure intake link is personalized for you and will expire in 7 days.')
            ->line('Your answers are encrypted and delivered directly into your confidential clinic health record.');

        if ($replyToEmail) {
            $mail->replyTo($replyToEmail, $clinicName);
        }

        return $mail;
    }
}
