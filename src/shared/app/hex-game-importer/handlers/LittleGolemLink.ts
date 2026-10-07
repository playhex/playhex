import { ImportUserError } from '../errors.js';
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';
import { LittleGolemSGF } from './LittleGolemSGF.js';
import LittleGolemClient, { LittleGolemFetchError, littleGolemClient as sharedLittleGolemClient } from '../../little-golem/LittleGolemClient.js';

const SOURCE_PATTERN = /littlegolem\.net\/jsp\/game\/game\.jsp\?gid=(\d+)/i;

/**
 * Import from a Little Golem game url. Example:
 * - https://littlegolem.net/jsp/game/game.jsp?gid=1512976&nmove=27
 *
 * Downloads the game's ".hsgf" export from Little Golem, then reuses LittleGolemSGF to parse it.
 */
export class LittleGolemLink implements ImporterHandlerInterface
{
    constructor(
        private littleGolemClient: LittleGolemClient = sharedLittleGolemClient,
    ) {}

    supports(source: string): boolean
    {
        return this.parseGameId(source) !== null;
    }

    shouldFetchFromBackend(): boolean
    {
        return true; // Little Golem does not allow CORS
    }

    private parseGameId(source: string): null | number
    {
        const match = source.trim().match(SOURCE_PATTERN);

        return match ? parseInt(match[1], 10) : null;
    }

    async import(source: string): Promise<ImportedGame>
    {
        const gameId = this.parseGameId(source);

        if (!gameId) {
            throw new Error('Could not extract game id from Little Golem url');
        }

        let hsgf: string;

        try {
            hsgf = await this.littleGolemClient.fetchGameHsgf(gameId);
        } catch (e) {
            if (e instanceof LittleGolemFetchError) {
                throw new ImportUserError('Could not download Little Golem game');
            }

            throw e;
        }

        return new LittleGolemSGF().import(hsgf);
    }
}
