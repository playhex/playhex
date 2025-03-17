import { Get, JsonController } from 'routing-controllers';
import { Service } from 'typedi';
import { commitRef } from '../../../lastCommitInfo';
import { fetchGithubContributors, fetchWeblateContributors } from '../../../contributors';
import { PlayHexContributors } from '../../../../shared/app/Types';

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
        const contributors: PlayHexContributors = {
            github: [],
            weblate: {},
        };

        const results = await Promise.all([
            fetchGithubContributors().catch(() => []),
            fetchWeblateContributors().catch(() => ({})),
        ]);

        contributors.github = results[0];
        contributors.weblate = results[1];

        return contributors;
    }
}
