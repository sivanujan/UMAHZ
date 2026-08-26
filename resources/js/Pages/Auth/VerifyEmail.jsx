import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';
import Logo from '@/Components/Common/Logo';

export default function VerifyEmail({ status, email }) {
    const { post, processing } = useForm({});

    const resend = (e) => {
        e.preventDefault();
        post('/verify-email/resend', { preserveScroll: true });
    };

    return (
        <div className="min-h-screen bg-[#F1F5F9] font-sans antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden">
            <Head title="Verify Email" />

            {/* Brand ambient glow — Royal Blue / Teal */}
            <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-60px] left-[-60px] w-[320px] h-[320px] bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-md w-full relative z-10">
                <Link href="/" className="flex items-center justify-center mb-8">
                    <Logo size="lg" tagline />
                </Link>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#2563EB]/10 flex items-center justify-center mx-auto">
                        <MailCheck className="w-7 h-7 text-[#2563EB]" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-[#0D1B2A] tracking-tight">Check your email</h1>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                            We sent a verification link to <span className="font-semibold text-[#0D1B2A]">{email}</span>. Click it to activate your account.
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                            The link expires in 60 minutes.
                        </p>
                    </div>

                    {status === 'verification-link-sent' && (
                        <div className="p-3 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
                            A new verification link has been sent to your email address.
                        </div>
                    )}

                    <form onSubmit={resend}>
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-full shadow-lg shadow-[#2563EB]/20 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
                        >
                            {processing ? 'Sending…' : 'Resend verification email'}
                        </button>
                    </form>

                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        Log out
                    </Link>
                </div>
            </div>
        </div>
    );
}
