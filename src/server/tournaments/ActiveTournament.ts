import { TypedEmitter } from 'tiny-typed-emitter';
import { Tournament, TournamentGame, TournamentParticipant, TournamentSubscription } from '../../shared/app/models/index.js';
import baseLogger from '../services/logger.js';
import { getStrictLoserPlayer, getStrictWinnerIndex, getStrictWinnerPlayer, isStateEnded } from '../../shared/app/hostedGameUtils.js';
import { GamePlayerNotFoundTournamentError, NotEnoughParticipantsToStartTournamentError, TournamentError } from './TournamentError.js';
import { TournamentEngineInterface } from './organizers/TournamentEngineInterface.js';
import { createGameOptionsForTournament, tournamentStartsAutomatically, sortAndRankParticipants, tournamentMatchNumber } from '../../shared/app/tournamentUtils.js';
import HostedGameServer from '../HostedGameServer.js';
import { addTournamentHistory } from '../../shared/app/models/TournamentHistory.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';
import { HostedGameAccessorInterface } from './hosted-game-accessor/HostedGameAccessorInterface.js';
import { AutoSaveInterface } from 'auto-save/AutoSaveInterface.js';

type TournamentEvents = {
    started: () => void;
    gameStarted: (tournamentGame: TournamentGame) => void;
    gameEnded: (tournamentGame: TournamentGame) => void;
    ended: () => void;
};

/**
 * A tournament that can be started, games can end and results reported...
 * This class manages a tournament with the library "tournament-organizer".
 */
export class ActiveTournament extends TypedEmitter<TournamentEvents>
{
    private logger: typeof baseLogger;

    private startTournamentTimeout: null | NodeJS.Timeout = null;

    constructor(
        private tournament: Tournament,
        private tournamentEngine: TournamentEngineInterface,
        private hostedGameAccessor: HostedGameAccessorInterface,
        private autoSave: AutoSaveInterface<Tournament>,
    ) {
        super();

        this.logger = baseLogger.child({
            tournamentSlug: tournament.slug,
        });
    }

    /**
     * Should be called synchronously when this tournament is created, or loaded from memory.
     */
    async init(): Promise<void>
    {
        if ('ended' === this.tournament.state) {
            return;
        }

        this.tournamentEngine.initTournamentEngine(this.tournament);

        // Must listen before startOnDate or iterateTournament because they may emit those events
        this.on('started', () => this.save());
        this.on('gameStarted', () => this.save());
        this.on('gameEnded', () => this.save());
        this.on('ended', () => this.save());

        if ('created' === this.tournament.state) {
            this.autoStartOnDate();
            return;
        }

        if ('running' !== this.tournament.state) {
            throw new Error(`Unexpected tournament state: "${this.tournament.state}".`);
        }

        for (const tournamentGame of this.tournament.games) {
            const matchNumber = tournamentMatchNumber(tournamentGame);

            if (null !== tournamentGame.hostedGame && 'playing' === tournamentGame.state) {
                const hostedGameServer = this.hostedGameAccessor.getHostedGameServer(tournamentGame.hostedGame.publicId);

                if (null === hostedGameServer) {
                    this.logger.notice('While tournament initialization, no active hosted game for this tournamentGame. Assume it will be solved in next iteration and continue with other tournamentGames', {
                        matchNumber,
                        tournamentGameState: tournamentGame.state,
                        hostedGameState: tournamentGame.hostedGame.state,
                    });

                    continue;
                }

                this.listenHostedGameServer(tournamentGame, hostedGameServer);
            }
        }

        await this.iterateTournament();
    }

    async save(): Promise<Tournament>
    {
        return await this.autoSave.save();
    }

    findSubscriptionByPlayerPublicId(publicId: string): null | TournamentSubscription
    {
        return this.tournament.subscriptions
            .find(subscription => subscription.player.publicId === publicId)
            ?? null
        ;
    }

