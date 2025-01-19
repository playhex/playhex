import { Service } from 'typedi';
import PlayerRepository from '../../../repositories/PlayerRepository';
import HttpError from '../HttpError';
import { Get, JsonController, Param, QueryParam } from 'routing-controllers';
import StatsRepository from '../../../repositories/StatsRepository';

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

        if (null === player) {
            throw new HttpError(404, 'Player not found');
        }

        return player;
    }

    @Get('/api/players/:publicId')
    async getOne(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (null === player) {
            throw new HttpError(404, 'Player not found');
        }

        return player;
    }

    @Get('/api/players/:publicId/stats')
    async getPlayerStats(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (null === player) {
            throw new HttpError(404, 'Player not found');
        }

        if (!player.id) {
            throw new Error('Player has not id');
        }

        return this.statsRepository.getPlayerStats(player.id);
    }
}
