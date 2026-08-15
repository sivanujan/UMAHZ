import React from 'react';
import { Link } from '@inertiajs/react';
import { Check } from 'lucide-react';
import Logo from '@/Components/Common/Logo';

const STEPS = [
    { number: 1, label: 'Clinic Profile' },
    { number: 2, label: 'Branding' },
    { number: 3, label: 'Business Hours' },
];

export default function OnboardingLayout({ children, currentStep }) {
    return (
        <div className="min-h-screen bg-[#F9F5FB] font-sans antialiased text-slate-800 px-6 py-12 relative overflow-hidden">
            <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-60px] left-[-60px] w-[320px] h-[320px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">
                <Link href="/" className="flex items-center justify-center mb-8">
                    <Logo size="lg" tagline />
                </Link>

                <div className="flex items-center justify-center mb-8">
                    {STEPS.map((step, i) => (
                        <React.Fragment key={step.number}>
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                                        step.number < currentStep
                                            ? 'bg-[#5B2EFF] text-white'
                                            : step.number === currentStep
                                            ? 'bg-[#5B2EFF] text-white ring-4 ring-purple-100'
                                            : 'bg-white border border-slate-200 text-slate-400'
                                    }`}
                                >
                                    {step.number < currentStep ? <Check className="w-4 h-4" /> : step.number}
                                </div>
                                <span className={`text-[11px] font-semibold ${step.number <= currentStep ? 'text-[#1E0B3C]' : 'text-slate-400'}`}>
                                    {step.label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`h-0.5 w-12 sm:w-20 mb-5 mx-1 transition-colors ${step.number < currentStep ? 'bg-[#5B2EFF]' : 'bg-slate-200'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-purple-100 p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
