import React, { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import TopNavLayout from '@/Layouts/TopNavLayout';
import KpiCard from '@/Components/Dashboard/KpiCard';
import RevenueChartCard from '@/Components/Dashboard/RevenueChartCard';
import DonutProgressCard from '@/Components/Dashboard/DonutProgressCard';
import ActivityListCard from '@/Components/Dashboard/ActivityListCard';
import SetupProgressCard from '@/Components/Dashboard/SetupProgressCard';
import OutstandingInvoicesCard from '@/Components/Dashboard/OutstandingInvoicesCard';
import StaffAvailabilityCard from '@/Components/Dashboard/StaffAvailabilityCard';
import {
    DollarSign,
    Calendar,
    Users,
    Building2,
    ReceiptText,
    Plus,
    Search,
    Bell,
    Sparkles,
    CreditCard,
    ArrowUpRight,
    CheckCircle2,
} from 'lucide-react';

function getGreeting(name) {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) {
        timeGreeting = 'Good afternoon';
    } else if (hour >= 17) {
        timeGreeting = 'Good evening';
    }
    return `${timeGreeting}, ${name?.split(' ')[0] || 'Doctor'}`;
}

export default function OwnerDashboard({
    stats = {},
    revenueChart = [],
    recentAppointments = [],
    setupProgress = null,
    subscription = null,
    outstandingInvoices = [],
    staff = [],
}) {
    const { auth } = usePage().props;
    const user = auth.user;
    const tenant = auth.tenant;

    const todayFormatted = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date());

    return (
        <TopNavLayout title="Clinic Dashboard">
            <Head title="Owner Dashboard — UMAHZ" />

            <div className="space-y-6 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-2">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#8B7CF6' }}>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{tenant?.name || 'Clinic'} &bull; Overview</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            {getGreeting(user?.name)}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {todayFormatted} &bull; Practice operating in{' '}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {tenant?.timezone || 'America/Toronto'} ({tenant?.currency || 'CAD'})
                            </span>
                        </p>
                    </div>

                    {/* Quick Actions Buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                        <Link
                            href="/app/clients"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] bg-white/70 dark:bg-white/10 text-indigo-700 dark:text-indigo-200 border border-violet-500/20 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/15 shadow-2xs"
                            style={{
                                backdropFilter: 'blur(12px)',
                            }}
                        >
                            <Users className="w-3.5 h-3.5 text-violet-500 dark:text-violet-300" />
                            <span>New Client</span>
                        </Link>

                        <Link
                            href="/app/calendar"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                            style={{
                                background: 'linear-gradient(135deg, #8B7CF6 0%, #6366F1 100%)',
                                boxShadow: '0 4px 16px rgba(139,124,246,0.35)',
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            <span>Book Appointment</span>
                        </Link>
                    </div>
                </div>

                {/* KPI ROW: 5 Compact Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* 1. Revenue MTD */}
                    <KpiCard
                        label="Revenue (MTD)"
                        value={stats.monthlyRevenue || '$0.00'}
                        rawValue={stats.monthlyRevenueRaw}
                        prefix="$"
                        icon={DollarSign}
                        iconTint="#10B981"
                        iconBg="rgba(16,185,129,0.12)"
                        trend={
                            typeof stats.revenueGrowth === 'number' && stats.revenueGrowth !== 0
                                ? {
                                      value: stats.revenueGrowth,
                                      isPositive: stats.revenueGrowth >= 0,
                                      text: 'vs last month',
                                      hasComparison: true,
                                  }
                                : { text: 'Month to date', hasComparison: false }
                        }
                        delay={0}
                    />

                    {/* 2. Today's Appointments */}
                    <KpiCard
                        label="Today's Sessions"
                        value={stats.todayAppointments || 0}
                        rawValue={stats.todayAppointments || 0}
                        icon={Calendar}
                        iconTint="#7C3AED"
                        iconBg="rgba(124,58,237,0.12)"
                        trend={{
                            text: stats.todayAppointments === 1 ? '1 session scheduled' : `${stats.todayAppointments || 0} scheduled today`,
                            hasComparison: false,
                        }}
                        delay={1}
                    />

                    {/* 3. Total Active Clients */}
                    <KpiCard
                        label="Active Clients"
                        value={stats.totalClients || 0}
                        rawValue={stats.totalClients || 0}
                        icon={Users}
                        iconTint="#06B6D4"
                        iconBg="rgba(6,182,212,0.12)"
                        trend={{
                            text: `${stats.totalClients || 0} registered patients`,
                            hasComparison: false,
                        }}
                        delay={2}
                    />

                    {/* 4. Clinic Locations */}
                    <KpiCard
                        label="Practice Locations"
                        value={stats.activeLocations || 0}
                        rawValue={stats.activeLocations || 0}
                        icon={Building2}
                        iconTint="#8B5CF6"
                        iconBg="rgba(139,92,246,0.12)"
                        trend={{
                            text: stats.activeLocations > 0 ? `${stats.activeLocations} active facilities` : 'Needs location setup',
                            hasComparison: false,
                        }}
                        delay={3}
                    />

                    {/* 5. Outstanding Balance */}
                    <KpiCard
                        label="Open Invoices"
                        value={stats.outstandingBalance || '$0.00'}
                        rawValue={stats.outstandingBalanceRaw}
                        prefix="$"
                        icon={ReceiptText}
                        iconTint="#F59E0B"
                        iconBg="rgba(245,158,11,0.12)"
                        trend={{
                            text: stats.outstandingBalanceRaw > 0 ? 'Pending payment' : 'All accounts settled',
                            hasComparison: false,
                        }}
                        delay={4}
                    />
                </div>

                {/* MAIN ANALYTICS ROW: 2 Columns (65% Chart / 35% Donut + Setup) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Wide Revenue Chart Card */}
                    <div className="lg:col-span-8">
                        <RevenueChartCard
                            revenueChart={revenueChart}
                            monthlyRevenue={stats.monthlyRevenue}
                            currency={tenant?.currency || 'CAD'}
                        />
                    </div>

                    {/* Right: Radial Donut Progress + Setup / Plan Card */}
                    <div className="lg:col-span-4 space-y-6">
                        <DonutProgressCard
                            title="Collection Efficiency"
                            percentage={stats.collectionRate || 100}
                            paidCount={revenueChart?.filter((r) => r.revenue > 0)?.length || 1}
                            openCount={outstandingInvoices?.length || 0}
                            subtitle="Total billed payments collected"
                        />

                        <SetupProgressCard
                            setupProgress={setupProgress}
                            subscription={subscription}
                        />
                    </div>
                </div>

                {/* LOWER SECTION: Activity & Operational Feeds */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left (7 Cols): Upcoming Appointments & Recent Activity */}
                    <div className="lg:col-span-7">
                        <ActivityListCard appointments={recentAppointments} />
                    </div>

                    {/* Right (5 Cols): Outstanding Invoices & Staff Availability */}
                    <div className="lg:col-span-5 space-y-6">
                        <OutstandingInvoicesCard invoices={outstandingInvoices} />
                        <StaffAvailabilityCard staff={staff} />
                    </div>
                </div>
            </div>
        </TopNavLayout>
    );
}
