import { ImportUserError } from '../errors.js';
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';
import { AbstractPlayState, parseAbstractPlayBoardsize, parseAbstractPlayMoves } from '../services/abstractPlayUtils.js';

const apiUrl = 'https://7n1lziet28.execute-api.us-east-1.amazonaws.com/prod/query';

type AbstractPlayGameResponse = {
    game: {
        players: {
            name: string;
        }[];
        variants: string[];
        state: string;
    };
};

/**
 * Import from an Abstract Play game url. Example:
 * - https://play.abstractplay.com/move/hex/1/ea92a01f-3000-49ff-831a-84c20e514528?move=33
 */
export class AbstractPlay implements ImporterHandlerInterface
{
    supports(source: string): boolean
    {
        return source.includes('play.abstractplay.com');
    }

    shouldFetchFromBackend(): boolean
    {
        return false; // Remote has cors allowed
    }

    private parseGameId(source: string): null | string
    {
        if (!source.includes('/hex/')) {
            const match = source.match(/play\.abstractplay\.com\/move\/([a-z0-9\-]+)\//i);

            if (!match) {
                throw new ImportUserError(`This AbstractPlay url is not a game url.`);
            }

            const otherGame = match[1].replace(/(?:^|(?<=-))[a-z]/g, g => g[0].toUpperCase());

            throw new ImportUserError(`This AbstractPlay game is not a Hex game. You are on PlayHex.org, not Play${otherGame}.org :)`);
        }

        const match = source.match(/play\.abstractplay\.com\/move\/hex\/\d+\/([0-9a-f-]{36})/);

        return match ? match[1] : null;
    }

    async import(source: string): Promise<ImportedGame>
    {
        const gameId = this.parseGameId(source);

        if (!gameId) {
            throw new Error('Could not extract game id from Abstract Play url');
        }

        const url = `${apiUrl}?query=get_game&id=${gameId}&metaGame=hex&cbit=1`;
        const response = await fetch(url);
        const json = await response.json();

        if (typeof json.message === 'string' && json.message.includes('completed bit 1')) {
            throw new ImportUserError('Cannot import an Abstract Play game that is still in progress (cbit)');
        }

        const { game }: AbstractPlayGameResponse = json;
        const state: AbstractPlayState = JSON.parse(game.state);

        return {
            boardsize: parseAbstractPlayBoardsize(state.variants),
            moves: parseAbstractPlayMoves(state),
            playerBlackName: game.players[0].name ?? undefined,
            playerWhiteName: game.players[1].name ?? undefined,
        };
    }
}
