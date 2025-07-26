import { Service } from 'typedi';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import { Get, JsonController, Param, QueryParam } from 'routing-controllers';
import StatsRepository from '../../../repositories/StatsRepository.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';

@JsonController()
@Service()
export default class PlayerController
{
    constructor(
        private playerRepository: PlayerRepository,
        private statsRepository: StatsRepository,
    ) {}

    /**
     * Slug is required:
     * `GET /api/players?slug=alcalyn`
     */
    @Get('/api/players')
    async getAll(
        @QueryParam('slug', { required: true }) slug: string,
    ) {
        const player = await this.playerRepository.getPlayerBySlug(slug);

        if (player === null) {
            throw new DomainHttpError(404, 'player_not_found');
        }

        return player;
    }

    @Get('/api/players/:publicId')
    async getOne(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (player === null) {
            throw new DomainHttpError(404, 'player_not_found');
        }

        return player;
    }

    @Get('/api/players/:publicId/stats')
    async getPlayerStats(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (player === null) {
            throw new DomainHttpError(404, 'player_not_found');
        }

        if (!player.id) {
            throw new Error('Player has not id');
        }

        return this.statsRepository.getPlayerStats(player.id);
    }
}