    /**
     * A player subscribe to a tournament.
     * If tournament is in check-in period, player os also checked-in.
     */
    async playerSelfSubscribe(playerPublicId: string): Promise<null | TournamentSubscription>
    {
        if ('created' !== this.tournament.state) {
            throw new TournamentError('Too late to unsubscribe, tournament started');
        }

        const subscription = await this.removeSubscription(playerPublicId);

        if (null === subscription) {
            return null;
        }

        addTournamentHistory(this.tournament, 'player_unsubscribed', {
            playerPublicId: subscription.player.publicId,
            playerPseudo: pseudoString(subscription.player),
        });

        return subscription;
    }

    /**
     * A player decided to not play the tournament anymore
     */
    async playerSelfUnsubscribe(playerPublicId: string): Promise<null | TournamentSubscription>
    {
        if ('created' !== this.tournament.state) {
            throw new TournamentError('Too late to unsubscribe, tournament started');
        }

        const subscription = await this.removeSubscription(playerPublicId);

        if (null === subscription) {
            return null;
        }

        addTournamentHistory(this.tournament, 'player_unsubscribed', {
            playerPublicId: subscription.player.publicId,
            playerPseudo: pseudoString(subscription.player),
        });

        return subscription;
    }

    /**
     * Host kicked a player from tournament.
     * Only before tournament started.
     * He may join again.
     */
    async hostKick(playerPublicId: string): Promise<null | TournamentSubscription>
    {
        if ('created' !== this.tournament.state) {
            throw new TournamentError('Cannot ban player, tournament already started');
        }

        const subscription = await this.removeSubscription(playerPublicId);

        if (null === subscription) {
            return null;
        }

        addTournamentHistory(this.tournament, 'player_kicked', {
            playerPublicId: subscription.player.publicId,
            playerPseudo: pseudoString(subscription.player),
        });

        return subscription;
    }

    /**
     * Remove subscription.
     *
     * @returns TournamentSubscription that has been removed, or null if subscription not in list.
     */
    async removeSubscription(playerPublicId: string): Promise<null | TournamentSubscription>
    {
        const tournamentSubscription = this.tournament.subscriptions
            .find(subscription => subscription.player.publicId === playerPublicId)
        ;

        if (!tournamentSubscription) {
            this.logger.notice('removeSubscription() called, but playerPublicId not found', {
                playerPublicId,
            });

            return null;
        }

        this.tournament.subscriptions = this.tournament.subscriptions
            .filter(subscription => subscription !== tournamentSubscription)
        ;

        return tournamentSubscription;
    }

    /**
     * Unsubscribe player from tournament.
     *
     * @returns TournamentSubscription that has been removed, or null if player wasn't subscribed
     */
    unsubscribePlayer(playerPublicId: string): null | TournamentSubscription
    {
        const tournamentSubscription = this.tournament.subscriptions
            .find(subscription => subscription.player.publicId === playerPublicId)
        ;

        if (!tournamentSubscription) {
            return null;
        }

        this.tournament.subscriptions = this.tournament.subscriptions
            .filter(subscription => subscription !== tournamentSubscription)
        ;

        return tournamentSubscription;
    }

    /**
     * Starts tournament automatically if start date past,
     * or set a timeout to start it at the start date.
     *
     * If tournament auto start is disabled, do nothing.
     */
    private autoStartOnDate(): void
    {
        if (null !== this.startTournamentTimeout) {
            clearTimeout(this.startTournamentTimeout);
            this.startTournamentTimeout = null;
        }

        if ('created' !== this.tournament.state) {
            return;
        }

        const autoStartDate = tournamentStartsAutomatically(this.tournament);

        if (null === autoStartDate) {
            return;
        }

        const startsInMs = autoStartDate.getTime() - new Date().getTime();

        // Tournament date past, start now
        if (startsInMs <= 0) {
            this.iterateTournament();
            return;
        }

        this.startTournamentTimeout = setTimeout(
            () => this.autoStartOnDate(),
            Math.min(startsInMs, 86400000 * 7), // Prevent setting a large number. Instead, retry later
        );
    }

    getTournament(): Tournament
    {
        return this.tournament;
    }

    async startNow(): Promise<void>
    {
        this.logger.info('Tournament started now, with startNow()');

        this.doStartTournament();
        await this.createNextGames();
    }

