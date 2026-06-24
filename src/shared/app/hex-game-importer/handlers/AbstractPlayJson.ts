import { ImportUserError } from '../errors.js';
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';
import { AbstractPlayState, parseAbstractPlayBoardsize, parseAbstractPlayMoves } from '../services/abstractPlayUtils.js';

/**
 * Import from an Abstract Play game state, pasted as raw JSON.
 * We can copy this raw JSON by clicking on the bug icon below a game (debug).
 * Though this json does not contains player's names.
 * Example:
 * {"game":"hex","numplayers":2,"variants":["size-11"],"gameover":true,"winner":[2],"stack":[...]}
 */
export class AbstractPlayJson implements ImporterHandlerInterface
{
    supports(source: string): boolean
    {
        return this.parseState(source) !== null;
    }

    shouldFetchFromBackend(): boolean
    {
        return false;
    }

    private parseState(source: string): null | AbstractPlayState
    {
        let json: unknown;

        try {
            json = JSON.parse(source);
        } catch {
            return null;
        }

        if (
            json === null
            || typeof json !== 'object'
            || (json as AbstractPlayState).game !== 'hex'
            || !Array.isArray((json as AbstractPlayState).stack)
            || !Array.isArray((json as AbstractPlayState).variants)
        ) {
            return null;
        }

        return json as AbstractPlayState;
    }

    import(source: string): Promise<ImportedGame>
    {
        const state = this.parseState(source);

        if (!state) {
            throw new Error('Could not parse Abstract Play json');
        }

        if (!state.gameover) {
            throw new ImportUserError('Cannot import an Abstract Play game that is still in progress');
        }

        return Promise.resolve({
            boardsize: parseAbstractPlayBoardsize(state.variants),
            moves: parseAbstractPlayMoves(state),
        });
    }
}
