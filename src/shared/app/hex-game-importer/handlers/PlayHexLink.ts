import { HexMove } from '../../../move-notation/hex-move-notation.js';
import { ImportUserError } from '../errors.js';
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const SOURCE_PATTERN = new RegExp(`^(?:https?:\\/\\/[^/]+\\/games\\/)?(${UUID_PATTERN})\\/?$`, 'i');

type GamesApiResponse = {
    boardsize: number;
    moves: HexMove[];
    state: 'created' | 'canceled' | 'playing' | 'ended';

    /**
     * Always sorted by player order (see HostedGame's @AfterLoad sort hook),
     * so index 0 is black (order 0) and index 1 is white (order 1).
     * "order" itself is not exposed by the api.
     */
    hostedGameToPlayers: { player: { pseudo: string } }[];
};

/**
 * Import from a PlayHex game url or id. Examples:
 * - 0d1f8e8c-3000-49ff-831a-84c20e514528
 * - https://playhex.org/games/0d1f8e8c-3000-49ff-831a-84c20e514528
 * - http://localhost:3000/games/0d1f8e8c-3000-49ff-831a-84c20e514528
 */
export class PlayHexLink implements ImporterHandlerInterface
{
    constructor(
        /**
         * Prepended to "/api/games/...".
         * Must be an absolute url when this handler is used server-side (e.g "http://localhost:3000"),
         * can stay empty (relative url) when used client-side.
         */
        private apiBaseUrl: string = '',
    ) {}

    supports(source: string): boolean
    {
        return this.parseGameId(source) !== null;
    }

    shouldFetchFromBackend(): boolean
    {
        return true;
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
            throw new Error('Could not extract game id from PlayHex url');
        }

        const response = await fetch(`${this.apiBaseUrl}/api/games/${gameId}`);

        if (response.status === 404) {
            throw new ImportUserError('PlayHex game not found');
        }

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const game: GamesApiResponse = await response.json();

        if (game.state !== 'ended' && game.state !== 'canceled') {
            throw new ImportUserError('Cannot import a game that is not finished');
        }

        return {
            boardsize: game.boardsize,
            moves: game.moves,
            playerBlackName: game.hostedGameToPlayers[0]?.player.pseudo,
            playerWhiteName: game.hostedGameToPlayers[1]?.player.pseudo,
        };
    }
}
