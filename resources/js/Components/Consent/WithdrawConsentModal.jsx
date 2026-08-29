import React from 'react';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

export default function WithdrawConsentModal({ consent, onClose }) {
    if (!consent) return null;

    const { data, setData, patch, processing, errors, reset } = useForm({
        reason: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(`/app/consents/${consent.id}/withdraw`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col my-auto z-10"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--umahz-border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Withdraw Client Consent
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {consent.consent_type_name} &bull; {consent.signer_name}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                        <p className="font-semibold mb-1">Compliance & Audit Trail Notice</p>
                        <p className="leading-relaxed">
                            Marking a consent as withdrawn does not delete the record. The signed document and timestamp remain preserved
                            in the client's medical history for regulatory compliance, but will show as inactive.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                            Reason for Withdrawal <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            value={data.reason}
                            onChange={(e) => setData('reason', e.target.value)}
                            required
                            rows={3}
                            placeholder="e.g. Client requested revocation of sensitive-area consent, or client requested new agreement version..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
                        />
                        {errors.reason && (
                            <p className="text-xs text-rose-600 mt-1">{errors.reason}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !data.reason.trim()}
                            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs transition shadow-sm"
                        >
                            {processing ? 'Withdrawing...' : 'Confirm Withdrawal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
