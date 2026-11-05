import { Service } from 'typedi';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import { Get, JsonController, Param, QueryParam } from 'routing-controllers';
import StatsRepository from '../../../repositories/StatsRepository.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import GameStore from '../../../store/GameStore.js';
import { type FormerPseudo, getFormerPseudo } from '../../../../shared/app/pseudoHistoryRules.js';

@JsonController()
@Service()
export default class PlayerController
{
    constructor(
        private playerRepository: PlayerRepository,
        private statsRepository: StatsRepository,
        private gameStore: GameStore,
    ) {}

    /**
     * Slug is required:
     * `GET /api/players?slug=alcalyn`
     *
     * Also finds player by an old slug, if player changed pseudo.
     * In this case, returned player slug is different than requested one.
     */
    @Get('/api/players')
    async getAll(
        @QueryParam('slug', { required: true }) slug: string,
    ) {
        const player = await this.playerRepository.getPlayerBySlug(slug)
            ?? await this.playerRepository.getPlayerByOldSlug(slug)
        ;

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

    /**
     * Former pseudo to display on profile page ("formerly ...").
     * formerPseudo is null if none.
     */
    @Get('/api/players/:publicId/former-pseudo')
    async getFormerPseudo(
        @Param('publicId') publicId: string,
    ): Promise<{ formerPseudo: null | FormerPseudo }> {
        const player = await this.playerRepository.getPlayer(publicId);

        if (player === null) {
            throw new DomainHttpError(404, 'player_not_found');
        }

        if (player.isGuest || !player.id) {
            return { formerPseudo: null };
        }

        const history = await this.playerRepository.getPseudoHistory(player.id);

        return { formerPseudo: getFormerPseudo(history, new Date(), player.slug) };
    }

    @Get('/api/players/:publicId/active-games')
    async getActiveGames(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (player === null) {
            throw new DomainHttpError(404, 'player_not_found');
        }

        return this.gameStore.getPlayerActiveGames(player)
            .map(g => g.getGame())
        ;
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

    /**
     * Bots this player has already beaten.
     */
    @Get('/api/players/:publicId/beaten-bots')
    async getBeatenBots(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (player === null) {
            throw new DomainHttpError(404, 'player_not_found');
        }

        if (!player.id) {
            throw new Error('Player has not id');
        }

        return this.statsRepository.getBeatenBots(player.id);
    }

    /**
     * Stats of a player against another player, from `publicId` player point of view.
     */
    @Get('/api/players/:publicId/head-to-head/:opponentPublicId')
    async getHeadToHeadStats(
        @Param('publicId') publicId: string,
        @Param('opponentPublicId') opponentPublicId: string,
    ) {
        const [player, opponent] = await Promise.all([
            this.playerRepository.getPlayer(publicId),
            this.playerRepository.getPlayer(opponentPublicId),
        ]);

        if (player === null || opponent === null) {
            throw new DomainHttpError(404, 'player_not_found');
        }

        if (!player.id || !opponent.id) {
            throw new Error('Player has not id');
        }

        return this.statsRepository.getHeadToHeadStats(player.id, opponent.id);
    }
}
