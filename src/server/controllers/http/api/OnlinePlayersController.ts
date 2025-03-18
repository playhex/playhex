import { JsonController, Get } from 'routing-controllers';
import OnlinePlayersService from '../../../services/OnlinePlayersService.js';
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
        return this.onlinePlayersService.getOnlinePlayers();
    }
}
