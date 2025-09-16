import { Get, JsonController } from 'routing-controllers';
import { Service } from 'typedi';
import { commitRef } from '../../../lastCommitInfo.js';
import { fetchGithubContributors, fetchWeblateContributors } from '../../../contributors.js';
import { PlayHexContributors } from '../../../../shared/app/Types.js';

@JsonController()
@Service()
export default class ServerInfoController
{
    @Get('/api/server-info')
    getServerInfo()
    {
        const { version } = commitRef;

        return {
            version,
        };
    }

    @Get('/api/contributors')
    async getContributors(): Promise<PlayHexContributors>
    {
        return {
            github: await fetchGithubContributors(),
            weblate: fetchWeblateContributors(),
        };
    }
}
