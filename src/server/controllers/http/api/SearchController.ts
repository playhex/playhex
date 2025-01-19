import { Get, JsonController, QueryParams } from 'routing-controllers';
import { Service } from 'typedi';
import SearchPlayersParameters from '../../../../shared/app/SearchPlayersParameters';
import PlayerRepository from '../../../repositories/PlayerRepository';

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
