import { Inject, Service } from 'typedi';
import { FindOptionsRelations, In, Repository } from 'typeorm';
import { Player, Tournament, TournamentSubscription } from '../../shared/app/models/index.js';
import { by, errorToLogger } from '../../shared/app/utils.js';
import { ActiveTournament } from '../tournaments/ActiveTournament.js';
import logger from '../services/logger.js';
import { AppDataSource } from '../data-source.js';
import { createTournamentFromCreateInput } from '../../shared/app/models/Tournament.js';
import { getTournamentEngine } from '../tournaments/organizers/getTournamentEngine.js';
import { ActiveTournamentsFilters, isCheckInOpen, isFeaturedNow, isPlayerInvolved, tournamentMatchKey } from '../../shared/app/tournamentUtils.js';
import { addTournamentHistory } from '../../shared/app/models/TournamentHistory.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';
import { AccountRequiredTournamentError, PlayerIsBannedTournamentError } from '../tournaments/TournamentError.js';
import type { HostedGameAccessorInterface } from '../tournaments/hosted-game-accessor/HostedGameAccessorInterface.js';
import { HostedGameAccessor } from '../tournaments/hosted-game-accessor/HostedGameAccessor.js';
import { TournamentBanManager } from '../tournaments/services/TournamentBanManager.js';
import { AutoSave } from '../auto-save/AutoSave.js';
import { isStateEnded } from '../../shared/app/hostedGameUtils.js';

/**
 * Relations to load for active tournament.
 *
 * With these relations, must add relationLoadStrategy: 'query'
 * as typeorm parameter (e.g in find(), findOne(), ...)
 * to prevent join all relation at once and fetch thousands of rows.
 */
const relations: FindOptionsRelations<Tournament> = {
    organizer: true,
    subscriptions: {
        player: {
            currentRating: true,
        },
    },
    participants: {
        player: {
            currentRating: true,
        },
    },
    admins: {
        player: true,
    },
    matches: {
        player1: {
            currentRating: true,
        },
        player2: {
            currentRating: true,
        },
        hostedGame: {
            gameData: true,
            hostedGameToPlayers: {
                player: {
                    currentRating: true,
                },
            },
        },
    },
    history: true,
};

@Service()
export default class TournamentRepository
{
    /**
     * Upcoming and active tournaments, then archived.
     */
    private activeTournaments: { [tournamentPublicId: string]: ActiveTournament } = {};

    constructor(
        @Inject('Repository<Tournament>')
        private tournamentRepository: Repository<Tournament>,

        private tournamentBanManager: TournamentBanManager,

        @Inject(() => HostedGameAccessor)
        private hostedGameAccessor: HostedGameAccessorInterface,
    ) {
        this.loadActiveTournaments().catch(e => {
            logger.error('Error while loading tournaments', errorToLogger(e));
        });
    }

    private async loadActiveTournaments()
    {
        logger.info('Loading tournaments from database to memory...');

        await AppDataSource.initialize();

        const tournaments = await this.tournamentRepository.find({
            relations,
            where: {
                state: In(['created', 'running']),
                softDeleted: false,
            },
            relationLoadStrategy: 'query',
        });

        for (const tournament of tournaments) {
            try {
                this.activeTournaments[tournament.publicId] = await this.createActiveTournament(tournament);
            } catch (e) {
                logger.error('Tournament could not be loaded, skipping', errorToLogger(e));
            }
        }

        logger.info('Loaded tournaments in memory', { tournamentsCount: tournaments.length });
    }

    async persistAllTournaments(): Promise<boolean>
    {
        logger.info('Persisting all tournaments...');

        let allSuccess = true;

        for (const key in this.activeTournaments) {
            try {
                await this.activeTournaments[key].save();
            } catch (e) {
                allSuccess = false;
                logger.error('Could not persist a tournament. Continue with others.', { ...errorToLogger(e), tournamentPublicId: key });
            }
        }

        logger.info('Tournament persisting done.');

        return allSuccess;
    }

    private async createActiveTournament(tournament: Tournament): Promise<ActiveTournament>
    {
        // Replace instance of hostedGame by same instance of hostedGame from active games
        for (const tournamentMatch of tournament.matches) {
            const { hostedGame } = tournamentMatch;

            if (hostedGame === null) {
                continue;
            }

            const hostedGameServer = this.hostedGameAccessor.getHostedGameServer(hostedGame.publicId);

            if (hostedGameServer === null) {
                if (!isStateEnded(hostedGame)) {
                    logger.warning('Could not find tournament active game', {
                        tournamentPublicId: hostedGame.publicId,
                        hostedGameState: hostedGame.state,
                        matchNumber: tournamentMatchKey(tournamentMatch),
                    });
                }

                continue;
            }

            tournamentMatch.hostedGame = hostedGameServer.getHostedGame();
        }

        const activeTournament = new ActiveTournament(
            tournament,
            getTournamentEngine(tournament),
            this.hostedGameAccessor,
            new AutoSave(() => this.save(tournament)),
        );

        await activeTournament.init();

        return activeTournament;
    }

