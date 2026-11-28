<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Notifications\PublicBookingNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:send-reminders';

    protected $description = 'Send 24-hour reminder emails for upcoming confirmed appointments.';

    public function handle(): int
    {
        $from = now()->addHours(23);
        $to = now()->addHours(25);

        $appointments = Appointment::withoutGlobalScopes()
            ->with(['tenant', 'client', 'staffMembership.user', 'location'])
            ->whereIn('status', [Appointment::STATUS_CONFIRMED, Appointment::STATUS_SCHEDULED])
            ->whereNull('reminder_sent_at')
            ->whereBetween('starts_at', [$from, $to])
            ->get();

        $sent = 0;

        foreach ($appointments as $appointment) {
            $tenant = $appointment->tenant;
            if (! $tenant || ! $tenant->bookingSettings()['send_24h_reminder']) {
                continue;
            }

            $email = $appointment->client?->email;
            if (! $email) {
                continue;
            }

            // Atomic claim prevents duplicate reminders if overlapping workers run.
            $updated = Appointment::withoutGlobalScopes()
                ->whereKey($appointment->id)
                ->whereNull('reminder_sent_at')
                ->update(['reminder_sent_at' => now()]);

            if ($updated === 0) {
                continue;
            }

            Notification::route('mail', $email)
                ->notify(new PublicBookingNotification($appointment, 'reminder_24h'));

            $sent++;
        }

        $this->info("Sent {$sent} appointment reminder(s).");

        return self::SUCCESS;
    }
}
