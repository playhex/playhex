import { ImportedGame } from './types.js';

export interface HexGameImporterInterface
{
    import(source: string): Promise<ImportedGame>;
}
