/**
 * Centralized Form Validation Rules for UMAHZ Clinic Onboarding
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{3,}$/;
export const SUBDOMAIN_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
export const LICENSE_RE = /^[A-Za-z0-9\s\-_]{3,35}$/;

export function getDigits(str = '') {
    return String(str).replace(/\D/g, '');
}

/**
 * Validates a specific field value and returns an error message string or null if valid.
 */
export function validateField(name, value, allData = {}, extraContext = {}) {
    const val = typeof value === 'string' ? value.trim() : value;

    switch (name) {
        case 'name':
            if (!val) return 'Full name is required.';
            if (!NAME_RE.test(val)) return 'Enter your full name (at least 3 letters, no numbers).';
            return null;

        case 'email':
            if (!val) return 'Email address is required.';
            if (!EMAIL_RE.test(val)) return 'Enter a valid email address.';
            if (extraContext.requireEmailVerification && !extraContext.emailVerified) {
                return 'Please verify your email with the verification code.';
            }
            return null;

        case 'password':
            if (!value) return 'Password is required.';
            if (value.length < 8) return 'Password must be at least 8 characters.';
            return null;

        case 'password_confirmation':
            if (!value) return 'Please confirm your password.';
            if (value !== allData.password) return "Passwords don't match.";
            return null;

        case 'clinic_name':
            if (!val) return 'Clinic name is required.';
            if (val.length < 2) return 'Clinic name must be at least 2 characters.';
            return null;

        case 'subdomain':
            if (!val) return 'Subdomain is required.';
            if (!SUBDOMAIN_RE.test(val)) return 'Subdomain must be 3–40 lowercase letters, numbers, or hyphens.';
            if (extraContext.subdomainStatus === 'taken') return 'This subdomain is already taken.';
            if (extraContext.subdomainStatus === 'checking') return 'Checking subdomain availability…';
            return null;

        case 'address_line1':
            if (!val) return 'Street address is required.';
            return null;

        case 'address_city':
            if (!val) return 'City is required.';
            return null;

        case 'primary_contact_name':
            if (!val) return 'Contact name is required.';
            if (!NAME_RE.test(val)) return 'Enter a valid contact name (at least 3 letters).';
            return null;

        case 'primary_contact_email':
            if (!val) return 'Contact email is required.';
            if (!EMAIL_RE.test(val)) return 'Enter a valid email address.';
            return null;

        case 'primary_contact_phone': {
            if (!val) return 'Enter a valid phone number.';
            const digits = getDigits(val);
            if (digits.length < 8 || digits.length > 16) {
                return 'Enter a valid phone number.';
            }
            return null;
        }

        case 'requested_disciplines':
            if (!Array.isArray(value) || value.length === 0) {
                return 'Please select at least one healthcare discipline.';
            }
            return null;

        case 'license_number':
            if (!val) return 'License number is required.';
            if (!LICENSE_RE.test(val)) return 'Enter a valid license number (at least 3 characters).';
            return null;

        case 'licensing_body':
            if (!val) return 'Licensing body / regulatory college is required.';
            return null;

        case 'license_document':
            if (!value) return 'Please upload your license or registration document.';
            return null;

        case 'plan_tier':
            if (!value) return 'Please select a plan to continue.';
            return null;

        default:
            return null;
    }
}

/**
 * Step validation map that evaluates whether all fields in a given step are valid.
 */
export function validateStep(stepIndex, data, extraContext = {}) {
    const errors = {};
    let isValid = true;

    const check = (fieldName) => {
        const err = validateField(fieldName, data[fieldName], data, extraContext);
        if (err) {
            errors[fieldName] = err;
            isValid = false;
        }
    };

    switch (stepIndex) {
        case 0: // Account
            check('name');
            check('email');
            check('password');
            check('password_confirmation');
            break;

        case 1: // Clinic
            check('clinic_name');
            check('subdomain');
            check('address_line1');
            check('address_city');
            break;

        case 2: // Contact
            check('primary_contact_name');
            check('primary_contact_email');
            check('primary_contact_phone');
            break;

        case 3: // Disciplines
            check('requested_disciplines');
            break;

        case 4: // License
            check('license_number');
            check('licensing_body');
            check('license_document');
            break;

        case 5: // Plan
            check('plan_tier');
            break;

        case 6: // Payment
            // Payment handles its own internal validation
            return { isValid: true, errors: {} };

        default:
            return { isValid: false, errors: {} };
    }

    return { isValid, errors };
}