    /**
     * Run tournament workflow:
     * start it can be started,
     * start games, progress...
     */
    async iterateTournament(): Promise<void>
    {
        this.logger.debug('Workflow begin');

        if ('ended' === this.tournament.state) {
            this.logger.debug('Ended, do nothing');
            return;
        }

        const now = new Date();

        if ('created' === this.tournament.state) {
            if (now < this.tournament.startOfficialAt) {
                this.logger.debug('Tournament not yet started, do nothing');
                return;
            }

            const autoStartDate = tournamentStartsAutomatically(this.tournament);

            if (null === autoStartDate) {
                this.logger.debug('Tournament do not starts automatically, waiting for host to start manually');
                return;
            }

            if (now < autoStartDate) {
                this.logger.debug('Tournament start is imminent, waiting for start delay, or host to start manually', {
                    delayStartInSeconds: this.tournament.startDelayInSeconds,
                    autoStartDate,
                });
                return;
            }

            this.logger.info('Tournament auto start date is past, start it');

            try {
                this.doStartTournament();
            } catch (e) {
                if (e instanceof TournamentError) {
                    this.logger.error('Could not start tournament', { reason: e.message });
                    return;
                }

                throw e;
            }
        }

        this.logger.debug('Tournament is playing, progress tournament games');


        // First mark games as ended
        await this.endPlayingGamesIfEnded();

        // Then create new games from updated bracket
        await this.createNextGames();

        this.endTournamentIfEnded();

        this.logger.debug('Workflow end');
    }

    private async endPlayingGamesIfEnded(): Promise<void>
    {
        this.logger.debug('Check if playing games have ended');

        // Check playing games has ended
        for (const tournamentGame of this.tournament.games) {
            if ('playing' === tournamentGame.state) {
                await this.checkPlayingGameHasEnded(tournamentGame);
            }
        }

        // Check that we have not missed to report winner to tournament engine
        for (const tournamentGame of this.tournamentEngine.getActiveGames(this.tournament)) {
            if ('done' === tournamentGame.state) {
                this.logger.warning('A game was done, but still active in tournament engine. Reporting winner.', {
                    tournamentGameId: tournamentGame.id,
                    hostedGamePublicId: tournamentGame.hostedGame?.publicId,
                    round: tournamentGame.round,
                    number: tournamentGame.number,
                });

                this.doMarkGameAsEnded(tournamentGame);
            }
        }
    }

    /**
     * Get next games from tournament engine bracket,
     * and start games if needed.
     */
    private async createNextGames(): Promise<void>
    {
        this.logger.debug('Add/update tournament games');

        this.tournamentEngine.updateTournamentGames(this.tournament);

        this.logger.debug('Check if created games can be started');

        for (const tournamentGame of this.tournament.games) {
            if ('waiting' === tournamentGame.state) {
                await this.checkWaitingGameCanStart(tournamentGame);
            }
        }

        this.logger.debug('Update scores and rankings');

        this.updateRanking();
    }

    private endTournamentIfEnded(): void
    {
        this.logger.debug('Check whether tournament has ended');

        if (!this.tournamentEngine.isFinished(this.tournament)) {
            this.logger.debug('Tournament has not yet ended');
            return;
        }

        this.tournament.state = 'ended';
        this.tournament.endedAt = new Date();

        addTournamentHistory(this.tournament, 'ended', {}, this.tournament.endedAt);

        this.logger.info('Tournament has ended');

        this.emit('ended');
    }

    /**
     * Start tournament.
     * Either automatically when start date is now,
     * or manually by host.
     */
    private doStartTournament(): void
    {
        if ('created' !== this.tournament.state) {
            throw new Error('Cannot start, already started');
        }

        const checkedInSubscriptions = this.tournament.subscriptions.filter(subscription => subscription.checkedIn);

        this.tournament.participants = [];

        for (const subscription of checkedInSubscriptions) {
            const participant = new TournamentParticipant();

            participant.tournament = this.tournament;
            participant.player = subscription.player;

            this.tournament.participants.push(participant);
        }

        try {
            this.tournamentEngine.start(this.tournament);
            this.tournament.state = 'running';
            this.tournament.startedAt = new Date();

            if (null !== this.startTournamentTimeout) {
                clearTimeout(this.startTournamentTimeout);
                this.startTournamentTimeout = null;
            }

            addTournamentHistory(this.tournament, 'started');

            this.emit('started');
        } catch (e) {
            // If tournament hasn't started, participants array must be empty because will be rebuilt again

            if (e instanceof NotEnoughParticipantsToStartTournamentError) {
                this.logger.notice('Tried to start tournament, but could not: not enough participants');
                this.tournament.participants = [];
                throw e;
            }

            if (e instanceof TournamentError) {
                this.tournament.participants = [];
                this.logger.error(e.message, e);
            }

            throw e;
        }
    }

