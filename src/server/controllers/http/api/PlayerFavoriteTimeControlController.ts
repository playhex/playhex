import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../middlewares.js';
import { Body, Get, JsonController, Put, QueryParam } from 'routing-controllers';
import { Player, PlayerFavoriteTimeControl } from '../../../../shared/app/models/index.js';
import PlayerFavoriteTimeControlRepository from '../../../repositories/PlayerFavoriteTimeControlRepository.js';
import { type TimeControlCadency } from '../../../../shared/app/timeControlUtils.js';

@JsonController()
@Service()
export default class PlayerFavoriteTimeControlController
{
    constructor(
        private playerFavoriteTimeControlRepository: PlayerFavoriteTimeControlRepository,
    ) {}

    @Get('/api/player-favorite-time-controls')
    async get(
        @AuthenticatedPlayer() player: Player,
    ): Promise<PlayerFavoriteTimeControl[]>
    {
        return await this.playerFavoriteTimeControlRepository.getForPlayer(player.publicId);
    }

    @Put('/api/player-favorite-time-controls')
    async put(
        @AuthenticatedPlayer() player: Player,
        @QueryParam('cadency') cadency: TimeControlCadency,
        @Body({ type: PlayerFavoriteTimeControl }) body: PlayerFavoriteTimeControl[],
    ): Promise<void>
    {
        await this.playerFavoriteTimeControlRepository.replaceForPlayer(player, cadency, body);
    }
}
