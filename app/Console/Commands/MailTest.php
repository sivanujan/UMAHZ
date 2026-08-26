<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class MailTest extends Command
{
    /**
     * @var string
     */
    protected $signature = 'umahz:mail-test {email : The recipient address}';

    /**
     * @var string
     */
    protected $description = 'Send a real UMAHZ verification email through the configured mailer (Resend) to confirm delivery.';

    public function handle(): int
    {
        $email = $this->argument('email');
        $mailer = config('mail.default');

        // The mail send itself doesn't need the database; if it's unreachable
        // (e.g. a dev DB tunnel is down) fall back to the sample send so the
        // Resend transport can still be tested.
        try {
            $user = User::where('email', $email)->first();
        } catch (\Throwable $e) {
            $this->warn('Database unavailable — sending a sample email instead of a real user notification.');
            $user = null;
        }

        if ($user) {
            // Exercises the exact production path: the branded
            // VerifyEmailNotification with a real signed, expiring link.
            $user->notify(new VerifyEmailNotification());
            $this->info("Sent the branded verification email to existing user <{$email}> via [{$mailer}].");
        } else {
            // No account for this address — render the same branded template
            // with a placeholder link so transport + deliverability can still
            // be verified for any inbox.
            Mail::send('emails.verify-email', [
                'url' => url('/verify-email'),
                'name' => 'there',
            ], function ($message) use ($email) {
                $message->to($email)->subject('Verify your UMAHZ account');
            });
            $this->info("Sent a sample verification email to <{$email}> via [{$mailer}].");
        }

        $this->line('From: '.config('mail.from.address').' ("'.config('mail.from.name').'")');
        $this->line('Check the inbox (and spam) to confirm it landed correctly.');

        return self::SUCCESS;
    }
}