    /**
     * If game is waiting and both participants are known,
     * start the game.
     */
    private async checkWaitingGameCanStart(tournamentGame: TournamentGame): Promise<void>
    {
        const matchNumber = tournamentMatchNumber(tournamentGame);

        this.logger.debug('Check if waiting game can start', { matchNumber });

        if (!tournamentGame.player1 || !tournamentGame.player2) {
            this.logger.debug('Still a missing player, waiting again');
            return;
        }

        await this.doStartTournamentGame(tournamentGame);

        this.logger.info('Started a tournament game', {
            matchNumber,
            player1: tournamentGame.player1.pseudo,
            player2: tournamentGame.player2.pseudo,
        });
    }

    /**
     * If game was playing and is now over,
     * mark tournament game as finished and report winner to tournament engine.
     */
    private async checkPlayingGameHasEnded(tournamentGame: TournamentGame): Promise<void>
    {
        const { hostedGame } = tournamentGame;
        const matchNumber = tournamentMatchNumber(tournamentGame);

        this.logger.debug('Check if game has ended', {
            matchNumber,
            hostedGameState: tournamentGame.hostedGame?.state,
        });

        if (!hostedGame) {
            this.logger.error('No hostedGame for active tournamentGame', { matchNumber });
            return;
        }

        if ('playing' === hostedGame.state) {
            this.logger.debug('still playing, do nothing.', { matchNumber });
            return;
        }

        if ('created' === hostedGame.state) {
            this.logger.error('Unexpected tournament game state: "created"', { matchNumber, hostedGamePublicId: hostedGame.publicId });
            return;
        }

        if ('canceled' === hostedGame.state) {
            this.logger.info('game has been canceled, recreate', { matchNumber, hostedGamePublicId: hostedGame.publicId });
            addTournamentHistory(this.tournament, 'match_canceled_recreated', {
                round: tournamentGame.round,
                number: tournamentGame.number,
            });
            await this.doStartTournamentGame(tournamentGame);
            return;
        }

        if (!isStateEnded(hostedGame)) {
            this.logger.error('Unexpected tournament game state', { hostedGamePublicId: hostedGame.publicId, state: hostedGame.state });
            return;
        }

        this.doMarkGameAsEnded(tournamentGame);
    }

    private doMarkGameAsEnded(tournamentGame: TournamentGame): void
    {
        const { hostedGame } = tournamentGame;
        const matchNumber = tournamentMatchNumber(tournamentGame);

        if (!hostedGame) {
            this.logger.error('No hostedGame for active tournamentGame', { matchNumber });
            return;
        }

        if (!isStateEnded(hostedGame)) {
            this.logger.error('doMarkGameAsEnded must be used on "ended" game', { matchNumber, hostedGamePublicId: hostedGame.publicId, state: hostedGame.state });
            return;
        }

        const winnerIndex = getStrictWinnerIndex(hostedGame);

        this.logger.info('Tournament game has ended, report winner', { matchNumber, winnerIndex });

        this.tournamentEngine.reportWinner(this.tournament, tournamentGame, winnerIndex);
        tournamentGame.state = 'done';
        let endedAt = hostedGame.gameData?.endedAt;

        if (!endedAt) {
            this.logger.warning('No game endedAt date for an ended tournament match. Assume match just ended now.', {
                matchNumber,
            });

            endedAt = new Date();
        }

        addTournamentHistory(this.tournament, 'match_ended', {
            hostedGamePublicId: hostedGame.publicId,
            round: tournamentGame.round,
            number: tournamentGame.number,
            winnerPseudo: pseudoString(getStrictWinnerPlayer(hostedGame)),
            loserPseudo: pseudoString(getStrictLoserPlayer(hostedGame)),
        }, endedAt);

        this.emit('gameEnded', tournamentGame);
    }

