export const WHO_NONE = 0;
export const WHO_RED = 1;
export const WHO_BLUE = 2;

export const sign = (xx) => {
    if (xx < 0) return (-1);
    if (xx > 0) return (1);
    return (0);
};

/**
 * Converts "a1" to [0, 0]
 *
 * @param {String} moveStr E.g "a1"
 *
 * @returns {[Number, Number]} E.g [0, 0]
 */
export const parseMove = (moveStr) => {
    const matches = moveStr.match(/^([a-z])(\d+)$/);

    if (!matches) {
        throw new Error('Expected move like "a1", got: ' + moveStr);
    }

    const [_, letterStr, numberStr] = matches;

    return [
        letterStr.charCodeAt(0) - 97,
        parseInt(numberStr, 10) - 1,
    ];
};

/**
 * Converts (0, 0) to "a1"
 *
 * @param {[Number, Number]} ij
 *
 * @returns {String} E.g "a1"
 */
export const moveToString = ([i, j]) => {
    return String.fromCharCode(i + 97) + (j + 1);
};
