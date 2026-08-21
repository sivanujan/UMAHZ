import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import { Calendar, Users, Building, DollarSign, Sparkles, ReceiptText, UserCog, TrendingUp } from 'lucide-react';

/* Staff availability → semantic color + dot. Colors are given as rgba tints so
   the same pill reads correctly on both light and dark surfaces. */
const AVAILABILITY_STYLES = {
    'Available':  { dot: '#22C55E', text: '#15803D', darkText: '#4ADE80', bg: 'rgba(34,197,94,0.12)' },
    'In Session': { dot: '#2563EB', text: '#1D4ED8', darkText: '#7DA8FF', bg: 'rgba(37,99,235,0.12)' },
    'Off Today':  { dot: '#94A3B8', text: '#64748B', darkText: '#94A3B8', bg: 'rgba(148,163,184,0.14)' },
};

/* Escalating urgency for overdue invoices, parsed from the label the backend
   already sends ("Overdue by N days", "Due today", "Due in N days"). Older
   overdue items get heavier weight + a stronger warning token. */
function dueSeverity(due) {
    const overdue = /^Overdue by (\d+)/.exec(due || '');
    if (overdue) {
        const days = parseInt(overdue[1], 10);
        if (days >= 8) return { varName: '--umahz-danger', weight: 700 };
        if (days >= 4) return { varName: '--umahz-warn-mid', weight: 600 };
        return { varName: '--umahz-warn', weight: 600 };
    }
    if (due === 'Due today') return { varName: '--umahz-warn', weight: 600 };
    return { varName: '--umahz-text-tertiary', weight: 500 };
}

function StatCard({ label, value, icon: Icon, tint }) {
    return (
        <div
            className="p-5 rounded-xl border shadow-sm flex items-center justify-between transition-colors duration-300"
            style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
        >
            <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--umahz-text-secondary)' }}>{label}</p>
                <h3 className="text-2xl font-bold mt-1" style={{ color: 'var(--umahz-text-primary)' }}>{value}</h3>
            </div>
            <div
                className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `color-mix(in srgb, ${tint} 14%, transparent)`, color: tint }}
            >
                <Icon className="w-5 h-5" />
            </div>
        </div>
    );
}

function RevenueCard({ value }) {
    return (
        <div
            className="relative overflow-hidden p-5 rounded-xl shadow-md flex flex-col justify-between transition-colors duration-300"
            style={{
                background: 'linear-gradient(135deg, #0D9488 0%, #059669 55%, #22C55E 120%)',
                boxShadow: '0 12px 28px -12px rgba(16,185,129,0.55)',
            }}
        >
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }} aria-hidden="true" />
            <div className="relative z-10 flex items-start justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-50/90">Revenue (MTD)</p>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }}>
                    <DollarSign className="w-5 h-5" />
                </div>
            </div>
            <div className="relative z-10 mt-3">
                <h3 className="text-4xl font-bold tracking-tight text-white leading-none">{value}</h3>
                <p className="flex items-center gap-1 text-xs font-medium text-emerald-50/90 mt-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Month to date
                </p>
            </div>
        </div>
    );
}

function StaffAvailability({ staff }) {
    const { resolved } = useTheme();
    const isDark = resolved === 'dark';
    return (
        <div
            className="rounded-xl border shadow-sm overflow-hidden transition-colors duration-300"
            style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
        >
            <div
                className="px-6 py-4 border-b flex items-center space-x-2"
                style={{ background: 'var(--umahz-surface-2)', borderColor: 'var(--umahz-border)' }}
            >
                <UserCog className="w-4 h-4" style={{ color: 'var(--umahz-accent)' }} />
                <h2 className="font-semibold text-base" style={{ color: 'var(--umahz-text-primary)' }}>Staff Availability</h2>
            </div>
            <div>
                {staff && staff.length > 0 ? staff.map((s, i) => {
                    const style = AVAILABILITY_STYLES[s.availability] || AVAILABILITY_STYLES['Off Today'];
                    return (
                        <div key={i} className="p-5 flex items-center justify-between border-b last:border-b-0" style={{ borderColor: 'var(--umahz-border)' }}>
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--umahz-text-primary)' }}>{s.name}</p>
                                <p className="text-xs capitalize mt-0.5" style={{ color: 'var(--umahz-text-secondary)' }}>{s.role.replace('_', ' ')}</p>
                            </div>
                            <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                                style={{ background: style.bg, color: isDark ? style.darkText : style.text }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} />
                                {s.availability}
                            </span>
                        </div>
                    );
                }) : (
                    <div className="p-8 text-center text-sm" style={{ color: 'var(--umahz-text-secondary)' }}>No staff yet.</div>
                )}
            </div>
        </div>
    );
}

