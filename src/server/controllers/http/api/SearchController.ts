import { Get, JsonController, QueryParams } from 'routing-controllers';
import { Service } from 'typedi';
import SearchPlayersParameters from '../../../../shared/app/SearchPlayersParameters.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';

@JsonController()
@Service()
export default class SearchController
{
    constructor(
        private playerRepository: PlayerRepository,
    ) {}

    @Get('/api/search/players')
    getSearchPlayers(
        @QueryParams() searchParams: SearchPlayersParameters,
    ) {
        return this.playerRepository.searchPlayers(searchParams);
    }
}
