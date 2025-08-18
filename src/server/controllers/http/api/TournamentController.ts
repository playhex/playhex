import { BadRequestError, Body, Delete, Get, HttpError, JsonController, NotFoundError, Param, Patch, Post, Put, QueryParam } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthenticatedPlayer, mustBeTournamentOrganizer } from '../middlewares.js';
import { Player, Tournament, TournamentSubscription } from '../../../../shared/app/models/index.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import TournamentRepository from '../../../repositories/TournamentRepository.js';
import { isDuplicateError } from '../../../repositories/typeormUtils.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import { instanceToPlain } from '../../../../shared/app/class-transformer-custom.js';
import { AccountRequiredTournamentError, GamePlayerNotFoundTournamentError, NotEnoughParticipantsToStartTournamentError, PlayerIsBannedTournamentError, TooDeepResetError, TournamentError } from '../../../tournaments/TournamentError.js';
import logger from '../../../services/logger.js';

@JsonController()
@Service()
export default class TournamentController
{
    constructor(
        private tournamentRepository: TournamentRepository,
        private playerRepository: PlayerRepository,
    ) {}

    /**
     * Active tournaments (created, running).
     * Can be filtered to get tournaments a player is related to (subscribed or participating)
     *
     * /api/tournaments/active?player=UUID
     */
    @Get('/api/tournaments/active')
    async getActiveTournaments(
        @QueryParam('playerPublicId') playerPublicId?: string,
        @QueryParam('featured') featured?: boolean,
    ) {
        return this.tournamentRepository.getActiveTournaments({
            playerPublicId,
            featured,
        });
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

        if (tournament === null) {
            throw new HttpError(404, `No tournament with slug "${slug}"`);
        }

        return instanceToPlain(tournament);
    }

    @Post('/api/tournaments')
    async postTournament(
        @AuthenticatedPlayer() organizer: Player,
        @Body({
            validate: { groups: ['tournament:create'] },
            transform: { groups: ['tournament:create'] },
        }) tournament: Tournament,
    ) {
        try {
            return await this.tournamentRepository.createTournament(tournament, organizer);
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
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        mustBeTournamentOrganizer(activeTournament.getTournament(), player);

        try {
            return await activeTournament.editTournament(edited);
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
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        try {
            return await this.tournamentRepository.subscribeCheckIn(activeTournament.getTournament(), player);
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
    @Delete('/api/tournaments/:slug/subscriptions/:playerPublicId')
    async deleteSubscription(
        @AuthenticatedPlayer() authenticatedPlayer: Player,
        @Param('slug') slug: string,
        @Param('playerPublicId') playerPublicId: string,
    ): Promise<null | TournamentSubscription> {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        const subscription = activeTournament.findSubscriptionByPlayerPublicId(playerPublicId);

        if (subscription === null) {
            return null;
        }

        if (subscription.player.publicId === authenticatedPlayer.publicId) {
            return await activeTournament.playerSelfUnsubscribe(playerPublicId);
        }

        mustBeTournamentOrganizer(activeTournament.getTournament(), authenticatedPlayer);

        return await activeTournament.hostKick(playerPublicId);
    }

    @Post('/api/tournaments/:slug/start')
    async postSartTournament(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ): Promise<Tournament> {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        mustBeTournamentOrganizer(activeTournament.getTournament(), player);

        if (activeTournament.getTournament().state !== 'created') {
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
                error: e instanceof Error ? e.stack : e,
            });

            throw new HttpError(500, 'Error while starting tournament');
        }
    }

    @Post('/api/tournaments/:slug/games/:hostedGamePublicId/players/:playerPublicId/forfeit')
    async postForfeitGamePlayer(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
        @Param('hostedGamePublicId') hostedGamePublicId: string,
        @Param('playerPublicId') playerPublicId: string,
    ) {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        mustBeTournamentOrganizer(activeTournament.getTournament(), player);

        try {
            activeTournament.forfeitGamePlayer(hostedGamePublicId, playerPublicId);
        } catch (e) {
            if (e instanceof GamePlayerNotFoundTournamentError) {
                throw new NotFoundError(e.message);
            }

            if (e instanceof TournamentError) {
                throw new BadRequestError(e.message);
            }

            throw e;
        }
    }

    @Post('/api/tournaments/:slug/games/:hostedGamePublicId/reset-recreate')
    async postResetAndRecreateGame(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
        @Param('hostedGamePublicId') hostedGamePublicId: string,
    ) {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        mustBeTournamentOrganizer(activeTournament.getTournament(), player);

        try {
            await activeTournament.resetAndRecreateGame(hostedGamePublicId);
        } catch (e) {
            if (e instanceof TooDeepResetError) {
                throw new BadRequestError(e.message);
            }

            if (e instanceof GamePlayerNotFoundTournamentError) {
                throw new NotFoundError(e.message);
            }

            if (e instanceof TournamentError) {
                throw new BadRequestError(e.message);
            }

            throw e;
        }
    }

    @Post('/api/tournaments/:slug/iterate')
    async postIterateTournament(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ): Promise<Tournament> {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        mustBeTournamentOrganizer(activeTournament.getTournament(), player);

        await activeTournament.iterateTournament();

        await activeTournament.save();

        return activeTournament.getTournament();
    }

    @Delete('/api/tournaments/:slug')
    async deleteTournament(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ): Promise<void> {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        mustBeTournamentOrganizer(activeTournament.getTournament(), player);

        await this.tournamentRepository.deleteActiveTournament(activeTournament);
    }

    @Put('/api/tournaments/:slug/admins')
    async putTournamentAdmins(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
        @Body() players: Player[],
    ) {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        mustBeTournamentOrganizer(activeTournament.getTournament(), player);

        const loadedPlayers = await Promise.all(players.map(player => this.playerRepository.getPlayer(player.publicId)));

        if (!this.isAllPlayersLoaded(loadedPlayers)) {
            throw new NotFoundError(`On of these publicIds does not belong to a player: "${players.map(p => p.publicId).join('", "')}"`);
        }

        await activeTournament.changeTournamentAdmins(loadedPlayers);
    }

    private isAllPlayersLoaded(players: (null | Player)[]): players is Player[]
    {
        return players.every(player => player !== null);
    }
}
