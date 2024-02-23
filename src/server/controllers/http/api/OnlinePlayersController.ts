import { JsonController, Get } from 'routing-controllers';
import OnlinePlayersService from '../../../services/OnlinePlayersService';
import { normalize } from '../../../../shared/app/serializer';
import { Service } from 'typedi';

@JsonController()
@Service()
export default class OnlinePlayersController
{
    constructor(
        private onlinePlayersService: OnlinePlayersService,
    ) {}

    @Get('/api/online-players')
    getAll()
    {
        return normalize(this.onlinePlayersService.getOnlinePlayers());
    }
}
