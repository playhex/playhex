import { Get, JsonController } from 'routing-controllers';
import { Service } from 'typedi';
import { commitRef } from '../../../lastCommitInfo';

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
}
