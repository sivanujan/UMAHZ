import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Accordion({ items }) {
    const [openIndex, setOpenIndex] = useState(0);

    return (
        <div className="space-y-4">
            {items.map((item, i) => {
                const open = openIndex === i;
                return (
                    <div key={item.question} className="bg-white border border-purple-100 rounded-2xl shadow-sm overflow-hidden">
                        <button
                            onClick={() => setOpenIndex(open ? -1 : i)}
                            className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
                        >
                            <span className="text-[#1E0B3C] font-bold text-sm sm:text-base">{item.question}</span>
                            <span className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <ChevronDown className={`w-4 h-4 text-[#5B2EFF] transition-transform ${open ? 'rotate-180' : ''}`} />
                            </span>
                        </button>
                        {open && (
                            <div className="px-6 pb-5">
                                <p className="text-slate-500 text-sm leading-relaxed">{item.answer}</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
