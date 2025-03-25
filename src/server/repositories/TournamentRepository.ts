import { Inject, Service } from 'typedi';
import { FindOptionsRelations, In, Repository } from 'typeorm';
import { HostedGameOptions, Player, Tournament, TournamentGame, TournamentSubscription } from '../../shared/app/models/index.js';
import { ActiveTournament } from '../tournaments/ActiveTournament.js';
import logger from '../services/logger.js';
import { AppDataSource } from '../data-source.js';
import { createTournamentFromCreateInput } from '../../shared/app/models/Tournament.js';
import { getTournamentEngine } from '../tournaments/organizers/getTournamentEngine.js';
import HostedGameRepository from './HostedGameRepository.js';
import HostedGameServer from '../HostedGameServer.js';
import { isCheckInOpen } from '../../shared/app/tournamentUtils.js';
import { addTournamentHistory } from '../../shared/app/models/TournamentHistory.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';

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

class TournamentException extends Error {}

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

        private hostedGameRepository: HostedGameRepository,
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
            this.activeTournaments[tournament.publicId] = this.createActiveTournament(tournament);
        }

        logger.info('Loaded tournaments in memory', { tournamentsCount: tournaments.length });
    }

    async persistAllTournaments(): Promise<boolean>
    {
        logger.info('Persisting all tournaments...');

        let allSuccess = true;

        for (const key in this.activeTournaments) {
            try {
                await this.save(this.activeTournaments[key].getTournament());
            } catch (e) {
                allSuccess = false;
                logger.error('Could not persist a tournament. Continue with others.', { tournamentPublicId: key, e, errorMessage: e.message });
            }
        }

        logger.info('Tournament persisting done.');

        return allSuccess;
    }

    private createActiveTournament(tournament: Tournament): ActiveTournament
    {
        // Replace instance of hostedGame by same instance of hostedGame from active games
        for (const tournamentGame of tournament.games) {
            const { hostedGame } = tournamentGame;

            if (null === hostedGame) {
                continue;
            }

            const hostedGameServer = this.hostedGameRepository.getActiveGame(hostedGame.publicId);

            if (null === hostedGameServer) {
                if ('ended' !== hostedGame.state) {
                    logger.warning('Could not find tournament active game', {
                        tournamentPublicId: hostedGame.publicId,
                        hostedGameState: hostedGame.state,
                        matchNumber: tournamentGame.round + '.' + tournamentGame.number,
                    });
                }

                continue;
            }

            tournamentGame.hostedGame = hostedGameServer.getHostedGame();
        }

        const activeTournament =  new ActiveTournament(
            tournament,
            getTournamentEngine(tournament),
            async (gameOptions: HostedGameOptions, tournamentGame: TournamentGame) => await this.createGame(gameOptions, tournamentGame),
        );

        activeTournament.on('started', () => this.save(tournament));
        activeTournament.on('gameStarted', () => this.save(tournament));
        activeTournament.on('gameEnded', () => this.save(tournament));
        activeTournament.on('ended', () => this.save(tournament));

        activeTournament.init();

        return activeTournament;
    }

    private async createGame(gameOptions: HostedGameOptions, tournamentGame: TournamentGame): Promise<HostedGameServer>
    {
        if (!tournamentGame.player1 || !tournamentGame.player2) {
            throw new Error('Cannot create game, a player is missing');
        }

        const hostedGameServer = await this.hostedGameRepository.createGame(gameOptions, null, null, tournamentGame);

        const result1 = hostedGameServer.playerJoin(tournamentGame.player1, true);
        const result2 = hostedGameServer.playerJoin(tournamentGame.player2, true);

        if (true !== result1 || true !== result2) {
            throw new Error(`Could not add player in game: "${result1}", "${result2}`);
        }

        await this.hostedGameRepository.persist(hostedGameServer.getHostedGame());

        return hostedGameServer;
    }

    getActiveTournaments(playerUuid: null | string): Tournament[]
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

    async findBySlug(slug: string): Promise<null | Tournament>
    {
        for (const publicId in this.activeTournaments) {
            if (this.activeTournaments[publicId].getTournament().slug === slug) {
                return this.activeTournaments[publicId].getTournament();
            }
        }

        return await this.tournamentRepository.findOne({
            where: { slug },
        });
    }

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

        this.activeTournaments[tournament.publicId] = this.createActiveTournament(tournament);

        return tournament;
    }

    /**
     *
     * @param tournament
     * @param edited
     * @throws {TournamentException} If tournament has already started, or has ended.
     */
    async editTournament(tournament: Tournament, edited: Tournament): Promise<Tournament>
    {
        if ('created' !== tournament.state) {
            throw new TournamentException('Cannot edit, tournament has already started');
        }

        const now = new Date();

        if (edited.title !== tournament.title) {
            addTournamentHistory(tournament, 'edited', {
                field: 'title',
                value: edited.title,
                oldValue: tournament.title,
            }, now);
        }

        if (edited.startsAt.getTime() !== tournament.startsAt.getTime()) {
            addTournamentHistory(tournament, 'edited', {
                field: 'startsAt',
                value: edited.startsAt,
                oldValue: tournament.startsAt,
            }, now);
        }

        tournament.title = edited.title;
        tournament.startsAt = edited.startsAt;

        return await this.save(tournament);
    }

    /**
     * Subscribe and/or check-in a player in a tournament.
     * Check-in is effective only when in check-in period.
     */
    async subscribeCheckIn(tournament: Tournament, player: Player): Promise<TournamentSubscription>
    {
        if ('created' !== tournament.state) {
            throw new Error('Cannot subscribe or checkIn, tournament already started');
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

        await this.tournamentRepository.save(tournament);

        return tournamentSubscription;
    }
}
