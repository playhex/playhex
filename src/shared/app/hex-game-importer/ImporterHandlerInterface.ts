import { HexGameImporterInterface } from './HexGameImporterInterface.js';
import { ImportedGame } from './types.js';

export interface ImporterHandlerInterface extends HexGameImporterInterface
{
    /**
     * Whether this importer can handle this source.
     */
    supports(source: string): boolean;

    /**
     * Whether a fetch from backend is required.
     * If true, it may use a proxy to import game because of CORS.
     * If false, import() can be done locally.
     */
    shouldFetchFromBackend(): boolean;

    /**
     * Do the import.
     */
    import(source: string): Promise<ImportedGame>;
}