export default function OwnerDashboard({ stats, outstandingInvoices, staff }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const tenant = auth.tenant;

    return (
        <AuthenticatedLayout title="Owner Dashboard">
            <Head title="Dashboard" />

            {/* Welcome banner — Deep Navy base flowing into the Royal Blue → Teal
                brand gradient. Text sits on the dark end for AA contrast. */}
            <div
                className="rounded-2xl p-6 text-white shadow-md mb-8 relative overflow-hidden"
                style={{ background: 'linear-gradient(115deg, #0D1B2A 0%, #14395F 38%, #2563EB 80%, #06B6D4 118%)' }}
            >
                <div
                    className="absolute -right-10 -top-16 w-64 h-64 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.35) 0%, transparent 70%)' }}
                    aria-hidden="true"
                />
                <div className="relative z-10">
                    <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#7DD3FC' }}>
                        <Sparkles className="w-4 h-4" />
                        <span>Multi-Tenant Practice Workspace</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(226,232,240,0.85)' }}>
                        Here is today's business overview for <span className="font-semibold text-white">{tenant?.name || 'Your Clinic'}</span>.
                    </p>
                </div>
            </div>

            {/* Stat cards — Revenue leads with heavier visual weight; the three
                operational metrics stay uniform and quieter. */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <RevenueCard value={stats?.monthlyRevenue || '$0'} />
                <StatCard label="Today's Appointments" value={stats?.todayAppointments || 0} icon={Calendar} tint="#2563EB" />
                <StatCard label="Total Active Clients" value={stats?.totalClients || 0} icon={Users} tint="#06B6D4" />
                <StatCard label="Clinic Locations" value={stats?.activeLocations || 0} icon={Building} tint="var(--umahz-text-tertiary)" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Outstanding invoices */}
                <div
                    className="rounded-xl border shadow-sm overflow-hidden transition-colors duration-300"
                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                >
                    <div
                        className="px-6 py-4 border-b flex items-center space-x-2"
                        style={{ background: 'var(--umahz-surface-2)', borderColor: 'var(--umahz-border)' }}
                    >
                        <ReceiptText className="w-4 h-4" style={{ color: 'var(--umahz-danger)' }} />
                        <h2 className="font-semibold text-base" style={{ color: 'var(--umahz-text-primary)' }}>Outstanding Invoices</h2>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--umahz-border)' }}>
                        {outstandingInvoices && outstandingInvoices.length > 0 ? outstandingInvoices.map((inv, i) => {
                            const sev = dueSeverity(inv.due);
                            return (
                                <div key={i} className="p-5 flex items-center justify-between border-b last:border-b-0" style={{ borderColor: 'var(--umahz-border)' }}>
                                    <p className="text-sm font-medium" style={{ color: 'var(--umahz-text-primary)' }}>{inv.client}</p>
                                    <div className="text-right">
                                        <p className="text-sm font-bold" style={{ color: 'var(--umahz-text-primary)' }}>{inv.amount}</p>
                                        <p className="text-xs mt-0.5" style={{ color: `var(${sev.varName})`, fontWeight: sev.weight }}>{inv.due}</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="p-8 text-center text-sm" style={{ color: 'var(--umahz-text-secondary)' }}>No outstanding invoices.</div>
                        )}
                    </div>
                </div>

                {/* Staff availability */}
                <StaffAvailability staff={staff} />
            </div>
        </AuthenticatedLayout>
    );
}