    /**
     * Get all active tournaments.
     */
    getActiveTournaments(filters?: ActiveTournamentsFilters): Tournament[]
    {
        const tournaments: Tournament[] = [];

        for (const activeTournament of Object.values(this.activeTournaments)) {
            const tournament = activeTournament.getTournament();

            // If playerUuid filter is provided, exclude tournaments where this player is not in
            if (undefined !== filters?.playerPublicId) {
                if (!isPlayerInvolved(tournament, filters.playerPublicId)) {
                    continue;
                }
            }

            // If featured filter is provided, exclude tournaments not featured, or not too soon to feature now
            if (undefined !== filters?.featured) {
                if (!isFeaturedNow(tournament)) {
                    continue;
                }
            }

            tournaments.push(tournament);
        }

        tournaments.sort(by(tournament => tournament.startOfficialAt.getTime()));

        return tournaments;
    }

    getActiveTournament(publicId: string): null | ActiveTournament
    {
        return this.activeTournaments[publicId] ?? null;
    }

    getActiveTournamentBySlug(slug: string): null | ActiveTournament
    {
        for (const activeTournament of Object.values(this.activeTournaments)) {
            if (activeTournament.getTournament().slug === slug) {
                return activeTournament;
            }
        }

        return null;
    }

    async getEndedTournaments(): Promise<Tournament[]>
    {
        return await this.tournamentRepository.find({
            relations: {
                organizer: true,
                participants: {
                    player: true,
                },
            },
            where: {
                state: 'ended',
                softDeleted: false,
            },
            order: {
                endedAt: 'desc',
                participants: {
                    rank: 'desc',
                },
            },
        });
    }

    /**
     * Find tournament by slug, from memory or database.
     * Returns null if no tournament with this slug.
     *
     * If not in memory, fetch from database with all relations.
     */
    async findBySlugFull(slug: string): Promise<null | Tournament>
    {
        for (const publicId in this.activeTournaments) {
            if (this.activeTournaments[publicId].getTournament().slug === slug) {
                return this.activeTournaments[publicId].getTournament();
            }
        }

        return await this.tournamentRepository.findOne({
            relations,
            where: { slug, softDeleted: false },
            relationLoadStrategy: 'query',
        });
    }

    /**
     * Find tournament by slug, from memory or database.
     * Returns null if no tournament with this slug.
     *
     * If not in memory, fetch from database only tournament data, no relation.
     */
    async findBySlug(slug: string): Promise<null | Tournament>
    {
        for (const publicId in this.activeTournaments) {
            if (this.activeTournaments[publicId].getTournament().slug === slug) {
                return this.activeTournaments[publicId].getTournament();
            }
        }

        return await this.tournamentRepository.findOne({
            where: { slug, softDeleted: false },
            relations: {
                organizer: true,
            },
        });
    }

    /**
     * For active tournaments,
     * should call activeTournament.save() instead
     * to prevent persist concurrencies.
     */
    async save(tournament: Tournament): Promise<Tournament>
    {
        logger.info('Persisting a tournament...', { publicId: tournament.publicId });

        const result = await this.tournamentRepository.save(tournament);

        logger.info('Tournament persisting done', { publicId: tournament.publicId, id: result.id });

        return result;
    }

    async createTournament(tournament: Tournament, organizer: Player): Promise<Tournament>
    {
        tournament = createTournamentFromCreateInput(tournament);

        tournament.createdAt = new Date();
        tournament.organizer = organizer;

        addTournamentHistory(tournament, 'created', {
            organizerPseudo: pseudoString(organizer),
            organizerPublicId: organizer.publicId,
        }, tournament.createdAt);

        tournament = await this.save(tournament);

        this.activeTournaments[tournament.publicId] = await this.createActiveTournament(tournament);

        return tournament;
    }

    /**
     * TODO move to ActiveTournament
     *
     * Subscribe and/or check-in a player in a tournament.
     * Check-in is effective only when in check-in period.
     *
     * @throws {PlayerIsBannedTournamentError}
     */
    async subscribeCheckIn(tournament: Tournament, player: Player): Promise<TournamentSubscription>
    {
        if (tournament.state !== 'created') {
            throw new Error('Cannot subscribe or checkIn, tournament already started');
        }

        if (await this.tournamentBanManager.isBanned(tournament, player)) {
            throw new PlayerIsBannedTournamentError();
        }

        if (tournament.accountRequired && player.isGuest) {
            throw new AccountRequiredTournamentError();
        }

        const now = new Date();
        let tournamentSubscription = tournament.subscriptions.find(subscription => subscription.player.publicId === player.publicId);

        // subscribe
        if (undefined === tournamentSubscription) {
            tournamentSubscription = new TournamentSubscription();

            tournamentSubscription.player = player;
            tournamentSubscription.tournament = tournament;
            tournamentSubscription.subscribedAt = now;
            tournamentSubscription.checkedIn = null;

            tournament.subscriptions.push(tournamentSubscription);

            if (!isCheckInOpen(tournament, now)) {
                addTournamentHistory(tournament, 'player_subscribed', {
                    playerPublicId: player.publicId,
                    playerPseudo: pseudoString(player),
                }, now);
            }
        }

        // check in
        if (isCheckInOpen(tournament, now) && !tournamentSubscription.checkedIn) {
            tournamentSubscription.checkedIn = now;

            addTournamentHistory(tournament, 'player_checked_in', {
                playerPublicId: player.publicId,
                playerPseudo: pseudoString(player),
            }, now);
        }

        await this.tournamentRepository.save(tournament); // TODO replace by autosave

        return tournamentSubscription;
    }

    async deleteActiveTournament(activeTournament: ActiveTournament): Promise<void>
    {
        const tournament = activeTournament.getTournament();

        tournament.softDeleted = true;

        await activeTournament.save();

        delete this.activeTournaments[tournament.publicId];
    }
}
