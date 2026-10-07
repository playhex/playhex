import { ImportUserError } from '../errors.js';
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';
import { isLittleGolemHsgf, LittleGolemGameNotFinishedError, parseLittleGolemHsgf } from '../../little-golem/littleGolemHsgf.js';

/**
 * Import from Little Golem's ".hsgf" SGF export format.
 *
 * Example: "(;FF[4]EV[hex.ch.32.2.1]PB[Bill LeBoeuf]PW[bennok]SZ[13]RE[B];W[am];B[ii];W[de];...;B[resign])"
 */
export class LittleGolemSGF implements ImporterHandlerInterface
{
    supports(source: string): boolean
    {
        return isLittleGolemHsgf(source);
    }

    shouldFetchFromBackend(): boolean
    {
        return false;
    }

    async import(source: string): Promise<ImportedGame>
    {
        try {
            const { boardsize, moves, player0Name, player1Name } = parseLittleGolemHsgf(source);

            return await Promise.resolve({
                boardsize,
                moves,
                playerBlackName: player0Name,
                playerWhiteName: player1Name,
            });
        } catch (e) {
            if (e instanceof LittleGolemGameNotFinishedError) {
                throw new ImportUserError(e.message);
            }

            throw e;
        }
    }
}
