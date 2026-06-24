import { HexMove } from '../../../move-notation/hex-move-notation.js';
import { parseMove } from '../../../move-notation/move-notation.js';
import { sgfFromString } from '../../../sgf/index.js';
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';

/**
 * Import from SGF content.
 * Example: "(;FF[4]...;B[f3]BL[605];W[swap-pieces];B[d4]...)"
 */
export class SGF implements ImporterHandlerInterface
{
    supports(source: string): boolean
    {
        return source.match(/\s*\(\s*;/) !== null; // starts with (;
    }

    shouldFetchFromBackend(): boolean
    {
        return false;
    }

    import(source: string): Promise<ImportedGame>
    {
        const sgf = sgfFromString(source);
        const moves: HexMove[] = [];

        let currentPlayer: 'B' | 'W' = 'B';
        let maxSize = 1; // fallback in case SZ is not in sgf

        for (const move of sgf.moves ?? []) {
            if (!move[currentPlayer]) {
                continue;
            }

            const m = move[currentPlayer] as HexMove;
            moves.push(m);
            currentPlayer = currentPlayer === 'B' ? 'W' : 'B';

            if (m !== 'pass' && m !== 'swap-pieces') {
                const { row, col } = parseMove(m);
                maxSize = Math.max(maxSize, row + 1, col + 1);
            }
        }

        return Promise.resolve({
            boardsize: this.parseSgfSZ(sgf.SZ) ?? maxSize,
            moves,
            playerBlackName: sgf.PB ?? undefined,
            playerWhiteName: sgf.PW ?? undefined,
        });
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
