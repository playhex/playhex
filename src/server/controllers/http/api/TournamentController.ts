import { Body, Delete, Get, HttpError, JsonController, NotFoundError, Param, Patch, Post, Put, QueryParam } from 'routing-controllers';
import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { AuthenticatedPlayer } from '../middlewares.js';
import { Player, Tournament, TournamentBannedPlayer, TournamentSubscription } from '../../../../shared/app/models/index.js';
import TournamentRepository from '../../../repositories/TournamentRepository.js';
import { isDuplicateError } from '../../../repositories/typeormUtils.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import { instanceToPlain } from '../../../../shared/app/class-transformer-custom.js';
import { AccountRequiredTournamentError, NotEnoughParticipantsToStartTournamentError, PlayerIsBannedTournamentError } from '../../../tournaments/TournamentError.js';
import logger from '../../../services/logger.js';
import { TournamentBanManager } from '../../../tournaments/services/TournamentBanManager.js';

@JsonController()
@Service()
export default class TournamentController
{
    constructor(
        private tournamentRepository: TournamentRepository,

        private tournamentBanManager: TournamentBanManager,

        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,
    ) {}

    /**
     * Active tournaments (created, running).
     * Can be filtered to get tournaments a player is related to (subscribed or participating)
     *
     * /api/tournaments/active?player=UUID
     */
    @Get('/api/tournaments/active')
    async getActiveTournaments(
        @QueryParam('player') playerUuid?: string,
    ) {
        return this.tournamentRepository.getPlayerActiveTournaments(playerUuid ?? null);
    }

    @Get('/api/tournaments')
    async getTournaments()
    {
        return this.tournamentRepository.getEndedTournaments();
    }

    @Get('/api/tournaments/:slug')
    async getTournament(
        @Param('slug') slug: string,
    ) {
        const tournament = await this.tournamentRepository.findBySlugFull(slug);

        if (null === tournament) {
            throw new HttpError(404, `No tournament with slug "${slug}"`);
        }

        return instanceToPlain(tournament);
    }

