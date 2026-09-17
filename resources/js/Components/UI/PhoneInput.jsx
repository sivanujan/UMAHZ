import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, AlertCircle, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Comprehensive curated country phone codes (Canada default)
export const COUNTRIES = [
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', format: '(###) ###-####', minLength: 10, maxLength: 10 },
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', format: '(###) ###-####', minLength: 10, maxLength: 10 },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', format: '#### ######', minLength: 10, maxLength: 11 },
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', format: '#### ### ###', minLength: 9, maxLength: 10 },
    { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', format: '### ### ####', minLength: 8, maxLength: 10 },
    { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', format: '## ### ####', minLength: 9, maxLength: 9 },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', format: '# ## ## ## ##', minLength: 9, maxLength: 9 },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', format: '### #######', minLength: 10, maxLength: 11 },
    { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', format: '##### #####', minLength: 10, maxLength: 10 },
    { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', format: '### ### ####', minLength: 10, maxLength: 10 },
    { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', format: '### #### ####', minLength: 11, maxLength: 11 },
    { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', format: '## #### ####', minLength: 10, maxLength: 10 },
    { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', format: '#### ####', minLength: 8, maxLength: 8 },
    { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', format: '## ### ####', minLength: 9, maxLength: 9 },
    { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', format: '## #### ####', minLength: 10, maxLength: 10 },
    { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', format: '## ##### ####', minLength: 10, maxLength: 11 },
];

export function parsePhone(fullPhone = '') {
    if (!fullPhone) return { country: COUNTRIES[0], nationalNumber: '' };

    const trimmed = String(fullPhone).trim();
    if (trimmed.startsWith('+')) {
        // Find matching country by longest dial code prefix
        const matched = COUNTRIES.slice()
            .sort((a, b) => b.dialCode.length - a.dialCode.length)
            .find((c) => trimmed.startsWith(c.dialCode));

        if (matched) {
            const rawNumber = trimmed.slice(matched.dialCode.length).replace(/[^\d]/g, '');
            return { country: matched, nationalNumber: rawNumber };
        }
    }

    const onlyDigits = trimmed.replace(/[^\d]/g, '');
    return { country: COUNTRIES[0], nationalNumber: onlyDigits };
}

export function formatNationalNumber(number, country) {
    const digits = number.replace(/\D/g, '');
    if (!digits) return '';

    if (country.dialCode === '+1') {
        if (digits.length <= 3) return `(${digits}`;
        if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }

    // Default spacing in blocks of 3-4
    return digits.replace(/(\d{3,4})(?=\d)/g, '$1 ').trim();
}

export default function PhoneInput({
    id = 'primary_contact_phone',
    label = 'Contact Phone',
    value = '',
    onChange,
    onBlur,
    error,
    valid,
    required = true,
    placeholder = '(555) 000-0000',
    helper,
}) {
    const parsed = parsePhone(value);
    const [selectedCountry, setSelectedCountry] = useState(parsed.country);
    const [nationalNumber, setNationalNumber] = useState(parsed.nationalNumber);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // Sync external value changes
    useEffect(() => {
        const p = parsePhone(value);
        if (p.nationalNumber !== nationalNumber) {
            setNationalNumber(p.nationalNumber);
        }
        if (p.country.code !== selectedCountry.code) {
            setSelectedCountry(p.country);
        }
    }, [value]);

    // Click outside listener for dropdown
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleNumberChange = (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        setNationalNumber(raw);

        // Store full E.164: dialCode + national number
        const fullE164 = raw ? `${selectedCountry.dialCode}${raw}` : '';
        onChange && onChange(fullE164);
    };

    const handleCountrySelect = (country) => {
        setSelectedCountry(country);
        setIsOpen(false);
        setSearch('');

        const fullE164 = nationalNumber ? `${country.dialCode}${nationalNumber}` : '';
        onChange && onChange(fullE164);
    };

    const filteredCountries = COUNTRIES.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.dialCode.includes(search) ||
            c.code.toLowerCase().includes(search.toLowerCase())
    );

    const showError = !!error;
    const showValid = valid && !showError && nationalNumber.length >= 7;

    return (
        <div className="space-y-1.5" ref={dropdownRef}>
            <label
                htmlFor={id}
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
                {label}
                {required ? (
                    <span className="text-rose-500 dark:text-rose-400 ml-0.5" aria-hidden="true">
                        *
                    </span>
                ) : (
                    <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 ml-1">
                        (optional)
                    </span>
                )}
            </label>

            {/* Combined Phone Control with Shared Border & Focus Ring */}
            <div
                className={`relative flex items-stretch rounded-xl border bg-white dark:bg-slate-800/80 transition-all duration-200 ${
                    showError
                        ? 'border-rose-300 dark:border-rose-500/60 ring-4 ring-rose-500/15'
                        : 'border-slate-200 dark:border-slate-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/20'
                }`}
            >
                {/* Country Code Trigger Button on Left */}
                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 pl-3 pr-2.5 py-3 border-r border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-l-xl transition-colors select-none focus:outline-none cursor-pointer"
                    aria-label={`Country code: ${selectedCountry.name} (${selectedCountry.dialCode})`}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                >
                    <span className="text-base leading-none" role="img" aria-label={selectedCountry.name}>
                        {selectedCountry.flag}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {selectedCountry.dialCode}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 ml-0.5" />
                </button>

                {/* Number Input Field on Right */}
                <div className="relative flex-1 flex items-center">
                    <input
                        id={id}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={formatNationalNumber(nationalNumber, selectedCountry)}
                        onChange={handleNumberChange}
                        onBlur={onBlur}
                        placeholder={placeholder}
                        aria-invalid={showError}
                        aria-describedby={showError ? `${id}-error` : helper ? `${id}-hint` : undefined}
                        className="w-full py-3 pl-3 pr-10 text-sm font-medium text-slate-900 dark:text-white bg-transparent outline-none placeholder-slate-400 dark:placeholder-slate-500"
                    />

                    {/* Valid Checkmark or Error Alert Icon */}
                    <AnimatePresence>
                        {showValid && (
                            <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"
                            >
                                <Check className="w-4 h-4" strokeWidth={2.5} />
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <AnimatePresence>
                        {showError && (
                            <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-500 pointer-events-none"
                            >
                                <AlertCircle className="w-4 h-4" strokeWidth={2} />
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Floating Searchable Dropdown */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.98 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="absolute top-full left-0 mt-1.5 w-72 max-w-[90vw] z-50 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
                        >
                            {/* Search Box */}
                            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs">
                                    <Search className="w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search country or code…"
                                        className="w-full bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') setIsOpen(false);
                                            if (e.key === 'Enter' && filteredCountries.length > 0) {
                                                e.preventDefault();
                                                handleCountrySelect(filteredCountries[0]);
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Country List */}
                            <ul
                                role="listbox"
                                className="max-h-60 overflow-y-auto p-1 text-xs divide-y divide-slate-50 dark:divide-slate-800/50"
                            >
                                {filteredCountries.map((country) => {
                                    const isSelected = country.code === selectedCountry.code;
                                    return (
                                        <li
                                            key={country.code}
                                            role="option"
                                            aria-selected={isSelected}
                                            onClick={() => handleCountrySelect(country)}
                                            className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                                                isSelected
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-base leading-none" role="img">
                                                    {country.flag}
                                                </span>
                                                <span className="truncate">{country.name}</span>
                                            </div>
                                            <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500 ml-2">
                                                {country.dialCode}
                                            </span>
                                        </li>
                                    );
                                })}

                                {filteredCountries.length === 0 && (
                                    <li className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                                        No country found
                                    </li>
                                )}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Error Message with Animation */}
            <AnimatePresence>
                {showError && (
                    <motion.p
                        id={`${id}-error`}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="text-[13px] text-rose-500 dark:text-rose-400 font-medium mt-1.5 flex items-center gap-1.5"
                    >
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{error}</span>
                    </motion.p>
                )}
            </AnimatePresence>

            {!showError && helper && (
                <p id={`${id}-hint`} className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                    {helper}
                </p>
            )}
        </div>
    );
}
