import { Delete, Get, JsonController, NotFoundError, Param, Put } from 'routing-controllers';
import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { AuthenticatedPlayer, mustBeTournamentOrganizer } from '../middlewares.js';
import { Player, TournamentBannedPlayer } from '../../../../shared/app/models/index.js';
import TournamentRepository from '../../../repositories/TournamentRepository.js';
import { TournamentBanManager } from '../../../tournaments/services/TournamentBanManager.js';

@JsonController()
@Service()
export default class TournamentBanController {
    constructor(
        private tournamentRepository: TournamentRepository,
        private tournamentBanManager: TournamentBanManager,

        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,
    ) { }

    @Get('/api/tournaments/:slug/banned-players')
    async getBannedPlayers(
        @AuthenticatedPlayer() authenticatedPlayer: Player,
        @Param('slug') slug: string,
    ): Promise<TournamentBannedPlayer[]> {
        const tournament = await this.tournamentRepository.findBySlug(slug);

        if (tournament === null) {
            throw new NotFoundError(`Tournament "${slug}" not found`);
        }

        mustBeTournamentOrganizer(tournament, authenticatedPlayer);

        return await this.tournamentBanManager.getBannedPlayers(tournament);
    }

    @Put('/api/tournaments/:slug/banned-players/:playerPublicId')
    async putBannedPlayer(
        @AuthenticatedPlayer() authenticatedPlayer: Player,
        @Param('slug') slug: string,
        @Param('playerPublicId') playerPublicId: string,
    ): Promise<TournamentBannedPlayer> {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`Tournament "${slug}" not found`);
        }

        mustBeTournamentOrganizer(activeTournament.getTournament(), authenticatedPlayer);

        const player = await this.playerRepository.findOneBy({
            publicId: playerPublicId,
        });

        if (player === null) {
            throw new NotFoundError('No player with this publicId');
        }

        return await this.tournamentBanManager.banPlayer(activeTournament, player);
    }

    @Delete('/api/tournaments/:slug/banned-players/:playerPublicId')
    async deleteBannedPlayer(
        @AuthenticatedPlayer() authenticatedPlayer: Player,
        @Param('slug') slug: string,
        @Param('playerPublicId') playerPublicId: string,
    ) {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`Tournament "${slug}" not found`);
        }

        mustBeTournamentOrganizer(activeTournament.getTournament(), authenticatedPlayer);

        const player = await this.playerRepository.findOneBy({
            publicId: playerPublicId,
        });

        if (player === null) {
            throw new NotFoundError('No player with this publicId');
        }

        return await this.tournamentBanManager.unbanPlayer(activeTournament, player);
    }
}