    @Post('/api/tournaments')
    async postTournament(
        @AuthenticatedPlayer() host: Player,
        @Body({
            validate: { groups: ['tournament:create'] },
            transform: { groups: ['tournament:create'] },
        }) tournament: Tournament,
    ) {
        try {
            return await this.tournamentRepository.createTournament(tournament, host);
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new DomainHttpError(409, 'tournament_title_duplicate', 'A tournament already exists with same title');
            }

            throw e;
        }
    }

    @Patch('/api/tournaments/:slug')
    async patchTournament(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
        @Body({
            validate: { groups: ['tournament:edit'] },
            transform: { groups: ['tournament:edit'] },
        }) edited: Tournament,
    ) {
        const tournament = await this.tournamentRepository.findBySlugFull(slug);

        if (null === tournament) {
            throw new HttpError(404, 'Tournament not found');
        }

        this.mustBeTournamentHost(tournament, player);

        try {
            return await this.tournamentRepository.editTournament(tournament, edited);
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new DomainHttpError(409, 'tournament_title_duplicate', 'A tournament already exists with same title');
            }

            throw e;
        }
    }

    @Put('/api/tournaments/:slug/subscriptions')
    async putSubscription(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ): Promise<TournamentSubscription> {
        const tournament = await this.tournamentRepository.findBySlug(slug);

        if (null === tournament) {
            throw new NotFoundError(`Tournament "${slug}" not found`);
        }

        try {
            return await this.tournamentRepository.subscribeCheckIn(tournament, player);
        } catch (e) {
            if (e instanceof PlayerIsBannedTournamentError) {
                throw new DomainHttpError(403, 'tournament_player_is_banned');
            }

            if (e instanceof AccountRequiredTournamentError) {
                throw new DomainHttpError(403, 'tournament_account_required');
            }

            throw e;
        }
    }

    /**
     * Unsubscribe, or kick by host.
     */
    @Delete('/api/tournaments/:slug/subscriptions/:subscriptionId')
    async deleteSubscription(
        @AuthenticatedPlayer() authenticatedPlayer: Player,
        @Param('slug') slug: string,
        @Param('subscriptionId') subscriptionId: string,
    ): Promise<null | TournamentSubscription> {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (null === activeTournament) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        const subscription = activeTournament.findSubscriptionByPublicId(subscriptionId);

        if (null === subscription) {
            return null;
        }

        if (subscription.player.publicId === authenticatedPlayer.publicId) {
            return await activeTournament.playerSelfUnsubscribe(subscription.publicId);
        }

        this.mustBeTournamentHost(activeTournament.getTournament(), authenticatedPlayer);

        return await activeTournament.hostKick(subscription.publicId);
    }

    @Get('/api/tournaments/:slug/banned-players')
    async getBannedPlayers(
        @AuthenticatedPlayer() authenticatedPlayer: Player,
        @Param('slug') slug: string,
    ): Promise<TournamentBannedPlayer[]> {
        const tournament = await this.tournamentRepository.findBySlug(slug);

        if (null === tournament) {
            throw new NotFoundError(`Tournament "${slug}" not found`);
        }

        this.mustBeTournamentHost(tournament, authenticatedPlayer);

        return await this.tournamentBanManager.getBannedPlayers(tournament);
    }

    @Put('/api/tournaments/:slug/banned-players/:playerPublicId')
    async putBannedPlayer(
        @AuthenticatedPlayer() authenticatedPlayer: Player,
        @Param('slug') slug: string,
        @Param('playerPublicId') playerPublicId: string,
    ): Promise<TournamentBannedPlayer> {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (null === activeTournament) {
            throw new NotFoundError(`Tournament "${slug}" not found`);
        }

        this.mustBeTournamentHost(activeTournament.getTournament(), authenticatedPlayer);

        const player = await this.playerRepository.findOneBy({
            publicId: playerPublicId,
        });

        if (null === player) {
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

        if (null === activeTournament) {
            throw new NotFoundError(`Tournament "${slug}" not found`);
        }

        this.mustBeTournamentHost(activeTournament.getTournament(), authenticatedPlayer);

        const player = await this.playerRepository.findOneBy({
            publicId: playerPublicId,
        });

        if (null === player) {
            throw new NotFoundError('No player with this publicId');
        }

        return await this.tournamentBanManager.unbanPlayer(activeTournament, player);
    }

    @Post('/api/tournaments/:slug/start')
    async postSartTournament(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ): Promise<Tournament> {
        const tournament = await this.tournamentRepository.findBySlugFull(slug);

        if (null === tournament) {
            throw new HttpError(404, 'Tournament not found');
        }

        this.mustBeTournamentHost(tournament, player);

        const activeTournament = this.tournamentRepository.getActiveTournament(tournament.publicId);

        if (null === activeTournament) {
            throw new HttpError(400, 'Tournament is not active');
        }

        if ('created' !== activeTournament.getTournament().state) {
            throw new HttpError(409, 'Cannot start tournament, already started');
        }

        try {
            await activeTournament.startNow();
            await activeTournament.save();

            return activeTournament.getTournament();
        } catch (e) {
            if (e instanceof NotEnoughParticipantsToStartTournamentError) {
                throw new DomainHttpError(409, 'tournament_not_enough_participants_to_start');
            }

            logger.error('Host tried to start tournament but unhandled error', {
                reason: e.message,
                error: e,
            });

            throw new HttpError(500, 'Error while starting tournament');
        }
    }

    @Post('/api/tournaments/:slug/iterate')
    async postIterateTournament(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ): Promise<Tournament> {
        const tournament = await this.tournamentRepository.findBySlugFull(slug);

        if (null === tournament) {
            throw new HttpError(404, 'Tournament not found');
        }

        this.mustBeTournamentHost(tournament, player);

        const activeTournament = this.tournamentRepository.getActiveTournament(tournament.publicId);

        if (null === activeTournament) {
            throw new HttpError(400, 'Tournament is not active');
        }

        await activeTournament.iterateTournament();

        await activeTournament.save();

        return activeTournament.getTournament();
    }

    /**
     * Deny access if authenticated player is not the tournament host.
     *
     * @throws {HttpError} If player is not host
     */
    private mustBeTournamentHost(tournament: Tournament, player: Player): void
    {
        if (tournament.host.publicId !== player.publicId) {
            throw new HttpError(403, 'Only tournament host can do this');
        }
    }
}
