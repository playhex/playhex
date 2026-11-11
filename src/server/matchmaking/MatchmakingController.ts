import { Body, Delete, Get, HttpError, JsonController, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import { Player } from '../../shared/app/models/index.js';
import { MatchmakingEnterInput } from '../../shared/app/models/MatchmakingDto.js';
import MatchmakingStore from './MatchmakingStore.js';
import MatchmakingEventRepository from './MatchmakingEventRepository.js';
import { rateLimiterConsumeMatchmakingEnter } from '../services/rate-limiters.js';
import PlayerRepository from '../repositories/PlayerRepository.js';

@JsonController()
@Service()
export default class MatchmakingController
{
    constructor(
        private matchmakingStore: MatchmakingStore,
        private matchmakingEventRepository: MatchmakingEventRepository,
        private playerRepository: PlayerRepository,
    ) {}

    /**
     * Enter matchmaking queue, or update my preferences if already searching.
     * Returns my status, or null status if matched immediately (matchmakingMatched event is emitted).
     */
    @Post('/api/matchmaking')
    async enter(
        @AuthenticatedPlayer() player: Player,
        @Body() input: MatchmakingEnterInput,
    ) {
        await rateLimiterConsumeMatchmakingEnter(player.publicId);

        return {
            status: await this.matchmakingStore.enter(player, input.preferences, input.avoidPlayerPublicId ?? null),
        };
    }

    @Delete('/api/matchmaking')
    leave(
        @AuthenticatedPlayer() player: Player,
    ) {
        this.matchmakingStore.leave(player, 'cancel');
    }

    @Get('/api/matchmaking/me')
    getMyStatus(
        @AuthenticatedPlayer() player: Player,
    ) {
        return {
            status: this.matchmakingStore.getStatus(player),
        };
    }

    @Get('/api/matchmaking/stats/:playerPublicId')
    async getStats(
        @Param('playerPublicId') playerPublicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(playerPublicId);

        if (player === null) {
            throw new HttpError(404, 'Player not found');
        }

        return await this.matchmakingEventRepository.getStats(player);
    }
}
