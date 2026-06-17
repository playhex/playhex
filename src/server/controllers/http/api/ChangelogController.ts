import { readFile } from 'fs/promises';
import { join } from 'path';
import { Get, JsonController } from 'routing-controllers';
import { Service } from 'typedi';

@JsonController()
@Service()
export default class ChangelogController
{
    @Get('/api/changelog')
    async getChangelog(): Promise<string>
    {
        return await readFile(join(process.cwd(), 'CHANGELOG.md'), 'utf-8');
    }
}
