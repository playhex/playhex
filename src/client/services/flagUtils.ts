/**
 * Get flag emoji from a country code.
 * Example: 'FR' => '🇫🇷'
 */
export const countryCodeToFlag = (code: string): string => {
    return [...code.toUpperCase()] // FR
        .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)) // 🇫 🇷
        .join('') // 🇫🇷
    ;
};

/**
 * Returns flags suggestion from browser languages.
 * Example: 'en, en-US, fr, fr-FR' => 🇺🇸 🇫🇷
 */
export const getSuggestedFlags = (): string[] => {
    const flags: string[] = [];

    for (const lang of navigator.languages ?? []) {
        const parts = lang.split('-');

        if (parts.length >= 2) {
            const cc = parts[parts.length - 1].toUpperCase();

            if (cc.length === 2 && /^[A-Z]{2}$/.test(cc)) {
                const flag = countryCodeToFlag(cc);

                if (!flags.includes(flag)) {
                    flags.push(flag);
                }
            }
        }
    }

    return flags;
};
