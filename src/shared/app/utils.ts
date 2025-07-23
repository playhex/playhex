// Global utils functions

/**
 * For .sort() function, sort by a given field only.
 * Ex:
 *
 * list.sort(by(item => item.field));
 */
export const by = <T>(field: (t: T) => number, ascOrDesc: 'asc' | 'desc' = 'asc') => {
    return (a: T, b: T) => {
        const aValue = field(a);
        const bValue = field(b);

        const diff = aValue - bValue;

        if ('desc' === ascOrDesc) {
            return -diff;
        }

        return diff;
    };
};
