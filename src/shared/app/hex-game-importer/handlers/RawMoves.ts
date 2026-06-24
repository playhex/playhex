import { HexMove, isMoveValid, isSpecialHexMove } from '../../../move-notation/hex-move-notation.js';
import { parseMove } from '../../../move-notation/move-notation.js';
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';

const DEFAULT_BOARDSIZE = 11;

const MOVE_TOKEN = /[a-z]+\d+|swap-pieces|pass/gi;

/**
 * Import from a raw list of moves. Examples:
 * - "a5 swap-pieces d4 f7"
 * - "a5d7f3i13"
 * - " a4 d5 \n g7 h12 "
 */
export class RawMoves implements ImporterHandlerInterface
{
    supports(source: string): boolean
    {
        return this.parseMoves(source) !== null;
    }

    shouldFetchFromBackend(): boolean
    {
        return false;
    }

    /**
     * Returns parsed moves, or null if source is not made of moves only
     * (e.g there is leftover content once moves are extracted,
     * meaning it is likely a different format, like a HexWorld string).
     */
    private parseMoves(source: string): null | HexMove[]
    {
        const trimmed = source.trim();

        if (!trimmed) {
            return null;
        }

        const tokens = trimmed.match(MOVE_TOKEN);

        if (!tokens) {
            return null;
        }

        const leftover = trimmed.replace(MOVE_TOKEN, '').replace(/\s+/g, '');

        if (leftover.length > 0) {
            return null;
        }

        const moves = tokens.map(token => token.toLowerCase());

        if (!moves.every(isMoveValid)) {
            return null;
        }

        return moves;
    }

    import(source: string): Promise<ImportedGame>
    {
        const moves = this.parseMoves(source) ?? [];

        let boardsize = DEFAULT_BOARDSIZE;

        for (const move of moves) {
            if (isSpecialHexMove(move)) {
                continue;
            }

            const { row, col } = parseMove(move);
            boardsize = Math.max(boardsize, row + 1, col + 1);
        }

        return Promise.resolve({
            boardsize,
            moves,
        });
    }
}
