import { LittleGolemGameNotFinishedError } from './littleGolemHsgf.js';
import { LITTLE_GOLEM_API_URL, LITTLE_GOLEM_BASE_URL } from './littleGolemUtils.js';

/**
 * Wait between two requests to Little Golem, to not overload it.
 */
const DELAY_BETWEEN_REQUESTS = 1000;

const TIMEOUT = 15000;

const USER_AGENT = 'PlayHex games importer (https://playhex.org)';

/**
 * Max "limit" accepted by Little Golem api on paginated lists.
 */
const LITTLE_GOLEM_PAGE_SIZE = 100;

export class LittleGolemFetchError extends Error
{
    constructor(
        message: string,

        /**
         * Http status, if Little Golem responded.
         */
        public status: null | number = null,

        /**
         * Response body, if Little Golem responded.
         */
        public body: null | string = null,
    ) {
        super(message);
    }
}

/**
 * Fetch pages and api from Little Golem.
 * All requests made through a same instance are queued and sent one by one, slowly,
 * so use the shared instance `littleGolemClient` to throttle all imports together.
 *
 * Little Golem does not allow CORS: only use it from the server.
 */
export default class LittleGolemClient
{
    private queue: Promise<unknown> = Promise.resolve();

    /**
     * Html page of players search results, exact pseudos first, then most recently active.
     * Little Golem api requires authentication to search players, so use website instead.
     *
     * @throws {LittleGolemFetchError}
     */
    async searchPlayers(pseudo: string): Promise<string>
    {
        const html = await this.fetchText(`${LITTLE_GOLEM_BASE_URL}/web/players?search=${encodeURIComponent(pseudo)}`);

        // Responds 200 with only this text when rate limited
        if (/^\s*Too many page requests/i.test(html)) {
            throw new LittleGolemFetchError('Little Golem rate limited players search', 429, html);
        }

        return html;
    }

    /**
     * Json of player and his ratings in all games, null if this player does not exist.
     *
     * @throws {LittleGolemFetchError}
     */
    async fetchPlayerStats(plid: number): Promise<null | string>
    {
        try {
            return await this.fetchText(`${LITTLE_GOLEM_API_URL}/stats/playergamesstats/${plid}`);
        } catch (e) {
            // Responds 500 {"name":"fault","message":"sql: no rows in result set",...} for unknown plid
            if (e instanceof LittleGolemFetchError && (e.status === 404 || (e.status === 500 && e.body?.includes('no rows')))) {
                return null;
            }

            throw e;
        }
    }

    /**
     * Json of a page of player's hex games (all hex variants), most recent first,
     * containing both finished and running games.
     * Response: {"games":[{"gid":2424182,"status":1,"finished_at":1713273230085,...}],"total":772,"has_more":true}
     *
     * @throws {LittleGolemFetchError}
     */
    fetchPlayerGames(plid: number, offset: number): Promise<string>
    {
        return this.fetchText(`${LITTLE_GOLEM_API_URL}/players/${plid}/games?gtype=hex&offset=${offset}&limit=${LITTLE_GOLEM_PAGE_SIZE}`);
    }

    /**
     * Json of game players, ratings, moves with timestamps, status...
     *
     * @throws {LittleGolemFetchError}
     */
    fetchGameDetail(gid: number): Promise<string>
    {
        return this.fetchText(`${LITTLE_GOLEM_API_URL}/games/gamedetail/${gid}`);
    }

    /**
     * @throws {LittleGolemGameNotFinishedError} Little Golem only exports finished games
     * @throws {LittleGolemFetchError}
     */
    async fetchGameHsgf(gid: number): Promise<string>
    {
        try {
            return await this.fetchText(`${LITTLE_GOLEM_API_URL}/gameexport/${gid}`);
        } catch (e) {
            // Responds 422 {"name":"GameExportUnsupported","message":"game download is available only after the game has finished"}
            if (e instanceof LittleGolemFetchError && e.status === 422) {
                throw new LittleGolemGameNotFinishedError();
            }

            throw e;
        }
    }

    /**
     * @throws {LittleGolemFetchError}
     */
    private fetchText(url: string): Promise<string>
    {
        const request = this.queue
            .catch(() => {})
            .then(() => this.doFetchText(url))
        ;

        this.queue = request
            .catch(() => {})
            .then(() => new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS)))
        ;

        return request;
    }

    private async doFetchText(url: string): Promise<string>
    {
        let response: Response;
        let body: string;

        try {
            response = await fetch(url, {
                headers: { 'User-Agent': USER_AGENT },
                signal: AbortSignal.timeout(TIMEOUT),
            });

            body = await response.text();
        } catch (e) {
            throw new LittleGolemFetchError(`Could not fetch Little Golem: ${(e as Error)?.message}`);
        }

        if (!response.ok) {
            throw new LittleGolemFetchError(`Little Golem responded ${response.status} for ${url}`, response.status, body.substring(0, 1000));
        }

        return body;
    }
}

export const littleGolemClient = new LittleGolemClient();
