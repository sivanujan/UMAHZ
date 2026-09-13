import React, { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Users, UserPlus, ShieldCheck, Mail, Phone, Lock, Edit2, Trash2,
    Search, CheckCircle2, AlertCircle, AlertTriangle, Loader2, Eye, EyeOff, KeyRound
} from 'lucide-react';

export default function PlatformStaffIndex({ staff = [] }) {
    const { flash, errors } = usePage().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [deletingStaff, setDeletingStaff] = useState(null);

    // Form states
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Filter staff
    const filteredStaff = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return staff;
        return staff.filter(
            (s) =>
                s.name?.toLowerCase().includes(q) ||
                s.email?.toLowerCase().includes(q) ||
                s.phone?.toLowerCase().includes(q)
        );
    }, [staff, searchQuery]);

    const openAddModal = () => {
        setFormName('');
        setFormEmail('');
        setFormPhone('');
        setFormPassword('');
        setShowPassword(false);
        setAddModalOpen(true);
    };

    const openEditModal = (member) => {
        setEditingStaff(member);
        setFormName(member.name || '');
        setFormEmail(member.email || '');
        setFormPhone(member.phone || '');
        setFormPassword('');
        setShowPassword(false);
    };

    const handleCreate = (e) => {
        e.preventDefault();
        setProcessing(true);
        router.post(
            '/admin/staff',
            {
                name: formName,
                email: formEmail,
                phone: formPhone,
                password: formPassword,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAddModalOpen(false);
                },
                onFinish: () => setProcessing(false),
            }
        );
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        if (!editingStaff) return;
        setProcessing(true);

        const data = {
            name: formName,
            email: formEmail,
            phone: formPhone,
        };
        if (formPassword) {
            data.password = formPassword;
        }

        router.patch(`/admin/staff/${editingStaff.id}`, data, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingStaff(null);
            },
            onFinish: () => setProcessing(false),
        });
    };

    const handleDelete = (e) => {
        e.preventDefault();
        if (!deletingStaff) return;
        setProcessing(true);

        router.delete(`/admin/staff/${deletingStaff.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingStaff(null);
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AdminLayout title="Platform Staff & Admins">
            <Head title="Platform Staff" />

            {/* Flash Messages */}
            {flash?.success && (
                <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm flex items-center gap-3 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>{flash.success}</span>
                </div>
            )}

            {errors && Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm flex items-start gap-3 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        {Object.values(errors).map((err, i) => (
                            <p key={i} className="font-medium">{err}</p>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Header Banner & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Platform Administrators</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{staff.length}</h3>
                        <p className="text-[11px] text-violet-400 mt-1">Full system control</p>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Verified Accounts</p>
                        <h3 className="text-2xl font-bold text-white mt-1">
                            {staff.filter((s) => s.email_verified).length}
                        </h3>
                        <p className="text-[11px] text-emerald-400 mt-1">Confirmed emails</p>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">2FA Configured</p>
                        <h3 className="text-2xl font-bold text-white mt-1">
                            {staff.filter((s) => s.two_factor_enabled).length}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1">Enhanced security</p>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                        <KeyRound className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Main Staff Table Card */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-semibold text-white text-base flex items-center gap-2">
                            <Users className="w-4 h-4 text-violet-400" />
                            Platform Administrators
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Staff members who can access the central platform admin dashboard and manage all clinic tenants.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by name, email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-60 bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <button
                            onClick={openAddModal}
                            className="px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            Add Platform Admin
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/40">
                                <th className="py-3 px-6">Administrator</th>
                                <th className="py-3 px-6">Role / Scope</th>
                                <th className="py-3 px-6">Phone</th>
                                <th className="py-3 px-6">Verification</th>
                                <th className="py-3 px-6">Joined Date</th>
                                <th className="py-3 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {filteredStaff.length > 0 ? (
                                filteredStaff.map((member) => (
                                    <tr key={member.id} className="hover:bg-slate-800/40 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-9 w-9 rounded-full bg-violet-900/60 text-violet-200 flex items-center justify-center font-bold text-xs border border-violet-700/50 flex-shrink-0">
                                                    {member.name?.charAt(0).toUpperCase() || 'A'}
                                                </div>
                                                <div className="truncate">
                                                    <div className="font-semibold text-white flex items-center gap-2">
                                                        {member.name}
                                                        {member.is_current_user && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                                                You
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Mail className="w-3 h-3 text-slate-500" />
                                                        {member.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border text-violet-400 bg-violet-500/10 border-violet-500/20">
                                                <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                                                Platform Admin
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-300 text-xs">
                                            {member.phone ? (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-slate-500" />
                                                    {member.phone}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">—</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            {member.email_verified ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    Unverified
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-slate-400 text-xs">
                                            {member.created_at || '—'}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button
                                                    onClick={() => openEditModal(member)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                                    title="Edit details / Reset password"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>

                                                {!member.is_current_user && (
                                                    <button
                                                        onClick={() => setDeletingStaff(member)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                        title="Remove admin privileges"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-slate-500 text-sm">
                                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                                        <p className="font-medium text-slate-400">No administrators found</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {searchQuery ? 'Try adjusting your search query' : 'Click "Add Platform Admin" to create one.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Platform Admin Modal */}
            {addModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 text-violet-400 mb-4">
                            <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                                <UserPlus className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base">Add Platform Administrator</h3>
                                <p className="text-xs text-slate-400">Grants full platform-wide administrative privileges</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. Alex Morgan"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={formEmail}
                                    onChange={(e) => setFormEmail(e.target.value)}
                                    placeholder="alex@umahz.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number (Optional)</label>
                                <input
                                    type="tel"
                                    value={formPhone}
                                    onChange={(e) => setFormPhone(e.target.value)}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={8}
                                        value={formPassword}
                                        onChange={(e) => setFormPassword(e.target.value)}
                                        placeholder="Minimum 8 characters"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 active:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/20"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Adding Admin...
                                        </>
                                    ) : (
                                        'Create Administrator'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAddModalOpen(false)}
                                    disabled={processing}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Platform Admin Modal */}
            {editingStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 text-violet-400 mb-4">
                            <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                                <Edit2 className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base">Edit Administrator</h3>
                                <p className="text-xs text-slate-400">{editingStaff.email}</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={formEmail}
                                    onChange={(e) => setFormEmail(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={formPhone}
                                    onChange={(e) => setFormPhone(e.target.value)}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    New Password <span className="text-slate-500 text-[11px]">(Leave empty to keep current)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        minLength={8}
                                        value={formPassword}
                                        onChange={(e) => setFormPassword(e.target.value)}
                                        placeholder="Enter new password (optional)"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 active:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/20"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving Changes...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingStaff(null)}
                                    disabled={processing}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Remove Platform Admin Confirmation Modal */}
            {deletingStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 text-rose-400 mb-3">
                            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-rose-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base">Remove Administrator</h3>
                                <p className="text-xs text-rose-300">Revoke platform administrator privileges</p>
                            </div>
                        </div>

                        <div className="my-4 text-xs text-slate-300 space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                            <p>
                                Are you sure you want to remove{' '}
                                <strong className="text-white">{deletingStaff.name}</strong> (
                                <span className="text-violet-400 font-mono">{deletingStaff.email}</span>)?
                            </p>
                            <p className="text-slate-400">
                                This user will immediately lose all access to the central platform administration dashboard and tenant management tools.
                            </p>
                        </div>

                        <form onSubmit={handleDelete}>
                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Removing...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            Confirm Removal
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeletingStaff(null)}
                                    disabled={processing}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
