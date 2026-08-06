import React from 'react';

export default function CTABanner() {
    return (
        <section className="relative py-16 md:py-24 overflow-hidden bg-[#1E0B3C]">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#2A1054] via-[#5B2EFF]/40 to-[#1E0B3C]" />

            {/* Radial glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[600px] h-[600px] bg-purple-500/15 rounded-full blur-3xl" />
            </div>

            {/* Dot pattern */}
            <div className="absolute inset-0 opacity-[0.06]"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

            <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 lg:px-24 text-center space-y-6">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full backdrop-blur-sm">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-pink-300">Transform Your Practice</span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight max-w-2xl mx-auto">
                    Ready To Unify Your{' '}
                    <em className="not-italic font-light font-serif text-purple-300">Integrated</em>{' '}
                    Practice Management?
                </h2>

                <p className="text-purple-200 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                    Join 1,200+ multi-modality wellness studios optimising their clinical workflows, client booking, and revenue with UMAHZ today.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <a href="#booking" className="bg-white hover:bg-purple-50 text-[#1E0B3C] font-bold px-9 py-4 rounded-full transition-colors shadow-2xl text-sm w-full sm:w-auto text-center">
                        Book a Free Demo
                    </a>
                    <a href="#about" className="bg-purple-500/20 hover:bg-purple-500/30 text-white font-semibold px-8 py-4 rounded-full border border-purple-400/30 transition-colors text-sm w-full sm:w-auto text-center">
                        Learn More
                    </a>
                </div>
            </div>
        </section>
    );
}
