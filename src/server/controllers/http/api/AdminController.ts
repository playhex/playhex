import { Service } from 'typedi';
import HostedGameRepository from '../../../repositories/HostedGameRepository';
import HttpError from '../HttpError';
import { Authorized, JsonController, Post } from 'routing-controllers';

@JsonController()
@Service()
@Authorized('ADMIN')
export default class AdminController
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {}

    @Post('/api/admin/persist-games')
    async persistGames()
    {
        const allSuccess = await this.hostedGameRepository.persistPlayingGames();

        if (!allSuccess) {
            throw new HttpError(500, 'Some games could not be persisted');
        }
    }
}
