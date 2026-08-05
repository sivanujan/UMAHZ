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

    const userRoles = user?.roles || [];
    const isOwnerOrAdmin = userRoles.includes('Clinic Owner') || user?.is_platform_admin;

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, current: true, show: true },
        { name: 'Clients', href: '/clients', icon: Users, current: false, show: true },
        { name: 'Appointments', href: '#', icon: Calendar, current: false, show: true },
        { name: 'Locations & Rooms', href: '#', icon: MapPin, current: false, show: isOwnerOrAdmin },
        { name: 'Staff Members', href: '#', icon: UserCheck, current: false, show: isOwnerOrAdmin },
        { name: 'Clinic Settings', href: '#', icon: Building2, current: false, show: isOwnerOrAdmin },
    ];

    return (
        <div className="min-h-screen bg-stone-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col border-r border-stone-800">
                {/* Clinic Brand Branding */}
                <div className="h-16 flex items-center px-6 border-b border-stone-800 justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-teal-900/30">
                            U
                        </div>
                        <div>
                            <h1 className="font-semibold text-stone-100 text-sm tracking-wide leading-none">UMAHZ</h1>
                            <span className="text-xs text-teal-400 font-medium leading-none block mt-1">Wellness Platform</span>
                        </div>
                    </div>
                </div>

                {/* Tenant / Clinic Selector Badge */}
                {tenant && (
                    <div className="px-4 py-3 mx-3 my-3 bg-stone-800/80 rounded-lg border border-stone-700/50">
                        <div className="flex items-center space-x-2 text-xs text-stone-400">
                            <Building2 className="w-3.5 h-3.5 text-teal-400" />
                            <span className="font-medium text-stone-200 truncate">{tenant.name}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-stone-400 flex items-center justify-between">
                            <span>{tenant.currency} ({tenant.timezone})</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-teal-950 text-teal-300 border border-teal-800/50">Active</span>
                        </div>
                    </div>
                )}

                {/* Role-Aware Navigation */}
                <nav className="flex-1 px-3 py-2 space-y-1">
                    {navigation.filter(item => item.show).map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
                        >
                            <item.icon className="mr-3 h-4 w-4 text-stone-400 group-hover:text-teal-400 transition-colors" />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* User Role Indicator & Quick Logout */}
                <div className="p-4 border-t border-stone-800 bg-stone-900/60">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="h-8 w-8 rounded-full bg-teal-800 text-teal-100 flex items-center justify-center font-semibold text-xs border border-teal-600">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="truncate">
                                <div className="text-xs font-medium text-stone-200 truncate">{user?.name}</div>
                                <div className="text-[11px] text-teal-400 font-medium">
                                    {userRoles[0] || 'Staff'}
                                </div>
                            </div>
                        </div>
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="p-1.5 text-stone-400 hover:text-rose-400 rounded-md hover:bg-stone-800 transition-colors"
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
                <header className="h-16 bg-white border-b border-stone-200/80 px-8 flex items-center justify-between shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-stone-800">{title || 'Dashboard'}</h2>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Activity className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                            Tenant Scoped Engine
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                className="flex items-center space-x-2 text-sm text-stone-600 hover:text-stone-900 focus:outline-none"
                            >
                                <span>{user?.email}</span>
                                <ChevronDown className="w-4 h-4 text-stone-400" />
                            </button>

                            {userDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-50">
                                    <div className="px-4 py-2 text-xs text-stone-500 border-b border-stone-100">
                                        Signed in as <span className="font-semibold text-stone-700">{user?.name}</span>
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
