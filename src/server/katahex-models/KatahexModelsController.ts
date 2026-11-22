import { readdir } from 'fs/promises';
import { Get, JsonController } from 'routing-controllers';
import { Service } from 'typedi';
import { katahexModels } from '../../shared/app/katahexModels.js';
import { katahexModelsPath } from './katahexModelsPath.js';

@JsonController()
@Service()
export default class KatahexModelsController
{
    /**
     * Filenames of known models available on this server mirror.
     */
    @Get('/api/katahex-models/mirrored')
    async getMirrored(): Promise<string[]>
    {
        const files = await readdir(katahexModelsPath).catch(() => [] as string[]);

        return katahexModels
            .map(model => model.filename)
            .filter(filename => files.includes(filename))
        ;
    }
}
