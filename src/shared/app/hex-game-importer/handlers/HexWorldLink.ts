import { HexMove } from '../../../move-notation/hex-move-notation.js';
import { parseHexworldString } from '../../hexworld.js';
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';

/**
 * Import from HexWorld url. Examples:
 * - https://hexworld.org/board/#11r9c1,b4:sh4g8i8h3g4g3i3j1j3k1i2i1
 * - 11r9c1,b4:sh4g8i8h3g4g3i3j1j3k1i2i1
 */
export class HexWorldLink implements ImporterHandlerInterface
{
    supports(source: string): boolean
    {
        return source.includes('hexworld.org/board')
            || source.match(/\d+(r\d+)?(c\d)?,?/) !== null
        ;
    }

    shouldFetchFromBackend(): boolean
    {
        return false;
    }

    import(source: string): Promise<ImportedGame>
    {
        const hexworldString = source.split('#').pop();

        if (!hexworldString) {
            return Promise.resolve({
                boardsize: 11,
                moves: [],
            });
        }

        const parsed = parseHexworldString(hexworldString);

        return Promise.resolve({
            boardsize: parsed.size,
            moves: parsed.moves as HexMove[],
        });
    }
}
