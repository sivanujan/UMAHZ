import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, CalendarDays, FileText, CreditCard, MessageSquare, LogOut, ChevronDown } from 'lucide-react';
import Logo from '@/Components/Common/Logo';

const NAV = [
    { name: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
    { name: 'Appointments', href: '#', icon: CalendarDays },
    { name: 'Forms', href: '#', icon: FileText },
    { name: 'Billing', href: '#', icon: CreditCard },
    { name: 'Messages', href: '#', icon: MessageSquare },
];

export default function PortalLayout({ children, title }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-800" style={{ fontFamily: "'Manrope', system-ui, -apple-system, sans-serif" }}>
            <header className="bg-white border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
                    <Link href="/portal/dashboard" className="flex items-center shrink-0">
                        <Logo size="sm" />
                    </Link>

                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
                        {NAV.map((item) => (
                            <Link key={item.name} href={item.href} className="hover:text-[#2563EB] transition-colors flex items-center gap-1.5">
                                <item.icon className="w-4 h-4" />
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    <div className="relative">
                        <button
                            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                            className="flex items-center gap-2 text-sm font-semibold text-[#0D1B2A]"
                        >
                            <span className="w-8 h-8 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center text-xs font-bold">
                                {user?.name?.charAt(0) || 'C'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>

                        {userDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                                <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-50">
                                    Signed in as <span className="font-semibold text-[#0D1B2A]">{user?.name}</span>
                                </div>
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center"
                                >
                                    <LogOut className="w-3.5 h-3.5 mr-2" />
                                    Sign out
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10">
                {title && <h1 className="text-2xl font-bold text-[#0D1B2A] mb-6">{title}</h1>}
                {children}
            </main>
        </div>
    );
}
