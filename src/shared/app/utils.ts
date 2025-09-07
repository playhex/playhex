// Global utils functions

/**
 * For .sort() function, sort by a given field only.
 * Ex:
 *
 * list.sort(by(item => item.field));
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const by = <T>(field: (t: T) => any, ascOrDesc: 'asc' | 'desc' = 'asc') => {
    return (a: T, b: T) => {
        const aValue = field(a);
        const bValue = field(b);

        if (ascOrDesc === 'desc') {
            return aValue < bValue ? 1 : -1;
        }

        return aValue > bValue ? 1 : -1;
    };
};

/**
 * Truncate text and add "…" if needed.
 */
export const truncateText = (text: string, maxLength = 24): string => {
    if (text.length <= maxLength) {
        return text;
    }

    return text.substring(0, maxLength) + '…';
};

/**
 * Used to type check type orm @Index.
 * Usage:
 * ```
 *   @Index(keysOf<HostedGame>()('state', 'opponentType'))
 * ```
 */
export const keysOf = <T>() => <K extends keyof T>(...keys: K[]) => keys;
