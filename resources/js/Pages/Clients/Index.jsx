import React from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Users, Mail, Phone, Calendar, Search, Plus } from 'lucide-react';

export default function ClientsIndex({ clients }) {
    return (
        <AuthenticatedLayout title="Client Directory">
            <Head title="Clients" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Tenant Clients</h1>
                    <p className="text-sm text-slate-500 mt-1">Tenant-scoped patient and client health profiles.</p>
                </div>
                <button className="inline-flex items-center justify-center px-4 py-2 bg-violet-800 hover:bg-violet-900 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
                    <Plus className="w-4 h-4 mr-2" />
                    New Client
                </button>
            </div>

            {/* Clients Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="relative w-72">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-violet-600 focus:border-violet-600"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <th className="py-3 px-6">Name</th>
                                <th className="py-3 px-6">Contact Info</th>
                                <th className="py-3 px-6">Date of Birth</th>
                                <th className="py-3 px-6">Preferred Contact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {clients && clients.length > 0 ? (
                                clients.map((client) => (
                                    <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-4 px-6 font-medium text-slate-900">
                                            {client.first_name} {client.last_name}
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-600">
                                            <div className="flex items-center space-x-1">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{client.email || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center space-x-1 mt-1">
                                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{client.phone || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-600">
                                            {client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-500 capitalize">
                                            {client.preferred_contact_method || 'N/A'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-slate-500 text-sm">
                                        No clients found in this clinic tenant.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
