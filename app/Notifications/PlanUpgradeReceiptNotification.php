<?php

namespace App\Notifications;

use App\Models\Plan;
use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PlanUpgradeReceiptNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Tenant $tenant,
        public Plan $targetPlan,
        public array $proration,
        public array $breakdown,
        public ?Plan $previousPlan = null,
        public string $interval = 'month',
        public int $extraSeats = 0
    ) {
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
        $clinicName = $this->tenant->name ?? 'Clinic';
        $recipientName = method_exists($notifiable, 'getAttribute') && $notifiable->getAttribute('name')
            ? $notifiable->getAttribute('name')
            : 'Clinic Owner';

        $intervalLabel = $this->interval === 'year' ? 'Annual' : 'Monthly';
        $dueTodayFormatted = $this->proration['net_amount_due_formatted'] ?? ('$' . number_format($this->proration['net_amount_due'] ?? 0, 2) . ' CAD');
        $unusedCredit = (float) ($this->proration['unused_credit'] ?? 0);
        $unitsUsed = $this->proration['units_used'] ?? 0;
        $unitsLabel = $this->proration['units_label'] ?? 'days';
        $unitRate = $this->proration['unit_rate'] ?? 0;
        $rateUnit = ($this->proration['period_type'] ?? 'month') === 'year' ? 'yr' : (($this->proration['period_type'] ?? 'month') === 'month' ? 'mo' : 'day');

        $billingUrl = $this->tenant->appUrl('/app/billing') ?? url('/app/billing');
        $dateFormatted = now()->format('F j, Y g:i A');

        $mail = (new MailMessage)
            ->subject("Payment Receipt: Subscription Upgraded to {$this->targetPlan->name} - {$clinicName}")
            ->greeting("Hello {$recipientName},")
            ->line("Thank you for updating your subscription. Your clinic **{$clinicName}** has been successfully upgraded to the **{$this->targetPlan->name}** plan ({$intervalLabel}).")
            ->line("**Receipt & Payment Summary:**")
            ->line("• **Clinic Workspace:** {$clinicName}")
            ->line("• **New Plan:** {$this->targetPlan->name} ({$intervalLabel})")
            ->line("• **Payment Date:** {$dateFormatted}")
            ->line("• **Amount Charged Today:** **{$dueTodayFormatted}**");

        if ($unusedCredit > 0) {
            $mail->line("• **Proration Credit Applied:** -$" . number_format($unusedCredit, 2) . " CAD ({$unitsUsed} {$unitsLabel} used on previous plan at \${$unitRate}/{$rateUnit})");
        }

        if ($this->previousPlan) {
            $mail->line("• **Previous Plan:** {$this->previousPlan->name}");
        }

        $includedPractitioners = $this->targetPlan->included_practitioners ?? 1;
        if ($this->extraSeats > 0) {
            $mail->line("• **Practitioner Seats:** {$includedPractitioners} included + {$this->extraSeats} extra seat" . ($this->extraSeats > 1 ? 's' : ''));
        } else {
            $mail->line("• **Practitioner Seats:** {$includedPractitioners} included");
        }

        $ongoingTotal = $this->breakdown['total_formatted'] ?? ('$' . number_format($this->breakdown['total'] ?? 0, 2) . ' CAD');
        $mail->line("• **Ongoing Plan Rate:** {$ongoingTotal} / " . ($this->interval === 'year' ? 'year' : 'month'));

        $mail->action('View Billing & Manage Invoices', $billingUrl)
            ->line("You can access all past payment invoices and manage your payment methods anytime in your clinic settings.")
            ->line("If you have any questions about this receipt, please contact our support team at support@umahz.com.")
            ->salutation("Best regards,\nUMAHZ Billing Team");

        return $mail;
    }
}
