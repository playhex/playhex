/* eslint-disable @typescript-eslint/no-unused-vars */
import { ImporterHandlerInterface } from '../ImporterHandlerInterface.js';
import { ImportedGame } from '../types.js';

/**
 * Default handler that returns empty game.
 */
export class NoopHandler implements ImporterHandlerInterface
{
    supports(source: string): boolean
    {
        return true;
    }

    shouldFetchFromBackend(): boolean
    {
        return false;
    }

    import(source: string): Promise<ImportedGame>
    {
        return Promise.resolve({
            boardsize: 11,
            moves: [],
        });
    }
}
