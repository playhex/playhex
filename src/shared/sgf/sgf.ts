import type { SGF, SGFMove, SGFProperty } from './types.js';

/*
 * SGF docs:
 *  - home: https://www.red-bean.com/sgf/index.html
 *  - all properties: https://www.red-bean.com/sgf/properties.html
 *  - variations: https://www.red-bean.com/sgf/var.html
 */

/**
 * Escape sgf values inside "[...]".
 *
 * Must escape: `]`, `\`.
 * And `:` for composed values.
 *
 * https://www.red-bean.com/sgf/sgf4.html#text
 */
const escapeSgfValue = (value: unknown): unknown => {
    if (typeof value !== 'string') {
        return value;
    }

    return value.replace(/[\]\\]/g, '\\$&');
};

/**
 * Write down given object properties in given order to SGF style
 * Example:
 *
 * `write({ FF: 4, GM: 11, SZ: 14 }, ['SZ', 'GM'])`
 *      output: `SZ[14]GM[11]`
 */
const write = <T extends (SGF & SGFMove)>(sgf: T, properties: (keyof T)[]): string => {
    return properties
        .map((property: SGFProperty) => {
            if (undefined === sgf[property] || sgf[property] === null) {
                return '';
            }

            return `${String(property)}[${escapeSgfValue(sgf[property])}]`;
        })
        .join('')
    ;
};

/**
 * Render root node properties, i.e `FF[4]GM[11]...`
 */
const writeRoot = (sgf: SGF): string => {
    return write(sgf, [
        // SGF info
        'FF', 'CA',

        // Game info
        'AP', 'SO', 'PC', 'GM', 'SZ', 'RU',

        // Players names and ratings
        'PB', 'BR', 'PW', 'WR',

        // Game details
        'DT', 'HA', 'RE', 'PL',

        // Time control
        'TM', 'OT', 'LC', 'LT',

        // Game event
        'EV', 'RO',

        // Root node info
        'N', 'GC', 'C',
    ]);
};

/**
 * Render single move node properties, i.e `B[a1]C[comment]`
 */
const writeNode = (sgfMove: SGFMove): string => {
    return write(sgfMove, [
        // Move
        'B', 'W',

        // Time control values
        'BL', 'WL', 'OB', 'OW',

        // Node name and comment
        'N', 'C',
    ]);
};

/**
 * Renders either `;B[a1]...`
 * or `(;B[a1]...)(...)` if there is a variation.
 */
export const writeNodesRecursive = (sgfMoves: SGFMove[], variations: SGFMove[][] = []): string => {
    let output = '';

    if (sgfMoves.length > 0) {
        const node = sgfMoves[0];
        const variations = node.variations ?? [];

        output += ';' + writeNode(node);
        output += writeNodesRecursive(sgfMoves.slice(1), variations);

        if (variations.length > 0) {
            output = '(' + output + ')';
        }
    }

    if (variations.length > 0) {
        output += ')(' + writeNodesRecursive(variations[0], variations.slice(1));
    }

    return output;
};

export const sgfToString = (sgf: SGF): string => {
    let output = '(;' + writeRoot(sgf);

    if (!sgf.moves) {
        return output + ')';
    }

    output += writeNodesRecursive(sgf.moves) + ')';

    return output;
};
