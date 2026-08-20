import React from 'react';
import { Head, Link } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import {
    CalendarDays, FileText, CreditCard, MessageSquare, ArrowRight, ArrowUpRight,
    CalendarClock, CheckCircle2, Wallet, Sparkles, Clock,
} from 'lucide-react';

const NAVY = '#0D1B2A';
const BLUE = '#2563EB';
const GREEN = '#22C55E';
const TEAL = '#06B6D4';
const AMBER = '#D97706';

const CATEGORY = {
    appointments: { solid: BLUE, tint: 'rgba(37,99,235,0.1)' },
    forms: { solid: AMBER, tint: 'rgba(217,119,6,0.1)' },
    balance: { solid: GREEN, tint: 'rgba(34,197,94,0.1)' },
    messages: { solid: TEAL, tint: 'rgba(6,182,212,0.1)' },
};

const FADE_IN_UP_STYLES = `
@keyframes umahzDashFadeInUp {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
}
.umahz-dash-fade {
    opacity: 0;
    animation: umahzDashFadeInUp 0.5s ease-out both;
}
`;

function parseCurrency(value) {
    const n = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
}

/** Small quiet fact chip for the row beneath the hero — recedes to gray at zero. */
function QuickFact({ icon: Icon, label, value, active, accent }) {
    return (
        <div
            className="umahz-dash-fade flex items-center gap-3 rounded-2xl px-4 py-3.5 border"
            style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
        >
            <span
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: active ? accent.tint : 'var(--umahz-hover)' }}
            >
                <Icon className="w-[17px] h-[17px]" style={{ color: active ? accent.solid : 'var(--umahz-text-tertiary)' }} />
            </span>
            <div className="min-w-0">
                <p
                    className="text-lg font-bold leading-none"
                    style={{ color: active ? 'var(--umahz-text-primary)' : 'var(--umahz-text-tertiary)' }}
                >
                    {value}
                </p>
                <p className="text-[11px] font-medium mt-1 truncate" style={{ color: 'var(--umahz-text-tertiary)' }}>{label}</p>
            </div>
        </div>
    );
}

/** The signature element: a Deep Navy hero that always leads with whichever
 * single fact the client actually needs right now — balance owed, or the
 * next visit — instead of four equal-weight boxes competing for attention. */
