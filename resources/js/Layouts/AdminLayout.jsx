import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, Building2, Users, LifeBuoy, Settings, LogOut, ChevronDown, ShieldCheck, ClipboardCheck, IdCard } from 'lucide-react';

export default function AdminLayout({ children, title }) {
    const { auth } = usePage().props;
    const user = auth.user;

    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    const navigation = [
        { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Tenants', href: '/admin/dashboard', icon: Building2 },
        { name: 'Clinic Applications', href: '/admin/clinics', icon: ClipboardCheck },
        { name: 'Practitioner Verification', href: '/admin/practitioners', icon: IdCard },
        { name: 'Platform Staff', href: '#', icon: Users },
        { name: 'Support', href: '#', icon: LifeBuoy },
        { name: 'Platform Settings', href: '#', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex">
            <aside className="w-64 bg-black text-slate-300 flex flex-col border-r border-slate-800">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                        <img src="/imags/logo.png" alt="UMAHZ" className="h-9 w-9 object-contain flex-shrink-0" />
                        <div>
                            <h1 className="font-semibold text-white text-sm tracking-wide leading-none">UMAHZ</h1>
                            <span className="text-xs text-violet-400 font-medium leading-none block mt-1">Platform Admin</span>
                        </div>
                    </div>
                </div>

                <div className="px-4 py-3 mx-3 my-3 bg-violet-500/10 rounded-lg border border-violet-500/20 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                    <span className="text-[11px] text-violet-200 font-medium">Platform-wide access</span>
                </div>

                <nav className="flex-1 px-3 py-2 space-y-1">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                        >
                            <item.icon className="mr-3 h-4 w-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800 bg-black/60">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="h-8 w-8 rounded-full bg-violet-900 text-violet-200 flex items-center justify-center font-semibold text-xs border border-violet-700">
                                {user?.name?.charAt(0) || 'A'}
                            </div>
                            <div className="truncate">
                                <div className="text-xs font-medium text-slate-200 truncate">{user?.name}</div>
                                <div className="text-[11px] text-violet-400 font-medium">Platform Admin</div>
                            </div>
                        </div>
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-md hover:bg-slate-900 transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-slate-950 border-b border-slate-800 px-8 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">{title || 'Overview'}</h2>

                    <div className="relative">
                        <button
                            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                            className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white focus:outline-none"
                        >
                            <span>{user?.email}</span>
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                        </button>

                        {userDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-900 rounded-lg shadow-lg border border-slate-800 py-1 z-50">
                                <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-800">
                                    Signed in as <span className="font-semibold text-slate-200">{user?.name}</span>
                                </div>
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-slate-800 flex items-center"
                                >
                                    <LogOut className="w-3.5 h-3.5 mr-2" />
                                    Sign out
                                </Link>
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
