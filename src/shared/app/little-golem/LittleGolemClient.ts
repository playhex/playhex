import { LITTLE_GOLEM_BASE_URL } from './littleGolemUtils.js';

/**
 * Wait between two requests to Little Golem, to not overload it.
 */
const DELAY_BETWEEN_REQUESTS = 1000;

const TIMEOUT = 15000;

const USER_AGENT = 'PlayHex games importer (https://playhex.org)';

export class LittleGolemFetchError extends Error {}

/**
 * Fetch pages from Little Golem.
 * All requests made through a same instance are queued and sent one by one, slowly,
 * so use the shared instance `littleGolemClient` to throttle all imports together.
 *
 * Little Golem does not allow CORS: only use it from the server.
 */
export default class LittleGolemClient
{
    private queue: Promise<unknown> = Promise.resolve();

    fetchPlayerList(pseudo: string): Promise<string>
    {
        return this.fetchText(`/jsp/info/player_list.jsp?gtvar=hex_DEFAULT&filter=${encodeURIComponent(pseudo)}`);
    }

    fetchPlayerPage(plid: number): Promise<string>
    {
        return this.fetchText(`/jsp/info/player.jsp?plid=${plid}`);
    }

    fetchPlayerGameList(plid: number): Promise<string>
    {
        return this.fetchText(`/jsp/info/player_game_list.jsp?gtid=hex&plid=${plid}`);
    }

    fetchGamePage(gid: number): Promise<string>
    {
        return this.fetchText(`/jsp/game/game.jsp?gid=${gid}`);
    }

    fetchGameHsgf(gid: number): Promise<string>
    {
        return this.fetchText(`/servlet/sgf/${gid}/game${gid}.hsgf`);
    }

    /**
     * @throws {LittleGolemFetchError}
     */
    private fetchText(path: string): Promise<string>
    {
        const request = this.queue
            .catch(() => {})
            .then(() => this.doFetchText(path))
        ;

        this.queue = request
            .catch(() => {})
            .then(() => new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS)))
        ;

        return request;
    }

    private async doFetchText(path: string): Promise<string>
    {
        let response: Response;

        try {
            response = await fetch(LITTLE_GOLEM_BASE_URL + path, {
                headers: { 'User-Agent': USER_AGENT },
                signal: AbortSignal.timeout(TIMEOUT),
            });
        } catch (e) {
            throw new LittleGolemFetchError(`Could not fetch Little Golem: ${(e as Error)?.message}`);
        }

        if (!response.ok) {
            throw new LittleGolemFetchError(`Little Golem responded ${response.status} for ${path}`);
        }

        return await response.text();
    }
}

export const littleGolemClient = new LittleGolemClient();