function HeroPanel({ mode, balanceStats, balanceDueAmount, nextAppointment }) {
    if (mode === 'balance') {
        const paidPct = Math.round((balanceStats.paidRatio || 0) * 100);
        return (
            <div
                className="umahz-dash-fade relative overflow-hidden rounded-3xl p-7 sm:p-8 flex flex-col justify-between"
                style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #14283F 100%)`, minHeight: 236 }}
            >
                <div
                    className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 70%)` }}
                />
                <div className="relative">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: '#93C5FD' }}>
                        <Wallet className="w-3.5 h-3.5" /> Balance due
                    </span>
                    <p className="text-[44px] sm:text-5xl font-extrabold leading-none mt-3 text-white tracking-tight">
                        {balanceStats.totalDue}
                    </p>
                    {nextAppointment && (
                        <p className="text-sm mt-3 flex items-center gap-1.5" style={{ color: '#B7C4D6' }}>
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            Next visit: {nextAppointment.time} &middot; {nextAppointment.service}
                        </p>
                    )}
                </div>

                <div className="relative mt-6">
                    <div className="flex items-center justify-between text-xs font-semibold mb-2" style={{ color: '#B7C4D6' }}>
                        <span>{paidPct}% of invoices settled</span>
                    </div>
                    <div className="h-1.5 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
                        <div
                            className="h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${paidPct}%`, background: `linear-gradient(90deg, ${BLUE}, ${TEAL})` }}
                        />
                    </div>
                    <Link
                        href="#"
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full text-[#0D1B2A] bg-white transition-all duration-200 hover:gap-3 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        Pay balance <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    if (mode === 'appointment') {
        return (
            <div
                className="umahz-dash-fade relative overflow-hidden rounded-3xl p-7 sm:p-8 flex flex-col justify-between"
                style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #14283F 100%)`, minHeight: 236 }}
            >
                <div
                    className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${BLUE} 0%, transparent 70%)` }}
                />
                <div className="relative">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: '#93C5FD' }}>
                        <CalendarDays className="w-3.5 h-3.5" /> Next appointment
                    </span>
                    <p className="text-3xl sm:text-4xl font-extrabold leading-tight mt-3 text-white tracking-tight">
                        {nextAppointment.time}
                    </p>
                    <p className="text-sm mt-2" style={{ color: '#B7C4D6' }}>
                        {nextAppointment.service} with {nextAppointment.practitioner}
                    </p>
                </div>

                <div className="relative mt-6 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(34,197,94,0.18)', color: '#6EE7B7' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> No balance due
                    </span>
                    <Link
                        href="#"
                        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full text-[#0D1B2A] bg-white transition-all duration-200 hover:gap-3 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        View details <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div
            className="umahz-dash-fade relative overflow-hidden rounded-3xl p-7 sm:p-8 flex flex-col justify-center"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #14283F 100%)`, minHeight: 236 }}
        >
            <div
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${GREEN} 0%, transparent 70%)` }}
            />
            <div className="relative">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6EE7B7' }}>
                    <Sparkles className="w-3.5 h-3.5" /> You're all set
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold leading-snug mt-3 text-white tracking-tight max-w-md">
                    No balance due and nothing on the calendar yet.
                </p>
                <Link
                    href="#"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full text-[#0D1B2A] bg-white transition-all duration-200 hover:gap-3 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                    Book an appointment <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}

function PanelHeader({ accent, icon: Icon, title, count }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent.tint }}>
                <Icon className="w-[18px] h-[18px]" style={{ color: accent.solid }} />
            </span>
            <h2 className="font-bold text-[15px] flex-1" style={{ color: 'var(--umahz-text-primary)' }}>{title}</h2>
            {count > 0 && (
                <Link href="#" className="text-xs font-semibold inline-flex items-center gap-1 hover:gap-1.5 transition-all duration-200" style={{ color: accent.solid }}>
                    View all <ArrowRight className="w-3 h-3" />
                </Link>
            )}
        </div>
    );
}

function InlineEmptyNote({ text }) {
    return (
        <p className="text-xs flex items-center gap-1.5 py-2" style={{ color: 'var(--umahz-text-tertiary)' }}>
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: GREEN }} /> {text}
        </p>
    );
}

function Panel({ children, delay }) {
    return (
        <div
            className="umahz-dash-fade rounded-2xl p-6 border"
            style={{ animationDelay: `${delay}ms`, background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
        >
            {children}
        </div>
    );
}

function AppointmentsPanel({ appointments, delay }) {
    return (
        <Panel delay={delay}>
            <PanelHeader accent={CATEGORY.appointments} icon={CalendarDays} title="Upcoming Appointments" count={appointments.length} />
            {appointments.length === 0 ? (
                <div className="flex items-center gap-4 py-3">
                    <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: CATEGORY.appointments.tint }}>
                        <CalendarClock className="w-5 h-5" style={{ color: BLUE }} />
                    </span>
                    <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>Nothing on the calendar</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--umahz-text-tertiary)' }}>Book a visit whenever you're ready.</p>
                    </div>
                    <Link
                        href="#"
                        className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full text-white transition-transform duration-200 hover:scale-[1.03]"
                        style={{ background: BLUE }}
                    >
                        Book <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            ) : (
                <div className="space-y-2">
                    {appointments.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--umahz-hover)' }}>
                            <div
                                className="flex flex-col items-center justify-center w-11 h-11 rounded-lg flex-shrink-0"
                                style={{ background: CATEGORY.appointments.tint }}
                            >
                                <span className="text-[9px] font-bold uppercase leading-none mt-1" style={{ color: BLUE }}>{a.month}</span>
                                <span className="text-sm font-bold leading-none mt-0.5" style={{ color: BLUE }}>{a.day}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--umahz-text-primary)' }}>{a.service}</p>
                                <p className="text-xs truncate" style={{ color: 'var(--umahz-text-secondary)' }}>{a.practitioner}</p>
                            </div>
                            <span className="text-xs font-semibold flex-shrink-0" style={{ color: BLUE }}>{a.time}</span>
                        </div>
                    ))}
                </div>
            )}
        </Panel>
    );
}

function FormsPanel({ forms, delay }) {
    return (
        <Panel delay={delay}>
            <PanelHeader accent={CATEGORY.forms} icon={FileText} title="Forms Due" count={forms.length} />
            {forms.length === 0 ? (
                <InlineEmptyNote text="No forms pending." />
            ) : (
                <ul className="space-y-2">
                    {forms.map((f, i) => (
                        <li key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5 border-l-2" style={{ background: 'var(--umahz-hover)', borderColor: AMBER }}>
                            <span className="text-sm font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>{f.name}</span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: AMBER }}>
                                {f.status} <ArrowRight className="w-3 h-3" />
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function BalancesPanel({ balances, delay }) {
    return (
        <Panel delay={delay}>
            <PanelHeader accent={CATEGORY.balance} icon={CreditCard} title="Balances" count={balances.length} />
            {balances.length === 0 ? (
                <InlineEmptyNote text="No outstanding balances." />
            ) : (
                <div>
                    <ul className="divide-y" style={{ borderColor: 'var(--umahz-border)' }}>
                        {balances.map((b, i) => (
                            <li key={i} className="flex items-center justify-between py-2.5">
                                <span className="text-sm" style={{ color: 'var(--umahz-text-secondary)' }}>{b.description}</span>
                                <span className="text-sm font-bold" style={{ color: 'var(--umahz-text-primary)' }}>{b.amount}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Panel>
    );
}

function MessagesPanel({ messages, delay }) {
    return (
        <Panel delay={delay}>
            <PanelHeader accent={CATEGORY.messages} icon={MessageSquare} title="Messages" count={messages.length} />
            {messages.length === 0 ? (
                <InlineEmptyNote text="No new messages." />
            ) : (
                <div className="space-y-2">
                    {messages.map((m, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--umahz-hover)' }}>
                            <span
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                                style={{ background: CATEGORY.messages.tint, color: TEAL }}
                            >
                                {m.from.charAt(0)}
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>{m.from}</p>
                                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--umahz-text-secondary)' }}>{m.preview}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Panel>
    );
}

/** When forms, balances, and messages are all clear at once, four templated
 * empty states would just be noise — one consolidated moment instead. */
function AllCaughtUpPanel({ delay }) {
    const rows = [
        { icon: FileText, label: 'Forms', text: 'All signed' },
        { icon: CreditCard, label: 'Balance', text: 'Fully settled' },
        { icon: MessageSquare, label: 'Messages', text: 'Nothing new' },
    ];
    return (
        <Panel delay={delay}>
            <div className="flex items-center gap-3 mb-5">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
                    <Sparkles className="w-[18px] h-[18px]" style={{ color: GREEN }} />
                </span>
                <h2 className="font-bold text-[15px]" style={{ color: 'var(--umahz-text-primary)' }}>You're all caught up</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {rows.map((r) => (
                    <div key={r.label} className="flex items-center gap-2.5 rounded-xl px-3.5 py-3" style={{ background: 'var(--umahz-hover)' }}>
                        <r.icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--umahz-text-tertiary)' }} />
                        <div className="min-w-0">
                            <p className="text-xs font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>{r.label}</p>
                            <p className="text-[11px]" style={{ color: GREEN }}>{r.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Panel>
    );
}

export default function PortalDashboard({ client, upcomingAppointments, formsDue, balances, balanceStats, messages, themePreference }) {
    const nextAppointment = upcomingAppointments[0];
    const balanceDueAmount = parseCurrency(balanceStats.totalDue);
    const allClear = formsDue.length === 0 && balances.length === 0 && messages.length === 0;

    const heroMode = balanceDueAmount > 0 ? 'balance' : (nextAppointment ? 'appointment' : 'clear');

    return (
        <PortalLayout themePreference={themePreference}>
            <Head title="My Dashboard" />
            <style>{FADE_IN_UP_STYLES}</style>

            <div className="mb-6 umahz-dash-fade">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--umahz-text-primary)' }}>Hi {client.first_name}, here's what's next</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--umahz-text-tertiary)' }}>Member since {client.member_since || '—'}</p>
            </div>

            {/* Hero + quick facts bento — one asymmetric focal point instead of four equal boxes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                <div className="lg:col-span-2">
                    <HeroPanel
                        mode={heroMode}
                        balanceStats={balanceStats}
                        balanceDueAmount={balanceDueAmount}
                        nextAppointment={nextAppointment}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3 content-start">
                    <QuickFact
                        icon={CalendarDays} label="Upcoming Appointments" value={upcomingAppointments.length}
                        active={upcomingAppointments.length > 0} accent={CATEGORY.appointments}
                    />
                    <QuickFact
                        icon={FileText} label="Forms Due" value={formsDue.length}
                        active={formsDue.length > 0} accent={CATEGORY.forms}
                    />
                    <QuickFact
                        icon={CreditCard} label="Balance Due" value={balanceStats.totalDue}
                        active={balanceDueAmount > 0} accent={CATEGORY.balance}
                    />
                    <QuickFact
                        icon={MessageSquare} label="New Messages" value={messages.length}
                        active={messages.length > 0} accent={CATEGORY.messages}
                    />
                </div>
            </div>

            {/* Detail panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AppointmentsPanel appointments={upcomingAppointments} delay={120} />
                {allClear ? (
                    <AllCaughtUpPanel delay={160} />
                ) : (
                    <>
                        <FormsPanel forms={formsDue} delay={160} />
                        <BalancesPanel balances={balances} delay={200} />
                        <MessagesPanel messages={messages} delay={240} />
                    </>
                )}
            </div>
        </PortalLayout>
    );
}
