import React from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { UserPlus, Mail } from 'lucide-react';

const actionBtn = 'text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors';

/** Per-row management actions, gated by the member's status. The owner's own
 * row shows nothing (you can't act on yourself — enforced server-side too). */
function StaffActions({ member }) {
    if (member.is_self) {
        return <span className="text-xs text-slate-400">You</span>;
    }

    const setStatus = (status) => router.patch(`/app/staff/${member.id}`, { status }, { preserveScroll: true });
    const remove = () => {
        const msg = member.status === 'invited'
            ? `Cancel the invitation for ${member.email}?`
            : `Remove ${member.name}? They lose access immediately; their records are kept.`;
        if (window.confirm(msg)) {
            router.delete(`/app/staff/${member.id}`, { preserveScroll: true });
        }
    };

    return (
        <div className="flex items-center justify-end gap-2">
            {member.status === 'active' && (
                <button onClick={() => setStatus('suspended')} className={`${actionBtn} border-amber-200 text-amber-700 hover:bg-amber-50`}>Suspend</button>
            )}
            {(member.status === 'suspended' || member.status === 'deactivated') && (
                <button onClick={() => setStatus('active')} className={`${actionBtn} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}>Reactivate</button>
            )}
            {member.status !== 'deactivated' && (
                <button onClick={remove} className={`${actionBtn} border-rose-200 text-rose-600 hover:bg-rose-50`}>
                    {member.status === 'invited' ? 'Cancel' : 'Remove'}
                </button>
            )}
        </div>
    );
}

const ROLE_LABELS = {
    clinic_owner: 'Clinic Owner',
    practitioner: 'Practitioner',
    receptionist: 'Receptionist',
};

const STATUS_STYLES = {
    invited: 'bg-amber-50 text-amber-700 border-amber-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    suspended: 'bg-rose-50 text-rose-700 border-rose-200',
    deactivated: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function StaffIndex({ staff, roles }) {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        role: roles?.[0] || 'practitioner',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/app/staff', { onSuccess: () => reset('email') });
    };

    return (
        <AuthenticatedLayout title="Staff Members">
            <Head title="Staff" />

            {flash?.success && (
                <div className="mb-6 p-3 text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                    {flash.success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
                        <div className="flex items-center space-x-2 mb-4">
                            <UserPlus className="w-4 h-4 text-violet-700" />
                            <h2 className="font-semibold text-slate-800 text-sm">Invite Staff Member</h2>
                        </div>

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        required
                                        placeholder="staff@clinic.com"
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-violet-700 focus:border-violet-700"
                                    />
                                </div>
                                {errors.email && <div className="text-xs text-rose-600 mt-1">{errors.email}</div>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Role</label>
                                <select
                                    value={data.role}
                                    onChange={(e) => setData('role', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-violet-700 focus:border-violet-700"
                                >
                                    {(roles || []).map((r) => (
                                        <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                                    ))}
                                </select>
                                {errors.role && <div className="text-xs text-rose-600 mt-1">{errors.role}</div>}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-2.5 px-4 bg-violet-800 hover:bg-violet-900 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
                            >
                                Send Invitation
                            </button>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="font-semibold text-slate-800 text-sm">Team</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                        <th className="py-3 px-6">Name</th>
                                        <th className="py-3 px-6">Role</th>
                                        <th className="py-3 px-6">Status</th>
                                        <th className="py-3 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {staff && staff.length > 0 ? (
                                        staff.map((member) => (
                                            <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="font-medium text-slate-900">{member.name}</div>
                                                    <div className="text-xs text-slate-500">{member.email}</div>
                                                </td>
                                                <td className="py-4 px-6 text-xs text-slate-600">{ROLE_LABELS[member.role] || member.role}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[member.status] || STATUS_STYLES.deactivated}`}>
                                                        {member.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <StaffActions member={member} />
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="py-8 text-center text-slate-500 text-sm">
                                                No staff members yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
