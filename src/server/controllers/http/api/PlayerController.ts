import { Service } from 'typedi';
import PlayerRepository from '../../../repositories/PlayerRepository';
import { normalize } from '../../../../shared/app/serializer';
import HostedGameRepository from '../../../repositories/HostedGameRepository';
import { transformPlayer } from '../../../../shared/app/models/Player';
import HttpError from '../HttpError';
import { HostedGameState } from '@shared/app/Types';
import { Get, JsonController, Param, QueryParam } from 'routing-controllers';

@JsonController()
@Service()
export default class PlayerController
{
    constructor(
        private playerRepository: PlayerRepository,
        private hostedGameRepository: HostedGameRepository,
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

        return normalize(transformPlayer(player));
    }

    @Get('/api/players/:publicId')
    async getOne(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (null === player) {
            throw new HttpError(404, 'Player not found');
        }

        return normalize(transformPlayer(player));
    }

    @Get('/api/players/:publicId/games')
    async getPlayerGames(
        @Param('publicId') publicId: string,
        @QueryParam('state') stateRaw: string,
        @QueryParam('fromGamePublicId') fromGamePublicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (null === player) {
            throw new HttpError(404, 'Player not found');
        }

        let state: null | HostedGameState = null;

        if ('string' === typeof stateRaw && (stateRaw === 'created' || stateRaw === 'playing' || stateRaw === 'ended')) {
            state = stateRaw;
        }

        return normalize(await this.hostedGameRepository.getPlayerGames(player, state, fromGamePublicId));
    }
}
