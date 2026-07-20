import { HexMove } from '../../../move-notation/hex-move-notation.js';
import { Coords, coordsToMove } from '../../../move-notation/move-notation.js';
import { sgfFromString } from '../../../sgf/index.js';
import { ImportUserError } from '../errors.js';
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';

/**
 * Import from Little Golem's ".hsgf" SGF export format.
 * Unlike the regular SGF importer, coordinates are Go-style two letters (column then row,
 * both 0-indexed), e.g "ii", instead of Hex's own letter+number notation, e.g "i9".
 * Also uses "swap" instead of "swap-pieces" for the pie rule move.
 *
 * Example: "(;FF[4]EV[hex.ch.32.2.1]PB[Bill LeBoeuf]PW[bennok]SZ[13]RE[B];W[am];B[ii];W[de];...;B[resign])"
 */
export class LittleGolemSGF implements ImporterHandlerInterface
{
    supports(source: string): boolean
    {
        // Starts like a SGF, and has at least one move written with Little Golem's
        // two-letter-only coords (e.g "B[ii]"), which never happens in Hex's own SGF notation
        // (Hex moves always end with a digit, e.g "B[f3]" or "B[am12]").
        return /\s*\(\s*;/.test(source)
            && /;\s*[BW]\s*\[[a-z]{2}\]/.test(source)
        ;
    }

    shouldFetchFromBackend(): boolean
    {
        return false;
    }

    async import(source: string): Promise<ImportedGame>
    {
        const sgf = sgfFromString(source);

        // RE (result) is only set by Little Golem once the game is over,
        // so its absence means the game is still in progress.
        if (!sgf.RE) {
            throw new ImportUserError('Cannot import a Little Golem game that is not finished');
        }

        const moves: HexMove[] = [];

        let maxSize = 1; // fallback in case SZ is not in sgf

        for (const move of sgf.moves ?? []) {
            // Little Golem hex records can start with either color,
            // so read whichever of B/W is actually set on this node.
            const value = (move.B ?? move.W) as undefined | string;

            if (value === undefined) {
                continue;
            }

            if (value === 'resign') {
                break; // resignation is not a move, end of the move list
            }

            if (value === 'swap') {
                moves.push('swap-pieces');
                continue;
            }

            const coords = this.parseCoords(value);

            moves.push(coordsToMove(coords));
            maxSize = Math.max(maxSize, coords.row + 1, coords.col + 1);
        }

        return Promise.resolve({
            boardsize: this.parseSgfSZ(sgf.SZ) ?? maxSize,
            moves,
            playerBlackName: sgf.PB ?? undefined,
            playerWhiteName: sgf.PW ?? undefined,
        });
    }

    /**
     * Little Golem coords are two lowercase letters, column then row, both 0-indexed ("aa" is top-left).
     */
    private parseCoords(value: string): Coords
    {
        const match = value.match(/^([a-z])([a-z])$/);

        if (!match) {
            throw new Error(`Invalid Little Golem SGF move coords: "${value}"`);
        }

        const [, colLetter, rowLetter] = match;

        return {
            col: colLetter.charCodeAt(0) - 97,
            row: rowLetter.charCodeAt(0) - 97,
        };
    }

    private parseSgfSZ(SZ: undefined | number | string): undefined | number
    {
        if (typeof SZ === 'number' || typeof SZ === 'undefined') {
            return SZ;
        }

        const parsed = SZ.match(/\d+/);

        if (parsed) {
            return parseInt(parsed[0], 10);
        }

        return undefined;
    }
}
