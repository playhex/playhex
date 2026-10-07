import { Coords, coordsToMove, HexMove } from '@playhex/move-notation';
import { sgfFromString } from '../../sgf/index.js';

/**
 * Game parsed from a Little Golem ".hsgf" export.
 */
export type LittleGolemGame = {
    boardsize: number;
    moves: HexMove[];

    /**
     * PB, who played first.
     */
    player0Name?: string;

    /**
     * PW
     */
    player1Name?: string;

    /**
     * From RE. Null if RE is neither B or W.
     */
    winner: null | 0 | 1;

    /**
     * Whether game ended by a resignation.
     */
    resigned: boolean;

    /**
     * EV, Little Golem tournament, e.g "hex.ld.DEFAULT"
     */
    event?: string;
};

export class LittleGolemGameNotFinishedError extends Error
{
    constructor()
    {
        super('Cannot import a Little Golem game that is not finished');
    }
}

/**
 * Whether source looks like a Little Golem ".hsgf":
 * starts like a SGF, and has at least one move written with Little Golem's
 * two-letter-only coords (e.g "B[ii]"), which never happens in Hex's own SGF notation
 * (Hex moves always end with a digit, e.g "B[f3]" or "B[am12]").
 */
export const isLittleGolemHsgf = (source: string): boolean =>
    /\s*\(\s*;/.test(source)
    && /;\s*[BW]\s*\[[a-z]{2}\]/.test(source)
;

/**
 * Parse a Little Golem ".hsgf" export.
 *
 * Unlike the regular SGF, coordinates are Go-style two letters (column then row,
 * both 0-indexed), e.g "ii", instead of Hex's own letter+number notation, e.g "i9".
 * Also uses "swap" instead of "swap-pieces" for the pie rule move.
 *
 * Example: "(;FF[4]EV[hex.ch.32.2.1]PB[Bill LeBoeuf]PW[bennok]SZ[13]RE[B];W[am];B[ii];W[de];...;B[resign])"
 *
 * Little Golem labels the nodes "W" and "B" alternatively, always starting with "W",
 * and a "W" node is actually played by PB (who always plays first, red in PlayHex),
 * as observed on Little Golem game pages, connections and resignations.
 * So PB is player 0. Board orientation is the same as PlayHex:
 * first player connects first row to last row.
 *
 * RE is the color of the winner, PB or PW.
 *
 * @throws {LittleGolemGameNotFinishedError}
 */
export const parseLittleGolemHsgf = (hsgf: string): LittleGolemGame => {
    const sgf = sgfFromString(escapeValues(hsgf));

    // RE (result) is only set by Little Golem once the game is over,
    // so its absence means the game is still in progress.
    if (!sgf.RE) {
        throw new LittleGolemGameNotFinishedError();
    }

    const moves: HexMove[] = [];
    let resigned = false;

    let maxSize = 1; // fallback in case SZ is not in sgf

    for (const move of sgf.moves ?? []) {
        // Little Golem hex records can start with either color,
        // so read whichever of B/W is actually set on this node.
        const value = move.B ?? move.W;

        if (value === undefined) {
            continue;
        }

        if (value === 'resign') {
            resigned = true;
            break; // resignation is not a move, end of the move list
        }

        if (value === 'swap') {
            moves.push('swap-pieces');
            continue;
        }

        const coords = parseCoords(value);

        moves.push(coordsToMove(coords));
        maxSize = Math.max(maxSize, coords.row + 1, coords.col + 1);
    }

    let winner: null | 0 | 1 = null;

    if (/^B/i.test(sgf.RE)) {
        winner = 0;
    } else if (/^W/i.test(sgf.RE)) {
        winner = 1;
    }

    return {
        boardsize: parseSZ(sgf.SZ) ?? maxSize,
        moves,
        player0Name: sgf.PB ?? undefined,
        player1Name: sgf.PW ?? undefined,
        winner,
        resigned,
        // Little Golem may export EV[null]
        event: sgf.EV && sgf.EV.trim() !== '' && sgf.EV.trim() !== 'null' ? sgf.EV.trim() : undefined,
    };
};

/**
 * Little Golem does not escape property values,
 * e.g a player named "Shumacher;]" is exported as "PW[Shumacher;]]".
 * Escapes "\" and "]" inside values, assuming a "]" closes the value
 * only when followed by what can follow a value in SGF: another value, a property, a node, or end of game tree.
 */
const escapeValues = (source: string): string => {
    let escaped = '';
    let inValue = false;

    for (let i = 0; i < source.length; ++i) {
        const char = source[i];

        if (!inValue) {
            escaped += char;
            inValue = char === '[';
            continue;
        }

        if (char === ']' && /^\s*([[;()]|[A-Za-z]+\s*\[|$)/.test(source.substring(i + 1))) {
            escaped += char;
            inValue = false;
            continue;
        }

        escaped += char === ']' || char === '\\' ? '\\' + char : char;
    }

    return escaped;
};

/**
 * Little Golem coords are two lowercase letters, column then row, both 0-indexed ("aa" is top-left).
 */
const parseCoords = (value: string): Coords => {
    const match = value.match(/^([a-z])([a-z])$/);

    if (!match) {
        throw new Error(`Invalid Little Golem SGF move coords: "${value}"`);
    }

    const [, colLetter, rowLetter] = match;

    return {
        col: colLetter.charCodeAt(0) - 97,
        row: rowLetter.charCodeAt(0) - 97,
    };
};

const parseSZ = (SZ: undefined | number | string): undefined | number => {
    if (typeof SZ === 'number' || typeof SZ === 'undefined') {
        return SZ;
    }

    const parsed = SZ.match(/\d+/);

    if (parsed) {
        return parseInt(parsed[0], 10);
    }

    return undefined;
};
