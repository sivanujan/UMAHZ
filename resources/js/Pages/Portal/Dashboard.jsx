import React from 'react';
import { Head, Link } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import {
    CalendarDays, FileText, CreditCard, MessageSquare, ArrowRight,
    CalendarClock, Sparkles, CalendarPlus, ClipboardList, Wallet, Send,
    CheckCircle2, Inbox,
} from 'lucide-react';

const ROYAL_BLUE = '#2563EB';
const EMERALD = '#22C55E';
const DEEP_NAVY = '#0D1B2A';

const CARD_ACCENTS = {
    blue: { bar: '#2563EB', iconBg: '#EFF6FF', iconColor: '#2563EB', glow: 'rgba(37,99,235,0.28)' },
    rose: { bar: '#E11D48', iconBg: '#FFF1F2', iconColor: '#E11D48', glow: 'rgba(225,29,72,0.24)' },
    emerald: { bar: '#22C55E', iconBg: '#ECFDF5', iconColor: '#16A34A', glow: 'rgba(34,197,94,0.26)' },
    amber: { bar: '#D97706', iconBg: '#FFFBEB', iconColor: '#D97706', glow: 'rgba(217,119,6,0.24)' },
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

function StatCard({ accent, icon: Icon, title, delay, children, empty, emptyIcon: EmptyIcon, emptyText, ctaLabel, ctaHref }) {
    const a = CARD_ACCENTS[accent];
    return (
        <div
            className="umahz-dash-fade group bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(13,27,42,0.04),0_12px_28px_-16px_rgba(13,27,42,0.12)] border border-slate-100 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(13,27,42,0.04),0_24px_40px_-16px_rgba(13,27,42,0.18)]"
            style={{ animationDelay: `${delay}ms` }}
        >
            <span className="absolute top-0 left-0 h-full w-1" style={{ background: a.bar }} />

            <div className="flex items-center gap-3 mb-4">
                <span
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
                    style={{ background: a.iconBg, boxShadow: `0 8px 20px -6px ${a.glow}` }}
                >
                    <Icon className="w-[22px] h-[22px]" style={{ color: a.iconColor }} />
                </span>
                <h2 className="font-bold text-[15px]" style={{ color: DEEP_NAVY }}>{title}</h2>
            </div>

            {empty ? (
                <div className="flex flex-col items-center text-center py-5 px-2">
                    <span className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: a.iconBg }}>
                        <EmptyIcon className="w-6 h-6" style={{ color: a.iconColor, opacity: 0.55 }} />
                    </span>
                    <p className="text-sm text-slate-400 mb-4">{emptyText}</p>
                    <Link
                        href={ctaHref}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 hover:gap-2.5"
                        style={{ color: a.iconColor, background: a.iconBg }}
                    >
                        {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">{children}</div>
            )}
        </div>
    );
}

