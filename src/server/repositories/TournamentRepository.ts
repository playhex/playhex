import { Inject, Service } from 'typedi';
import { FindOptionsRelations, In, Repository } from 'typeorm';
import { HostedGameOptions, Player, Tournament, TournamentBannedPlayer, TournamentGame, TournamentSubscription } from '../../shared/app/models/index.js';
import { ActiveTournament } from '../tournaments/ActiveTournament.js';
import logger from '../services/logger.js';
import { AppDataSource } from '../data-source.js';
import { createTournamentFromCreateInput } from '../../shared/app/models/Tournament.js';
import { getTournamentEngine } from '../tournaments/organizers/getTournamentEngine.js';
import HostedGameServer from '../HostedGameServer.js';
import { isCheckInOpen, tournamentMatchNumber } from '../../shared/app/tournamentUtils.js';
import { addTournamentHistory } from '../../shared/app/models/TournamentHistory.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';
import { AccountRequiredTournamentError, PlayerIsBannedTournamentError, TournamentError } from '../tournaments/TournamentError.js';
import type { HostedGameAccessorInterface } from '../tournaments/hosted-game-accessor/HostedGameAccessorInterface.js';
import { HostedGameAccessor } from '../tournaments/hosted-game-accessor/HostedGameAccessor.js';

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

        @Inject('Repository<TournamentSubscription>')
        private tournamentSubscriptionRepository: Repository<TournamentSubscription>,

        @Inject('Repository<TournamentBannedPlayer>')
        private tournamentBannedPlayerRepository: Repository<TournamentBannedPlayer>,

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
                    reason: e.message,
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
                await this.save(this.activeTournaments[key].getTournament());
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
                if ('ended' !== hostedGame.state) {
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
            () => this.save(tournament),
        );

        await activeTournament.init();

        return activeTournament;
    }

    private async createGame(gameOptions: HostedGameOptions, tournamentGame: TournamentGame): Promise<HostedGameServer>
    {
        if (!tournamentGame.player1 || !tournamentGame.player2) {
            throw new Error('Cannot create game, a player is missing');
        }

        const hostedGameServer = await this.hostedGameAccessor.createHostedGameServer(gameOptions, tournamentGame);

        const result1 = hostedGameServer.playerJoin(tournamentGame.player1, true);
        const result2 = hostedGameServer.playerJoin(tournamentGame.player2, true);

        if (true !== result1 || true !== result2) {
            throw new Error(`Could not add player in game: "${result1}", "${result2}`);
        }

        return hostedGameServer;
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
     *
     * @throws {PlayerIsBannedTournamentError}
     */
    async subscribeCheckIn(tournament: Tournament, player: Player): Promise<TournamentSubscription>
    {
        if ('created' !== tournament.state) {
            throw new Error('Cannot subscribe or checkIn, tournament already started');
        }

        if (await this.isBanned(tournament, player)) {
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

        await this.tournamentRepository.save(tournament);

        return tournamentSubscription;
    }

    /**
     * Unsubscribe player from tournament.
     *
     * @returns TournamentSubscription that has been removed, or null if player wasn't subscribed
     */
    async unsubscribe(tournament: Tournament, player: Player): Promise<null | TournamentSubscription>
    {
        const tournamentSubscription = tournament.subscriptions
            .find(subscription => subscription.player.publicId === player.publicId)
        ;

        if (!tournamentSubscription) {
            return null;
        }

        tournament.subscriptions = tournament.subscriptions
            .filter(subscription => subscription !== tournamentSubscription)
        ;

        if (!player.id || !tournament.id) {
            logger.error('Cannot remove player subscription, missing playerId or tournamentId', {
                playerId: player.id,
                tournamentId: tournament.id,
                tournamentPublicId: tournament.publicId,
            });

            throw new Error('Error while ban player');
        }

        await this.tournamentSubscriptionRepository.delete({
            tournamentId: tournament.id,
            playerId: player.id,
        });

        addTournamentHistory(tournament, 'player_unsubscribed', {
            playerPublicId: player.publicId,
            playerPseudo: pseudoString(player),
        });

        return tournamentSubscription;
    }

    async getBannedPlayers(tournament: Tournament): Promise<TournamentBannedPlayer[]>
    {
        return await this.tournamentBannedPlayerRepository.find({
            where: {
                tournament: { publicId: tournament.publicId },
            },
            relations: {
                player: true,
            },
        });
    }

    async isBanned(tournament: Tournament, player: Player): Promise<boolean>
    {
        if (!player.id || !tournament.id) {
            logger.error('Cannot check if player is banned, missing playerId or tournamentId', {
                playerId: player.id,
                tournamentId: tournament.id,
                tournamentPublicId: tournament.publicId,
            });

            throw new Error('Error while checking if player is banned');
        }

        const result = await this.tournamentBannedPlayerRepository.countBy({
            playerId: player.id,
            tournamentId: tournament.id,
        });

        return result > 0;
    }

    /**
     * Ban a given player from tournament.
     * Only before tournament started.
     * If player was subscribed, he is unsubscribed and cannot join again.
     * If player wasn't subscribed, he is marked as banned and can't join.
     */
    async banPlayer(activeTournament: ActiveTournament, player: Player): Promise<TournamentBannedPlayer>
    {
        const tournament = activeTournament.getTournament();

        if ('created' !== tournament.state) {
            throw new TournamentError('Cannot ban player, tournament already started');
        }

        // Mark player as banned if not yet done
        let tournamentBannedPlayer = await this.tournamentBannedPlayerRepository
            .findOneBy({
                player: { publicId: player.publicId },
                tournament: { publicId: tournament.publicId },
            })
        ;

        if (null === tournamentBannedPlayer) {
            tournamentBannedPlayer = new TournamentBannedPlayer();

            tournamentBannedPlayer.tournament = tournament;
            tournamentBannedPlayer.player = player;

            await this.tournamentBannedPlayerRepository.save(tournamentBannedPlayer);
        }

        // Log ban in tournament history if player subscription has been removed
        if (null !== this.unsubscribe(tournament, player)) {
            addTournamentHistory(tournament, 'player_banned', {
                playerPseudo: player.pseudo,
                playerPublicId: player.publicId,
            });
        }

        return tournamentBannedPlayer;
    }

    /**
     * Unban player from tournament.
     * Player will be allowed again to subscribe to tournament.
     */
    async unbanPlayer(activeTournament: ActiveTournament, player: Player): Promise<void>
    {
        const tournament = activeTournament.getTournament();

        if ('created' !== tournament.state) {
            throw new TournamentError('Cannot ban player, tournament already started');
        }

        if (!player.id || !tournament.id) {
            logger.error('Cannot unban player, missing playerId or tournamentId', {
                playerId: player.id,
                tournamentId: tournament.id,
                tournamentPublicId: tournament.publicId,
            });

            throw new Error('Error while unban player');
        }

        await this.tournamentBannedPlayerRepository.delete({
            playerId: player.id,
            tournamentId: tournament.id,
        });
    }

    // TODO add/remove player manually by host

    // TODO multiple hosts
    // allow to add other hosts to tournament

    // TODO hot replacements
    // when tournament started, but a player don't play, allow to replace his seat by another player
}
