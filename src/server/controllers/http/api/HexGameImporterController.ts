import { Body, HttpError, JsonController, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { hexGameImporter } from '../../../services/hexGameImporter.js';
import { ImportedGame } from '../../../../shared/app/hex-game-importer/types.js';
import { ImportUserError } from '../../../../shared/app/hex-game-importer/errors.js';

type ImportSourceBody = {
    source: string;
};

@JsonController()
@Service()
export default class HexGameImporterController
{
    /**
     * Used as customFetchStrategy target by the client-side hexGameImporter,
     * for handlers that shouldFetchFromBackend() (see BackendFetchHexGameImporter.ts).
     */
    @Post('/api/hex-game-importer/import')
    async import(
        @Body() body: ImportSourceBody,
    ): Promise<ImportedGame> {
        try {
            return await hexGameImporter.import(body.source);
        } catch (e) {
            if (e instanceof ImportUserError) {
                throw new HttpError(400, e.message);
            }

            throw e;
        }
    }
}
