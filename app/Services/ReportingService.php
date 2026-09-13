<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Payment;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportingService
{
    /**
     * Normalize the date range filters.
     *
     * @return array{start: CarbonImmutable, end: CarbonImmutable, start_str: string, end_str: string}
     */
    public function resolveDateRange(Tenant $tenant, ?string $startDate, ?string $endDate): array
    {
        $timezone = $tenant->timezone ?: 'America/Toronto';

        if ($startDate) {
            $start = CarbonImmutable::parse($startDate, $timezone)->startOfDay();
        } else {
            // Default to start of current month
            $start = CarbonImmutable::now($timezone)->startOfMonth()->startOfDay();
        }

        if ($endDate) {
            $end = CarbonImmutable::parse($endDate, $timezone)->endOfDay();
        } else {
            $end = CarbonImmutable::now($timezone)->endOfDay();
        }

        // Safety: If start is after end, swap them
        if ($start->isAfter($end)) {
            [$start, $end] = [$end->startOfDay(), $start->endOfDay()];
        }

        return [
            'start' => $start,
            'end' => $end,
            'start_str' => $start->toDateString(),
            'end_str' => $end->toDateString(),
            'timezone' => $timezone,
        ];
    }

    /**
     * 1. APPOINTMENTS REPORT
     * Aggregates counts by status, daily trends, practitioner breakdown, service breakdown, location breakdown.
     */
    public function getAppointmentsReport(Tenant $tenant, array $filters): array
    {
        $range = $this->resolveDateRange($tenant, $filters['start_date'] ?? null, $filters['end_date'] ?? null);
        $startUtc = $range['start']->setTimezone('UTC');
        $endUtc = $range['end']->setTimezone('UTC');

        $query = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereBetween('starts_at', [$startUtc, $endUtc]);

        if (! empty($filters['practitioner_id'])) {
            $query->where('staff_membership_id', $filters['practitioner_id']);
        }

        if (! empty($filters['location_id'])) {
            $query->where('location_id', $filters['location_id']);
        }

        if (! empty($filters['service_name'])) {
            $query->where('service_name', $filters['service_name']);
        }

        $appointments = (clone $query)->with([
            'client:id,first_name,last_name,email',
            'staffMembership.user:id,first_name,last_name',
            'location:id,name',
            'room:id,name',
        ])->get();

        $totalCount = $appointments->count();
        $completedCount = $appointments->where('status', Appointment::STATUS_COMPLETED)->count();
        $scheduledCount = $appointments->where('status', Appointment::STATUS_SCHEDULED)->count();
        $confirmedCount = $appointments->where('status', Appointment::STATUS_CONFIRMED)->count();
        $checkedInCount = $appointments->where('status', Appointment::STATUS_CHECKED_IN)->count();
        $cancelledCount = $appointments->where('status', Appointment::STATUS_CANCELLED)->count();
        $noShowCount = $appointments->where('status', Appointment::STATUS_NO_SHOW)->count();

        $completedOrActive = $completedCount + $checkedInCount;
        $attendedCount = $completedCount + $checkedInCount + $confirmedCount;
        $completionRate = $totalCount > 0 ? round(($completedCount / $totalCount) * 100, 1) : 0;
        $cancellationRate = $totalCount > 0 ? round(($cancelledCount / $totalCount) * 100, 1) : 0;
        $noShowRate = $totalCount > 0 ? round(($noShowCount / $totalCount) * 100, 1) : 0;

        // Daily trend data across the range
        $period = CarbonPeriod::create($range['start']->toDateString(), $range['end']->toDateString());
        $trend = [];
        $timezone = $range['timezone'];

        foreach ($period as $date) {
            $dateStr = $date->format('Y-m-d');
            $trend[$dateStr] = [
                'date' => $dateStr,
                'label' => $date->format('M j'),
                'total' => 0,
                'completed' => 0,
                'cancelled' => 0,
                'no_show' => 0,
            ];
        }

        foreach ($appointments as $appt) {
            $localDate = $appt->starts_at->setTimezone($timezone)->format('Y-m-d');
            if (isset($trend[$localDate])) {
                $trend[$localDate]['total']++;
                if ($appt->status === Appointment::STATUS_COMPLETED) {
                    $trend[$localDate]['completed']++;
                } elseif ($appt->status === Appointment::STATUS_CANCELLED) {
                    $trend[$localDate]['cancelled']++;
                } elseif ($appt->status === Appointment::STATUS_NO_SHOW) {
                    $trend[$localDate]['no_show']++;
                }
            }
        }

        // Breakdown by Practitioner
        $byPractitioner = $appointments->groupBy('staff_membership_id')->map(function ($group) {
            $first = $group->first();
            $practitionerName = $first?->staffMembership?->user?->name ?? 'Unassigned';
            $total = $group->count();
            $completed = $group->where('status', Appointment::STATUS_COMPLETED)->count();
            $cancelled = $group->where('status', Appointment::STATUS_CANCELLED)->count();
            $noShow = $group->where('status', Appointment::STATUS_NO_SHOW)->count();

            return [
                'id' => $first?->staff_membership_id,
                'name' => $practitionerName,
                'total' => $total,
                'completed' => $completed,
                'cancelled' => $cancelled,
                'no_show' => $noShow,
                'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
            ];
        })->values()->sortByDesc('total')->values()->all();

        // Breakdown by Service
        $byService = $appointments->groupBy('service_name')->map(function ($group, $serviceName) {
            $total = $group->count();
            $completed = $group->where('status', Appointment::STATUS_COMPLETED)->count();
            $cancelled = $group->where('status', Appointment::STATUS_CANCELLED)->count();

            return [
                'name' => $serviceName ?: 'General Consultation',
                'total' => $total,
                'completed' => $completed,
                'cancelled' => $cancelled,
            ];
        })->values()->sortByDesc('total')->values()->all();

        // Breakdown by Location
        $byLocation = $appointments->groupBy('location_id')->map(function ($group) {
            $first = $group->first();
            $locationName = $first?->location?->name ?? 'Main Clinic';
            $total = $group->count();
            $completed = $group->where('status', Appointment::STATUS_COMPLETED)->count();

            return [
                'id' => $first?->location_id,
                'name' => $locationName,
                'total' => $total,
                'completed' => $completed,
            ];
        })->values()->sortByDesc('total')->values()->all();

        return [
            'summary' => [
                'total' => $totalCount,
                'completed' => $completedCount,
                'scheduled' => $scheduledCount,
                'confirmed' => $confirmedCount,
                'checked_in' => $checkedInCount,
                'cancelled' => $cancelledCount,
                'no_show' => $noShowCount,
                'completion_rate' => $completionRate,
                'cancellation_rate' => $cancellationRate,
                'no_show_rate' => $noShowRate,
            ],
            'trend' => array_values($trend),
            'by_practitioner' => $byPractitioner,
            'by_service' => $byService,
            'by_location' => $byLocation,
            'range' => [
                'start' => $range['start_str'],
                'end' => $range['end_str'],
            ],
        ];
    }

    /**
     * 2. REVENUE REPORT (OWNER-ONLY)
     * All monetary values in integer minor units (CAD cents) to avoid float rounding.
     */
    public function getRevenueReport(Tenant $tenant, array $filters): array
    {
        $range = $this->resolveDateRange($tenant, $filters['start_date'] ?? null, $filters['end_date'] ?? null);
        $startUtc = $range['start']->setTimezone('UTC');
        $endUtc = $range['end']->setTimezone('UTC');
        $timezone = $range['timezone'];

        // 1. Invoices issued or dated in the window
        $invoiceQuery = Invoice::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('status', '!=', Invoice::STATUS_VOID)
            ->where(function ($q) use ($startUtc, $endUtc) {
                $q->whereBetween('issued_at', [$startUtc, $endUtc])
                    ->orWhere(function ($q2) use ($startUtc, $endUtc) {
                        $q2->whereNull('issued_at')
                            ->whereBetween('created_at', [$startUtc, $endUtc]);
                    });
            });

        if (! empty($filters['location_id'])) {
            $invoiceQuery->whereHas('appointment', fn ($q) => $q->where('location_id', $filters['location_id']));
        }

        if (! empty($filters['practitioner_id'])) {
            $invoiceQuery->whereHas('appointment', fn ($q) => $q->where('staff_membership_id', $filters['practitioner_id']));
        }

        $invoices = $invoiceQuery->with([
            'appointment.staffMembership.user:id,first_name,last_name',
            'appointment.location:id,name',
            'payments',
        ])->get();

        $grossBilled = (int) $invoices->sum('subtotal_amount');
        $discounts = (int) $invoices->sum('discount_amount');
        $taxes = (int) $invoices->sum('tax_amount');
        $totalInvoiced = (int) $invoices->sum('total_amount');

        // 2. Payments collected within the period
        $paymentQuery = Payment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereBetween('processed_at', [$startUtc, $endUtc]);

        if (! empty($filters['method'])) {
            $paymentQuery->where('method', $filters['method']);
        }

        if (! empty($filters['location_id']) || ! empty($filters['practitioner_id'])) {
            $paymentQuery->whereHas('invoice.appointment', function ($q) use ($filters) {
                if (! empty($filters['location_id'])) {
                    $q->where('location_id', $filters['location_id']);
                }
                if (! empty($filters['practitioner_id'])) {
                    $q->where('staff_membership_id', $filters['practitioner_id']);
                }
            });
        }

        $payments = $paymentQuery->with(['invoice.appointment'])->get();

        $succeededPayments = $payments->where('status', Payment::STATUS_SUCCEEDED);
        $refundedPayments = $payments->where('status', Payment::STATUS_REFUNDED);

        $grossCollected = (int) $succeededPayments->sum('amount');
        $refundsTotal = (int) $refundedPayments->sum('amount');
        $netCollected = max(0, $grossCollected - $refundsTotal);

        // Calculate outstanding balance on invoices in range
        $outstandingTotal = (int) $invoices->sum(fn ($inv) => $inv->amountDue());

        // Trend breakdown by day
        $period = CarbonPeriod::create($range['start']->toDateString(), $range['end']->toDateString());
        $trend = [];

        foreach ($period as $date) {
            $dateStr = $date->format('Y-m-d');
            $trend[$dateStr] = [
                'date' => $dateStr,
                'label' => $date->format('M j'),
                'invoiced_cents' => 0,
                'collected_cents' => 0,
                'refunded_cents' => 0,
            ];
        }

        foreach ($invoices as $inv) {
            $dateInstant = $inv->issued_at ?: $inv->created_at;
            $localDate = $dateInstant ? $dateInstant->setTimezone($timezone)->format('Y-m-d') : null;
            if ($localDate && isset($trend[$localDate])) {
                $trend[$localDate]['invoiced_cents'] += (int) $inv->total_amount;
            }
        }

        foreach ($payments as $pay) {
            $localDate = $pay->processed_at ? $pay->processed_at->setTimezone($timezone)->format('Y-m-d') : null;
            if ($localDate && isset($trend[$localDate])) {
                if ($pay->status === Payment::STATUS_SUCCEEDED) {
                    $trend[$localDate]['collected_cents'] += (int) $pay->amount;
                } elseif ($pay->status === Payment::STATUS_REFUNDED) {
                    $trend[$localDate]['refunded_cents'] += (int) $pay->amount;
                }
            }
        }

        // Breakdown by Payment Method
        $byMethod = $succeededPayments->groupBy('method')->map(function ($group, $method) {
            return [
                'method' => $method,
                'label' => match ($method) {
                    Payment::METHOD_CARD => 'Credit / Debit Card (Stripe)',
                    Payment::METHOD_CASH => 'Cash',
                    Payment::METHOD_ETRANSFER => 'Interac e-Transfer',
                    default => ucfirst($method),
                },
                'count' => $group->count(),
                'total_cents' => (int) $group->sum('amount'),
            ];
        })->values()->sortByDesc('total_cents')->values()->all();

        // Breakdown by Practitioner
        $byPractitioner = $invoices->groupBy(function ($inv) {
            return $inv->appointment?->staff_membership_id ?: 'unassigned';
        })->map(function ($group, $key) {
            $first = $group->first();
            $name = $first?->appointment?->staffMembership?->user?->name ?? 'Direct Invoice / Unassigned';
            $invCount = $group->count();
            $subtotal = (int) $group->sum('subtotal_amount');
            $total = (int) $group->sum('total_amount');
            $paid = (int) $group->sum('amount_paid');

            return [
                'id' => $key,
                'name' => $name,
                'invoice_count' => $invCount,
                'subtotal_cents' => $subtotal,
                'total_cents' => $total,
                'paid_cents' => $paid,
            ];
        })->values()->sortByDesc('paid_cents')->values()->all();

        // Breakdown by Service / Modality
        $byService = $invoices->groupBy(function ($inv) {
            return $inv->appointment?->service_name ?: 'Products & Other Services';
        })->map(function ($group, $serviceName) {
            $total = (int) $group->sum('total_amount');
            $paid = (int) $group->sum('amount_paid');

            return [
                'name' => $serviceName,
                'count' => $group->count(),
                'total_cents' => $total,
                'paid_cents' => $paid,
            ];
        })->values()->sortByDesc('paid_cents')->values()->all();

        return [
            'summary' => [
                'currency' => $tenant->currency ?: 'CAD',
                'gross_billed_cents' => $grossBilled,
                'discounts_cents' => $discounts,
                'taxes_cents' => $taxes,
                'total_invoiced_cents' => $totalInvoiced,
                'gross_collected_cents' => $grossCollected,
                'refunds_cents' => $refundsTotal,
                'net_collected_cents' => $netCollected,
                'outstanding_cents' => $outstandingTotal,
                'invoice_count' => $invoices->count(),
                'payment_count' => $succeededPayments->count(),
            ],
            'trend' => array_values($trend),
            'by_method' => $byMethod,
            'by_practitioner' => $byPractitioner,
            'by_service' => $byService,
            'range' => [
                'start' => $range['start_str'],
                'end' => $range['end_str'],
            ],
        ];
    }

    /**
     * 3. RETENTION REPORT
     * New vs. Returning clients, rebooking rate %, average visits per client.
     */
    public function getRetentionReport(Tenant $tenant, array $filters): array
    {
        $range = $this->resolveDateRange($tenant, $filters['start_date'] ?? null, $filters['end_date'] ?? null);
        $startUtc = $range['start']->setTimezone('UTC');
        $endUtc = $range['end']->setTimezone('UTC');
        $timezone = $range['timezone'];

        // Get all appointments in the window (excluding cancelled)
        $periodAppts = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('status', '!=', Appointment::STATUS_CANCELLED)
            ->whereBetween('starts_at', [$startUtc, $endUtc])
            ->when(! empty($filters['practitioner_id']), fn ($q) => $q->where('staff_membership_id', $filters['practitioner_id']))
            ->when(! empty($filters['location_id']), fn ($q) => $q->where('location_id', $filters['location_id']))
            ->get();

        $activeClientIds = $periodAppts->pluck('client_id')->unique()->filter()->values();
        $totalActiveClients = $activeClientIds->count();
        $totalVisits = $periodAppts->count();

        // For each active client, determine their first appointment EVER in this clinic
        $firstApptPerClient = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('client_id', $activeClientIds)
            ->where('status', '!=', Appointment::STATUS_CANCELLED)
            ->select('client_id', DB::raw('MIN(starts_at) as first_visit'))
            ->groupBy('client_id')
            ->pluck('first_visit', 'client_id');

        $newClientCount = 0;
        $returningClientCount = 0;

        foreach ($activeClientIds as $clientId) {
            $firstVisitUtc = isset($firstApptPerClient[$clientId])
                ? Carbon::parse($firstApptPerClient[$clientId])
                : null;

            if ($firstVisitUtc && $firstVisitUtc->gte($startUtc) && $firstVisitUtc->lte($endUtc)) {
                $newClientCount++;
            } else {
                $returningClientCount++;
            }
        }

        // Rebooking calculation:
        // Of the clients who had an appointment in this period, how many have a subsequent appointment scheduled/completed after their latest appointment in this period?
        $latestApptInPeriod = $periodAppts->groupBy('client_id')->map(fn ($g) => $g->max('starts_at'));

        $rebookedClientsCount = 0;
        foreach ($latestApptInPeriod as $clientId => $latestTime) {
            $hasFuture = Appointment::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('client_id', $clientId)
                ->where('status', '!=', Appointment::STATUS_CANCELLED)
                ->where('starts_at', '>', $latestTime)
                ->exists();

            if ($hasFuture) {
                $rebookedClientsCount++;
            }
        }

        $rebookingRate = $totalActiveClients > 0
            ? round(($rebookedClientsCount / $totalActiveClients) * 100, 1)
            : 0;

        $avgVisits = $totalActiveClients > 0
            ? round($totalVisits / $totalActiveClients, 1)
            : 0;

        // Acquisition Trend: Group first-time visits by day
        $period = CarbonPeriod::create($range['start']->toDateString(), $range['end']->toDateString());
        $trend = [];

        foreach ($period as $date) {
            $dateStr = $date->format('Y-m-d');
            $trend[$dateStr] = [
                'date' => $dateStr,
                'label' => $date->format('M j'),
                'new_clients' => 0,
                'returning_visits' => 0,
            ];
        }

        foreach ($periodAppts as $appt) {
            $clientId = $appt->client_id;
            $localDate = $appt->starts_at->setTimezone($timezone)->format('Y-m-d');
            $firstVisitUtc = isset($firstApptPerClient[$clientId]) ? Carbon::parse($firstApptPerClient[$clientId]) : null;
            $isNew = $firstVisitUtc && $firstVisitUtc->gte($startUtc) && $firstVisitUtc->lte($endUtc);

            if (isset($trend[$localDate])) {
                if ($isNew && $firstVisitUtc->setTimezone($timezone)->format('Y-m-d') === $localDate) {
                    $trend[$localDate]['new_clients']++;
                } else {
                    $trend[$localDate]['returning_visits']++;
                }
            }
        }

        return [
            'summary' => [
                'total_active_clients' => $totalActiveClients,
                'new_clients' => $newClientCount,
                'returning_clients' => $returningClientCount,
                'new_client_pct' => $totalActiveClients > 0 ? round(($newClientCount / $totalActiveClients) * 100, 1) : 0,
                'returning_client_pct' => $totalActiveClients > 0 ? round(($returningClientCount / $totalActiveClients) * 100, 1) : 0,
                'rebooking_rate' => $rebookingRate,
                'rebooked_clients_count' => $rebookedClientsCount,
                'avg_visits_per_client' => $avgVisits,
                'total_visits' => $totalVisits,
            ],
            'trend' => array_values($trend),
            'range' => [
                'start' => $range['start_str'],
                'end' => $range['end_str'],
            ],
        ];
    }

    /**
     * 4. CAPACITY UTILIZATION REPORT
     * Bookable clinic hours vs booked appointment duration.
     */
    public function getUtilizationReport(Tenant $tenant, array $filters): array
    {
        $range = $this->resolveDateRange($tenant, $filters['start_date'] ?? null, $filters['end_date'] ?? null);
        $startUtc = $range['start']->setTimezone('UTC');
        $endUtc = $range['end']->setTimezone('UTC');
        $timezone = $range['timezone'];

        $businessHours = $tenant->business_hours;
        $isConfigured = ! empty($businessHours) && is_array($businessHours);

        // Fetch active booked appointments in window
        $appts = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('status', [
                Appointment::STATUS_SCHEDULED,
                Appointment::STATUS_CONFIRMED,
                Appointment::STATUS_CHECKED_IN,
                Appointment::STATUS_COMPLETED,
            ])
            ->whereBetween('starts_at', [$startUtc, $endUtc])
            ->when(! empty($filters['practitioner_id']), fn ($q) => $q->where('staff_membership_id', $filters['practitioner_id']))
            ->when(! empty($filters['location_id']), fn ($q) => $q->where('location_id', $filters['location_id']))
            ->with(['room:id,name', 'staffMembership.user:id,first_name,last_name'])
            ->get();

        $bookedMinutesTotal = 0;
        foreach ($appts as $appt) {
            $duration = $appt->starts_at->diffInMinutes($appt->ends_at);
            $bookedMinutesTotal += max(0, $duration);
        }

        $availableMinutesTotal = 0;
        $dayOfWeekStats = [
            'monday' => ['name' => 'Mon', 'available_mins' => 0, 'booked_mins' => 0],
            'tuesday' => ['name' => 'Tue', 'available_mins' => 0, 'booked_mins' => 0],
            'wednesday' => ['name' => 'Wed', 'available_mins' => 0, 'booked_mins' => 0],
            'thursday' => ['name' => 'Thu', 'available_mins' => 0, 'booked_mins' => 0],
            'friday' => ['name' => 'Fri', 'available_mins' => 0, 'booked_mins' => 0],
            'saturday' => ['name' => 'Sat', 'available_mins' => 0, 'booked_mins' => 0],
            'sunday' => ['name' => 'Sun', 'available_mins' => 0, 'booked_mins' => 0],
        ];

        if ($isConfigured) {
            $period = CarbonPeriod::create($range['start']->toDateString(), $range['end']->toDateString());
            foreach ($period as $day) {
                $dayKey = strtolower($day->format('l'));
                $dayConfig = $businessHours[$dayKey] ?? null;

                if (! empty($dayConfig) && ! empty($dayConfig['open']) && ! empty($dayConfig['close']) && empty($dayConfig['closed'])) {
                    $openTime = Carbon::createFromFormat('H:i', $dayConfig['open']);
                    $closeTime = Carbon::createFromFormat('H:i', $dayConfig['close']);
                    $dailyMins = max(0, $openTime->diffInMinutes($closeTime));

                    $availableMinutesTotal += $dailyMins;
                    if (isset($dayOfWeekStats[$dayKey])) {
                        $dayOfWeekStats[$dayKey]['available_mins'] += $dailyMins;
                    }
                }
            }
        }

        foreach ($appts as $appt) {
            $dayKey = strtolower($appt->starts_at->setTimezone($timezone)->format('l'));
            $dur = max(0, $appt->starts_at->diffInMinutes($appt->ends_at));
            if (isset($dayOfWeekStats[$dayKey])) {
                $dayOfWeekStats[$dayKey]['booked_mins'] += $dur;
            }
        }

        $bookedHours = round($bookedMinutesTotal / 60, 1);
        $availableHours = round($availableMinutesTotal / 60, 1);
        $utilizationRate = $availableMinutesTotal > 0
            ? round(($bookedMinutesTotal / $availableMinutesTotal) * 100, 1)
            : 0;

        // Breakdown by Room
        $byRoom = $appts->groupBy('room_id')->map(function ($group) {
            $first = $group->first();
            $roomName = $first?->room?->name ?? 'Unassigned Room';
            $mins = $group->sum(fn ($a) => max(0, $a->starts_at->diffInMinutes($a->ends_at)));

            return [
                'room_name' => $roomName,
                'appointment_count' => $group->count(),
                'booked_hours' => round($mins / 60, 1),
            ];
        })->values()->sortByDesc('booked_hours')->values()->all();

        return [
            'is_configured' => $isConfigured,
            'summary' => [
                'booked_hours' => $bookedHours,
                'available_hours' => $availableHours,
                'utilization_rate' => $utilizationRate,
                'total_appointments' => $appts->count(),
            ],
            'by_day_of_week' => array_values($dayOfWeekStats),
            'by_room' => $byRoom,
            'range' => [
                'start' => $range['start_str'],
                'end' => $range['end_str'],
            ],
        ];
    }

    /**
     * CSV Exporters
     */
    public function exportAppointmentsCsv(Tenant $tenant, array $filters): StreamedResponse
    {
        $report = $this->getAppointmentsReport($tenant, $filters);
        $range = $this->resolveDateRange($tenant, $filters['start_date'] ?? null, $filters['end_date'] ?? null);
        $timezone = $range['timezone'];

        $appts = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereBetween('starts_at', [$range['start']->setTimezone('UTC'), $range['end']->setTimezone('UTC')])
            ->when(! empty($filters['practitioner_id']), fn ($q) => $q->where('staff_membership_id', $filters['practitioner_id']))
            ->when(! empty($filters['location_id']), fn ($q) => $q->where('location_id', $filters['location_id']))
            ->with(['client', 'staffMembership.user', 'location', 'room'])
            ->orderBy('starts_at')
            ->get();

        $filename = 'appointments_report_'.$range['start_str'].'_to_'.$range['end_str'].'.csv';

        return response()->streamDownload(function () use ($appts, $timezone) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Date', 'Start Time', 'End Time', 'Client Name', 'Client Email', 'Practitioner', 'Service', 'Location', 'Room', 'Status']);

            foreach ($appts as $a) {
                fputcsv($handle, [
                    $a->starts_at->setTimezone($timezone)->format('Y-m-d'),
                    $a->starts_at->setTimezone($timezone)->format('g:i A'),
                    $a->ends_at->setTimezone($timezone)->format('g:i A'),
                    $a->client?->full_name ?? 'N/A',
                    $a->client?->email ?? 'N/A',
                    $a->staffMembership?->user?->name ?? 'Unassigned',
                    $a->service_name ?: 'Consultation',
                    $a->location?->name ?? 'Main',
                    $a->room?->name ?? 'None',
                    ucwords(str_replace('_', ' ', $a->status)),
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function exportRevenueCsv(Tenant $tenant, array $filters): StreamedResponse
    {
        $range = $this->resolveDateRange($tenant, $filters['start_date'] ?? null, $filters['end_date'] ?? null);
        $timezone = $range['timezone'];

        $invoices = Invoice::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('status', '!=', Invoice::STATUS_VOID)
            ->whereBetween('created_at', [$range['start']->setTimezone('UTC'), $range['end']->setTimezone('UTC')])
            ->when(! empty($filters['location_id']), fn ($q) => $q->whereHas('appointment', fn ($q2) => $q2->where('location_id', $filters['location_id'])))
            ->when(! empty($filters['practitioner_id']), fn ($q) => $q->whereHas('appointment', fn ($q2) => $q2->where('staff_membership_id', $filters['practitioner_id'])))
            ->with(['client', 'appointment.staffMembership.user', 'appointment.location'])
            ->orderBy('created_at')
            ->get();

        $filename = 'revenue_report_'.$range['start_str'].'_to_'.$range['end_str'].'.csv';

        return response()->streamDownload(function () use ($invoices, $timezone, $tenant) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Invoice #', 'Date', 'Client', 'Practitioner', 'Service', 'Location', 'Subtotal', 'Discounts', 'Taxes', 'Total', 'Amount Paid', 'Balance Due', 'Status', 'Currency']);

            foreach ($invoices as $inv) {
                $subtotal = number_format($inv->subtotal_amount / 100, 2, '.', '');
                $discount = number_format($inv->discount_amount / 100, 2, '.', '');
                $tax = number_format($inv->tax_amount / 100, 2, '.', '');
                $total = number_format($inv->total_amount / 100, 2, '.', '');
                $paid = number_format($inv->amount_paid / 100, 2, '.', '');
                $due = number_format($inv->amountDue() / 100, 2, '.', '');

                fputcsv($handle, [
                    $inv->reference(),
                    $inv->created_at->setTimezone($timezone)->format('Y-m-d'),
                    $inv->client?->full_name ?? 'N/A',
                    $inv->appointment?->staffMembership?->user?->name ?? 'Unassigned',
                    $inv->appointment?->service_name ?? 'General',
                    $inv->appointment?->location?->name ?? 'Main',
                    $subtotal,
                    $discount,
                    $tax,
                    $total,
                    $paid,
                    $due,
                    ucfirst($inv->status),
                    $inv->currency ?: ($tenant->currency ?: 'CAD'),
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function exportRetentionCsv(Tenant $tenant, array $filters): StreamedResponse
    {
        $range = $this->resolveDateRange($tenant, $filters['start_date'] ?? null, $filters['end_date'] ?? null);
        $startUtc = $range['start']->setTimezone('UTC');
        $endUtc = $range['end']->setTimezone('UTC');

        $periodAppts = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('status', '!=', Appointment::STATUS_CANCELLED)
            ->whereBetween('starts_at', [$startUtc, $endUtc])
            ->with('client')
            ->get();

        $activeClientIds = $periodAppts->pluck('client_id')->unique()->filter();
        $clients = Client::withoutGlobalScopes()->where('tenant_id', $tenant->id)->whereIn('id', $activeClientIds)->get();

        $firstApptPerClient = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('client_id', $activeClientIds)
            ->where('status', '!=', Appointment::STATUS_CANCELLED)
            ->select('client_id', DB::raw('MIN(starts_at) as first_visit'))
            ->groupBy('client_id')
            ->pluck('first_visit', 'client_id');

        $filename = 'retention_report_'.$range['start_str'].'_to_'.$range['end_str'].'.csv';

        return response()->streamDownload(function () use ($clients, $periodAppts, $firstApptPerClient, $startUtc, $endUtc) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Client Name', 'Email', 'Phone', 'First Visit Date', 'Type (New / Returning)', 'Visits in Period', 'Has Future Booking']);

            foreach ($clients as $c) {
                $visitsInPeriod = $periodAppts->where('client_id', $c->id)->count();
                $firstVisit = isset($firstApptPerClient[$c->id]) ? Carbon::parse($firstApptPerClient[$c->id]) : null;
                $isNew = $firstVisit && $firstVisit->gte($startUtc) && $firstVisit->lte($endUtc);

                $hasFuture = Appointment::withoutGlobalScopes()
                    ->where('tenant_id', $c->tenant_id)
                    ->where('client_id', $c->id)
                    ->where('status', '!=', Appointment::STATUS_CANCELLED)
                    ->where('starts_at', '>', $endUtc)
                    ->exists();

                fputcsv($handle, [
                    $c->full_name,
                    $c->email,
                    $c->phone ?: 'N/A',
                    $firstVisit ? $firstVisit->format('Y-m-d') : 'N/A',
                    $isNew ? 'New Client' : 'Returning Client',
                    $visitsInPeriod,
                    $hasFuture ? 'Yes' : 'No',
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function exportUtilizationCsv(Tenant $tenant, array $filters): StreamedResponse
    {
        $report = $this->getUtilizationReport($tenant, $filters);
        $range = $this->resolveDateRange($tenant, $filters['start_date'] ?? null, $filters['end_date'] ?? null);
        $filename = 'utilization_report_'.$range['start_str'].'_to_'.$range['end_str'].'.csv';

        return response()->streamDownload(function () use ($report) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Day of Week', 'Available Hours', 'Booked Hours', 'Estimated Utilization %']);

            foreach ($report['by_day_of_week'] as $day) {
                $avail = round($day['available_mins'] / 60, 1);
                $booked = round($day['booked_mins'] / 60, 1);
                $rate = $avail > 0 ? round(($booked / $avail) * 100, 1) : 0;

                fputcsv($handle, [
                    $day['name'],
                    $avail,
                    $booked,
                    $rate.'%',
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
