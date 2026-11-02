import { ImportUserError } from '../errors.js';
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';
import { LittleGolemSGF } from './LittleGolemSGF.js';
import { LittleGolemGameNotFinishedError } from '../../little-golem/littleGolemHsgf.js';
import LittleGolemClient, { LittleGolemFetchError, littleGolemClient as sharedLittleGolemClient } from '../../little-golem/LittleGolemClient.js';

/**
 * Little Golem urls containing a game id (gid), followed by the gid.
 */
const SOURCE_PATTERNS: RegExp[] = [
    // Website: https://www.littlegolem.net/web/game?id=2566487
    /littlegolem\.net\/web\/(?:game|play)\?(?:[^#\s]*&)?id=(\d+)/i,

    // App: https://www.littlegolem.net/app/#/game/daily/2566487
    // also "#/games/game/<gid>", "#/web-replay/<gid>?move=23", "#/tournament/<trnid>/game/<gid>", "#/player/<plid>/stats/hex/DEFAULT/game/<gid>"
    /littlegolem\.net\/app\/#\/(?:game\/daily|games\/game|web-replay|tournament\/[^/\s]+\/game|player\/\d+\/stats\/[^/\s]+\/[^/\s]+\/game)\/(\d+)/i,

    // Download link: https://api.littlegolem.net/gameexport/2566487
    /api\.littlegolem\.net\/gameexport\/(\d+)/i,

    // Old website, links still found e.g in forums: https://littlegolem.net/jsp/game/game.jsp?gid=1512976&nmove=27
    /littlegolem\.net\/jsp\/game\/game\.jsp\?(?:[^#\s]*&)?gid=(\d+)/i,
];

/**
 * "https://www.littlegolem.net/web/game?id=2566487" => 2566487
 * See SOURCE_PATTERNS for all supported urls.
 * Null if source is not a Little Golem game url.
 */
export const parseLittleGolemGameId = (source: string): null | number => {
    const trimmed = source.trim();

    for (const pattern of SOURCE_PATTERNS) {
        const match = trimmed.match(pattern);

        if (match) {
            return parseInt(match[1], 10);
        }
    }

    return null;
};

/**
 * Import from a Little Golem game url. Examples:
 * - https://www.littlegolem.net/web/game?id=2566487
 * - https://www.littlegolem.net/app/#/game/daily/2566487
 * - https://littlegolem.net/jsp/game/game.jsp?gid=1512976&nmove=27 (old website)
 *
 * Downloads the game's ".hsgf" export from Little Golem, then reuses LittleGolemSGF to parse it.
 * Little Golem only exports finished games.
 */
export class LittleGolemLink implements ImporterHandlerInterface
{
    constructor(
        private littleGolemClient: LittleGolemClient = sharedLittleGolemClient,
    ) {}

    supports(source: string): boolean
    {
        return parseLittleGolemGameId(source) !== null;
    }

    shouldFetchFromBackend(): boolean
    {
        return true; // Little Golem does not allow CORS
    }

    async import(source: string): Promise<ImportedGame>
    {
        const gameId = parseLittleGolemGameId(source);

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

            if (e instanceof LittleGolemGameNotFinishedError) {
                throw new ImportUserError(e.message);
            }

            throw e;
        }

        return new LittleGolemSGF().import(hsgf);
    }
}
