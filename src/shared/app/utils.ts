// Global utils functions

/**
 * For .sort() function, sort by a given field only.
 * Ex:
 *
 * list.sort(by(item => item.field));
 */
export const by = <T>(field: (t: T) => string | number, ascOrDesc: 'asc' | 'desc' = 'asc') => {
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

/**
 * When catching, allow to log error as string, depending on its type (Error, string, ...).
 *
 * try { }
 * catch (e) { log(anyErrorToString(e)) }
 */
export const errorToString = (e: unknown): string => {
    if (e instanceof Error) {
        return e.message;
    }

    return String(e);
};

/**
 * Returns an object of params that can be sent to logger parameters.
 *
 * Example:
 *
 * ```
 * logger.error('Failed to ...', errorToLogger(e));
 *
 * // or
 *
 * logger.error('Failed to ...', {
 *     ...errorToLogger(e),
 *     otherParam: 'xxx',
 * });
 * ```
 */
export const errorToLogger = (e: unknown): { message: string, stacktrace: string } => {
    if (e instanceof Error) {
        return {
            message: e.message,
            stacktrace: e.stack ?? 'No stack trace in this Error',
        };
    }

    return {
        message: String(e),
        stacktrace: 'No stack trace because not an Error instance',
    };
};

/**
 * Get a random number around mean given a standard deviation.
 */
export const gaussianRandom = (mean = 0, deviation = 1): number => {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);

    // Transform to the desired mean and standard deviation:
    return z * deviation + mean;
};
