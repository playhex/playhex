import { MAX_BOARDSIZE, MIN_BOARDSIZE, isValidBoardsize } from '../boardsizeLimits.js';
import { ImportUserError, SourceNotSupportedError } from './errors.js';
import { HexGameImporterInterface } from './HexGameImporterInterface.js';
import { ImporterHandlerInterface } from './ImporterHandlerInterface.js';
import { ImportedGame } from './types.js';

/**
 * Can import Hex game from any source.
 */
export class HexGameImporter implements HexGameImporterInterface
{
    constructor(
        /**
         * List of supported import handlers
         */
        private handlers: ImporterHandlerInterface[],

        /**
         * How to fetch if the source requires fetch:
         * - null: just do import
         * - HexGameImporterInterface: delegate to this importer instead (may use an api)
         */
        private customFetchStrategy: null | HexGameImporterInterface = null,
    ) {}

    /**
     * First handler which supports this source, the one import() would use.
     */
    findHandler(source: string): null | ImporterHandlerInterface
    {
        return this.handlers.find(handler => handler.supports(source)) ?? null;
    }

    /**
     * @throws {ImportUserError} If source is not supported, or game board size is not supported on PlayHex
     */
    async import(source: string): Promise<ImportedGame>
    {
        const handler = this.findHandler(source);

        if (handler === null) {
            throw new SourceNotSupportedError(source);
        }

        const importedGame = handler.shouldFetchFromBackend() && this.customFetchStrategy
            ? await this.customFetchStrategy.import(source)
            : await handler.import(source)
        ;

        // Board size comes from user input (SGF SZ, raw moves coords...), a huge one would allocate a huge board
        if (!isValidBoardsize(importedGame.boardsize)) {
            throw new ImportUserError(`Board size ${importedGame.boardsize} not supported, must be between ${MIN_BOARDSIZE} and ${MAX_BOARDSIZE}`);
        }

        return importedGame;
    }
}