export default function PortalDashboard({ client, upcomingAppointments, formsDue, balances, messages }) {
    const nextAppointment = upcomingAppointments[0];

    return (
        <PortalLayout>
            <Head title="My Dashboard" />
            <style>{FADE_IN_UP_STYLES}</style>

            {/* Welcome banner */}
            <div
                className="umahz-dash-fade rounded-2xl px-8 py-6 text-white shadow-[0_20px_50px_-20px_rgba(13,27,42,0.45)] mb-8 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${DEEP_NAVY} 0%, #16305C 45%, ${ROYAL_BLUE} 100%)` }}
            >
                {/* dot texture */}
                <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '22px 22px' }} />
                {/* radial glow */}
                <div className="absolute -top-24 -right-16 w-[340px] h-[340px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${EMERALD}55 0%, transparent 70%)`, filter: 'blur(20px)' }} />
                {/* decorative abstract shape */}
                <svg className="absolute -right-6 top-1/2 -translate-y-1/2 w-56 h-56 opacity-20 pointer-events-none hidden sm:block" viewBox="0 0 200 200" fill="none">
                    <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="1.5" />
                    <circle cx="100" cy="100" r="60" stroke="white" strokeWidth="1.5" />
                    <circle cx="140" cy="70" r="4" fill={EMERALD} />
                </svg>

                <div className="relative z-10">
                    <p className="text-blue-200 text-[11px] font-bold uppercase tracking-[0.14em] mb-1.5">Welcome Back</p>
                    <h1 className="text-2xl font-bold mb-4">Hi {client.first_name}, here's what's next</h1>

                    <div className="flex flex-wrap gap-2.5">
                        <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3.5 py-1.5 text-xs font-medium">
                            <CalendarClock className="w-3.5 h-3.5 text-blue-200" />
                            Next appointment: <span className="font-semibold">{nextAppointment ? `${nextAppointment.service} — ${nextAppointment.time}` : '—'}</span>
                        </span>
                        <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3.5 py-1.5 text-xs font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                            Member since: <span className="font-semibold">{client.member_since || '—'}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard
                    accent="blue" icon={CalendarDays} title="Upcoming Appointments" delay={80}
                    empty={upcomingAppointments.length === 0} emptyIcon={CalendarClock}
                    emptyText="No upcoming appointments." ctaLabel="Book an appointment" ctaHref="#"
                >
                    {upcomingAppointments.map((a, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold" style={{ color: DEEP_NAVY }}>{a.service}</p>
                                <p className="text-xs text-slate-500">{a.practitioner}</p>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: ROYAL_BLUE }}>{a.time}</span>
                        </div>
                    ))}
                </StatCard>

                <StatCard
                    accent="rose" icon={FileText} title="Forms Due" delay={140}
                    empty={formsDue.length === 0} emptyIcon={CheckCircle2}
                    emptyText="No forms pending." ctaLabel="View forms" ctaHref="#"
                >
                    {formsDue.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                            <p className="text-sm font-semibold" style={{ color: DEEP_NAVY }}>{f.name}</p>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                                {f.status} <ArrowRight className="w-3 h-3" />
                            </span>
                        </div>
                    ))}
                </StatCard>

                <StatCard
                    accent="emerald" icon={CreditCard} title="Balances" delay={200}
                    empty={balances.length === 0} emptyIcon={Wallet}
                    emptyText="No outstanding balances." ctaLabel="Pay a balance" ctaHref="#"
                >
                    {balances.map((b, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                            <p className="text-sm text-slate-600">{b.description}</p>
                            <span className="text-sm font-bold" style={{ color: DEEP_NAVY }}>{b.amount}</span>
                        </div>
                    ))}
                </StatCard>

                <StatCard
                    accent="amber" icon={MessageSquare} title="Messages" delay={260}
                    empty={messages.length === 0} emptyIcon={Inbox}
                    emptyText="No new messages." ctaLabel="Message your practitioner" ctaHref="#"
                >
                    {messages.map((m, i) => (
                        <div key={i} className="bg-slate-50 rounded-xl px-4 py-3">
                            <p className="text-sm font-semibold" style={{ color: DEEP_NAVY }}>{m.from}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{m.preview}</p>
                        </div>
                    ))}
                </StatCard>
            </div>

            {/* Quick actions */}
            <div className="umahz-dash-fade mt-8" style={{ animationDelay: '320ms' }}>
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-400 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Book Appointment', icon: CalendarPlus, accent: 'blue' },
                        { label: 'View Forms', icon: ClipboardList, accent: 'rose' },
                        { label: 'Pay Balance', icon: Wallet, accent: 'emerald' },
                        { label: 'Message Practitioner', icon: Send, accent: 'amber' },
                    ].map((action) => {
                        const a = CARD_ACCENTS[action.accent];
                        return (
                            <Link
                                key={action.label}
                                href="#"
                                className="group flex flex-col items-center justify-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-6 text-center shadow-[0_1px_2px_rgba(13,27,42,0.04),0_12px_28px_-16px_rgba(13,27,42,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(13,27,42,0.04),0_24px_40px_-16px_rgba(13,27,42,0.18)]"
                            >
                                <span
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                                    style={{ background: a.iconBg, boxShadow: `0 8px 20px -6px ${a.glow}` }}
                                >
                                    <action.icon className="w-[22px] h-[22px]" style={{ color: a.iconColor }} />
                                </span>
                                <span className="text-xs font-semibold" style={{ color: DEEP_NAVY }}>{action.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </PortalLayout>
    );
}
