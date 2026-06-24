import { SourceNotSupportedError } from './errors.js';
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

    async import(source: string): Promise<ImportedGame>
    {
        for (const handler of this.handlers) {
            if (!handler.supports(source)) {
                continue;
            }

            if (handler.shouldFetchFromBackend() && this.customFetchStrategy) {
                return await this.customFetchStrategy.import(source);
            }

            return await handler.import(source);
        }

        throw new SourceNotSupportedError(source);
    }
}
