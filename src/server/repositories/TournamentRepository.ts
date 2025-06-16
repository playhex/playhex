import { Inject, Service } from 'typedi';
import { FindOptionsRelations, In, Repository } from 'typeorm';
import { Player, Tournament, TournamentSubscription } from '../../shared/app/models/index.js';
import { ActiveTournament } from '../tournaments/ActiveTournament.js';
import logger from '../services/logger.js';
import { AppDataSource } from '../data-source.js';
import { createTournamentFromCreateInput } from '../../shared/app/models/Tournament.js';
import { getTournamentEngine } from '../tournaments/organizers/getTournamentEngine.js';
import { isCheckInOpen, tournamentMatchNumber } from '../../shared/app/tournamentUtils.js';
import { addTournamentHistory } from '../../shared/app/models/TournamentHistory.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';
import { AccountRequiredTournamentError, PlayerIsBannedTournamentError, TournamentError } from '../tournaments/TournamentError.js';
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
    host: true,
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
    games: {
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
     * Incoming and active tournaments, then archived.
     */
    private activeTournaments: { [tournamentPublicId: string]: ActiveTournament } = {};

    constructor(
        @Inject('Repository<Tournament>')
        private tournamentRepository: Repository<Tournament>,

        private tournamentBanManager: TournamentBanManager,

        @Inject(() => HostedGameAccessor)
        private hostedGameAccessor: HostedGameAccessorInterface,
    ) {
        this.loadActiveTournaments();
    }

    private async loadActiveTournaments()
    {
        logger.info('Loading tournaments from database to memory...');

        await AppDataSource.initialize();

        const tournaments = await this.tournamentRepository.find({
            relations,
            where: {
                state: In(['created', 'running']),
            },
            relationLoadStrategy: 'query',
        });

        for (const tournament of tournaments) {
            try {
                this.activeTournaments[tournament.publicId] = await this.createActiveTournament(tournament);
            } catch (e) {
                logger.error('Tournament could not be loaded, skipping', {
                    tournamentSlug: tournament.slug,
                    reason: e.message ?? e,
                    stack: e.stack,
                });
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
                logger.error('Could not persist a tournament. Continue with others.', { tournamentPublicId: key, e, errorMessage: e.message });
            }
        }

        logger.info('Tournament persisting done.');

        return allSuccess;
    }

    private async createActiveTournament(tournament: Tournament): Promise<ActiveTournament>
    {
        // Replace instance of hostedGame by same instance of hostedGame from active games
        for (const tournamentGame of tournament.games) {
            const { hostedGame } = tournamentGame;

            if (null === hostedGame) {
                continue;
            }

            const hostedGameServer = this.hostedGameAccessor.getHostedGameServer(hostedGame.publicId);

            if (null === hostedGameServer) {
                if (!isStateEnded(hostedGame)) {
                    logger.warning('Could not find tournament active game', {
                        tournamentPublicId: hostedGame.publicId,
                        hostedGameState: hostedGame.state,
                        matchNumber: tournamentMatchNumber(tournamentGame),
                    });
                }

                continue;
            }

            tournamentGame.hostedGame = hostedGameServer.getHostedGame();
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
     * Get all active tournaments a player is playing in.
     */
    getPlayerActiveTournaments(playerUuid: null | string): Tournament[]
    {
        const tournaments: Tournament[] = [];

        for (const activeTournament of Object.values(this.activeTournaments)) {
            const tournament = activeTournament.getTournament();

            if (null !== playerUuid) {
                if (tournament.subscriptions.every(subscription => subscription.player.publicId !== playerUuid)
                    && tournament.participants.every(participant => participant.player.publicId !== playerUuid)
                ) {
                    continue;
                }
            }

            tournaments.push(tournament);
        }

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
                host: true,
                participants: {
                    player: true,
                },
            },
            where: {
                state: 'ended',
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
            where: { slug },
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
            where: { slug },
            relations: {
                host: true,
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
        logger.info('Persist tournament...', { publicId: tournament.publicId });

        return await this.tournamentRepository.save(tournament);
    }

    async createTournament(tournament: Tournament, host: Player): Promise<Tournament>
    {
        tournament = createTournamentFromCreateInput(tournament);

        tournament.createdAt = new Date();
        tournament.host = host;

        addTournamentHistory(tournament, 'created', {
            hostPseudo: pseudoString(host),
            hostPublicId: host.publicId,
        }, tournament.createdAt);

        tournament = await this.save(tournament);

        this.activeTournaments[tournament.publicId] = await this.createActiveTournament(tournament);

        return tournament;
    }

    /**
     * TODO move to ActiveTournament
     *
     * @param tournament
     * @param edited
     * @throws {TournamentError} If tournament has already started, or has ended.
     */
    async editTournament(tournament: Tournament, edited: Tournament): Promise<Tournament>
    {
        if ('created' !== tournament.state) {
            throw new TournamentError('Cannot edit, tournament has already started');
        }

        const now = new Date();

        if (edited.title !== tournament.title) {
            addTournamentHistory(tournament, 'edited', {
                field: 'title',
                value: edited.title,
                oldValue: tournament.title,
            }, now);
        }

        if (edited.startOfficialAt.getTime() !== tournament.startOfficialAt.getTime()) {
            addTournamentHistory(tournament, 'edited', {
                field: 'officiallyStartsAt',
                value: edited.startOfficialAt,
                oldValue: tournament.startOfficialAt,
            }, now);
        }

        if (edited.description !== tournament.description) {
            addTournamentHistory(tournament, 'edited', {
                field: 'description',
                value: edited.description?.substring(0, 12) ?? '',
                oldValue: tournament.description?.substring(0, 12) ?? '',
            }, now);
        }

        tournament.title = edited.title;
        tournament.startOfficialAt = edited.startOfficialAt;
        tournament.description = edited.description;

        return await this.save(tournament); // TODO replace by autosave
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
        if ('created' !== tournament.state) {
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

            addTournamentHistory(tournament, 'player_subscribed', {
                playerPublicId: player.publicId,
                playerPseudo: pseudoString(player),
            }, now);
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
}
