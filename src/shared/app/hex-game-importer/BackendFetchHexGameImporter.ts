import { HexGameImporterInterface } from './HexGameImporterInterface.js';
import { ImportedGame } from './types.js';

/**
 * Used as customFetchStrategy by the client-side hexGameImporter:
 * delegates import to the backend, which does the actual fetch
 * (e.g to call a remote api with no CORS allowed, or to use server-only data).
 */
export class BackendFetchHexGameImporter implements HexGameImporterInterface
{
    async import(source: string): Promise<ImportedGame>
    {
        const response = await fetch('/api/hex-game-importer/import', {
            method: 'post',
            body: JSON.stringify({ source }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const text = await response.text();
            let message = text;

            try {
                message = JSON.parse(text).message ?? text;
            } catch {
                // not a json response, keep raw text as message
            }

            throw new Error(message);
        }

        return await response.json();
    }
}
