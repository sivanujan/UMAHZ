import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    LayoutDashboard, 
    Users, 
    Calendar, 
    Building2, 
    MapPin, 
    ShieldAlert, 
    LogOut, 
    Activity, 
    UserCheck,
    ChevronDown
} from 'lucide-react';

export default function AuthenticatedLayout({ children, title }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const tenant = auth.tenant;

    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    const isOwnerOrAdmin = user?.role === 'clinic_owner' || user?.is_platform_admin;

    const navigation = [
        { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, current: true, show: true },
        { name: 'Clients', href: '/app/clients', icon: Users, current: false, show: true },
        { name: 'Appointments', href: '#', icon: Calendar, current: false, show: true },
        { name: 'Locations & Rooms', href: '#', icon: MapPin, current: false, show: isOwnerOrAdmin },
        { name: 'Staff Members', href: '/app/staff', icon: UserCheck, current: false, show: isOwnerOrAdmin },
        { name: 'Clinic Settings', href: '#', icon: Building2, current: false, show: isOwnerOrAdmin },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
                {/* Clinic Brand Branding */}
                <div className="h-16 flex items-center px-6 border-b border-slate-800 justify-between">
                    <div className="flex items-center space-x-3">
                        <img src="/imags/logo.png" alt="UMAHZ" className="h-9 w-9 object-contain flex-shrink-0" />
                        <div>
                            <h1 className="font-semibold text-slate-100 text-sm tracking-wide leading-none">UMAHZ</h1>
                            <span className="text-xs text-violet-400 font-medium leading-none block mt-1">Wellness Platform</span>
                        </div>
                    </div>
                </div>

                {/* Tenant / Clinic Selector Badge */}
                {tenant && (
                    <div className="px-4 py-3 mx-3 my-3 bg-slate-800/80 rounded-lg border border-slate-700/50">
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-violet-400" />
                            <span className="font-medium text-slate-200 truncate">{tenant.name}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                            <span>{tenant.currency} ({tenant.timezone})</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-950 text-violet-300 border border-violet-800/50">Active</span>
                        </div>
                    </div>
                )}

                {/* Role-Aware Navigation */}
                <nav className="flex-1 px-3 py-2 space-y-1">
                    {navigation.filter(item => item.show).map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                            <item.icon className="mr-3 h-4 w-4 text-slate-400 group-hover:text-violet-400 transition-colors" />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* User Role Indicator & Quick Logout */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/60">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="h-8 w-8 rounded-full bg-violet-800 text-violet-100 flex items-center justify-center font-semibold text-xs border border-violet-600">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="truncate">
                                <div className="text-xs font-medium text-slate-200 truncate">{user?.name}</div>
                                <div className="text-[11px] text-violet-400 font-medium capitalize">
                                    {user?.is_platform_admin ? 'Platform Admin' : (user?.role || 'Staff').replace('_', ' ')}
                                </div>
                            </div>
                        </div>
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Navbar */}
                <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">{title || 'Dashboard'}</h2>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Activity className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                            Tenant Scoped Engine
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 focus:outline-none"
                            >
                                <span>{user?.email}</span>
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </button>

                            {userDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                                    <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100">
                                        Signed in as <span className="font-semibold text-slate-700">{user?.name}</span>
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

                {/* Page Content */}
                <main className="flex-1 p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
