import { ImportUserError } from '../errors.js';
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';
import { LittleGolemSGF } from './LittleGolemSGF.js';

const SOURCE_PATTERN = /littlegolem\.net\/jsp\/game\/game\.jsp\?gid=(\d+)/i;

/**
 * Import from a Little Golem game url. Example:
 * - https://littlegolem.net/jsp/game/game.jsp?gid=1512976&nmove=27
 *
 * Downloads the game's ".hsgf" export from Little Golem, then reuses LittleGolemSGF to parse it.
 */
export class LittleGolemLink implements ImporterHandlerInterface
{
    supports(source: string): boolean
    {
        return this.parseGameId(source) !== null;
    }

    shouldFetchFromBackend(): boolean
    {
        return true; // Little Golem does not allow CORS
    }

    private parseGameId(source: string): null | string
    {
        const match = source.trim().match(SOURCE_PATTERN);

        return match ? match[1] : null;
    }

    async import(source: string): Promise<ImportedGame>
    {
        const gameId = this.parseGameId(source);

        if (!gameId) {
            throw new Error('Could not extract game id from Little Golem url');
        }

        const url = `https://littlegolem.net/servlet/sgf/${gameId}/game${gameId}.hsgf`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new ImportUserError('Could not download Little Golem game');
        }

        const hsgf = await response.text();

        return new LittleGolemSGF().import(hsgf);
    }
}