    private async doStartTournamentGame(tournamentGame: TournamentGame): Promise<void>
    {
        const matchNumber = tournamentMatchNumber(tournamentGame);

        this.logger.debug('Create and start tournament game', { matchNumber });

        if (!tournamentGame.player1 || !tournamentGame.player2) {
            this.logger.error('startTournamentGame() called on tournamentGame, but still a player missing', { matchNumber });
            return;
        }

        tournamentGame.tournament = this.tournament;

        const hostedGameServer = await this.hostedGameAccessor.createHostedGameServer(createGameOptionsForTournament(this.tournament), tournamentGame);

        tournamentGame.state = 'playing';
        tournamentGame.hostedGame = hostedGameServer.getHostedGame();

        this.listenHostedGameServer(tournamentGame, hostedGameServer);

        this.emit('gameStarted', tournamentGame);
    }

    private listenHostedGameServer(tournamentGame: TournamentGame, hostedGameServer: HostedGameServer): void
    {
        hostedGameServer.on('ended', async () => {
            this.doMarkGameAsEnded(tournamentGame);
            await this.createNextGames();
            this.endTournamentIfEnded();
        });

        hostedGameServer.on('canceled', async () => {
            this.logger.info('game has been canceled, recreate', { hostedGamePublicId: tournamentGame.hostedGame?.publicId });
            await this.doStartTournamentGame(tournamentGame);
        });
    }

    private updateRanking(): void
    {
        this.tournamentEngine.updateParticipantsScore(this.tournament);

        sortAndRankParticipants(this.tournament.participants);
    }

    /**
     * Forfeit a player in a tournament game.
     * Useful if a player does not play and make the tournament stuck.
     *
     * @throws {GamePlayerNotFoundTournamentError} If this game does not exists in this tournament, or if player is not in this game
     * @throws {TournamentError} If cannot forfeit now, because game not yet started or game is already ended
     * @throws {Error} In case of unnexpected error
     */
    forfeitGamePlayer(hostedGamePublicId: string, playerPublicId: string): void
    {
        const tournamentGame = this.tournament.games
            .find(g => g.hostedGame?.publicId === hostedGamePublicId)
        ;

        if (!tournamentGame) {
            throw new GamePlayerNotFoundTournamentError('No hosted game with this public id');
        }

        if ('playing' !== tournamentGame.state) {
            throw new TournamentError('Cannot forfeit now, tournament game is not playing');
        }

        if (!tournamentGame.hostedGame) {
            throw new Error('Missing hosted game');
        }

        const hostedGameServer = this.hostedGameAccessor.getHostedGameServer(hostedGamePublicId);

        if (!hostedGameServer) {
            throw new Error('Missing hosted game server');
        }

        const player = hostedGameServer.getPlayerByPublicId(playerPublicId);

        if (!player) {
            throw new GamePlayerNotFoundTournamentError('This player is not in this game');
        }

        hostedGameServer.systemForfeit(player);
    }

    /**
     * Clear results of a tournament game.
     * For ended games only: results will be reset to 0, and game will be recreated.
     *
     * @throws {GamePlayerNotFoundTournamentError} If this game does not exists in this tournament, or if player is not in this game
     * @throws {TooDeepResetError} When trying to reset a match when its child are already done too. Try reset next matches first, then deeper ones.
     * @throws {TournamentError} If cannot forfeit now, because game not yet started or game is already ended
     * @throws {Error} In case of unnexpected error
     */
    async resetAndRecreateGame(hostedGamePublicId: string): Promise<void>
    {
        const tournamentGame = this.tournament.games
            .find(g => g.hostedGame?.publicId === hostedGamePublicId)
        ;

        if (!tournamentGame) {
            throw new GamePlayerNotFoundTournamentError('No hosted game with this public id');
        }

        if ('done' !== tournamentGame.state) {
            throw new TournamentError('Cannot clear results now, tournament game is not ended');
        }

        if (!tournamentGame.hostedGame) {
            throw new Error('Missing hosted game');
        }

        this.tournamentEngine.resetAndRecreateGame(this.tournament, tournamentGame);

        await this.doStartTournamentGame(tournamentGame);
    }
}
