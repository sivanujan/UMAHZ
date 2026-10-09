/**
 * Extract first name, skipping common professional and personal titles.
 * E.g.: "Dr. Astrogen Owner" -> "Astrogen"
 *       "Prof. Julian Hayes" -> "Julian"
 *       "Mr. John Doe" -> "John"
 *       "Sarah Connor" -> "Sarah"
 */
export function getFirstName(name, fallback = 'Doctor') {
    if (!name || typeof name !== 'string') {
        return fallback;
    }

    const parts = name.trim().split(/\s+/);
    if (!parts.length || !parts[0]) {
        return fallback;
    }

    const titles = new Set([
        'dr.', 'dr',
        'mr.', 'mr',
        'mrs.', 'mrs',
        'ms.', 'ms',
        'miss',
        'prof.', 'prof',
        'rev.', 'rev',
    ]);

    const firstName = parts.find((part) => !titles.has(part.toLowerCase()));

    return firstName || parts[0] || fallback;
}

export function getAvatarInitial(name, fallback = 'U') {
    const first = getFirstName(name, '');
    if (first && first.length > 0) {
        return first.charAt(0).toUpperCase();
    }
    if (name && typeof name === 'string' && name.trim().length > 0) {
        return name.trim().charAt(0).toUpperCase();
    }
    return fallback;
}

export default getFirstName;

