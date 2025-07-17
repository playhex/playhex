import { TypedEmitter } from 'tiny-typed-emitter';
import { Tournament, TournamentGame, TournamentParticipant, TournamentSubscription } from '../../shared/app/models/index.js';
import baseLogger from '../services/logger.js';
import { getStrictLoserPlayer, getStrictWinnerIndex, getStrictWinnerPlayer, isStateEnded } from '../../shared/app/hostedGameUtils.js';
import { CannotStartTournamentGameError, GamePlayerNotFoundTournamentError, NotEnoughParticipantsToStartTournamentError, TournamentError } from './TournamentError.js';
import { TournamentEngineInterface } from './organizers/TournamentEngineInterface.js';
import { createGameOptionsForTournament, tournamentStartsAutomatically, sortAndRankParticipants, tournamentMatchNumber, findTournamentGameByRoundAndNumber, getRoundAndNumberFromString, slugifyTournamentName, getCheckInOpensDate } from '../../shared/app/tournamentUtils.js';
import HostedGameServer from '../HostedGameServer.js';
import { addTournamentHistory } from '../../shared/app/models/TournamentHistory.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';
import { HostedGameAccessorInterface } from './hosted-game-accessor/HostedGameAccessorInterface.js';
import { AutoSaveInterface } from '../auto-save/AutoSaveInterface.js';
import { isSameTimeControlType, timeControlToString } from '../../shared/app/timeControlUtils.js';
import { notifier } from '../services/notifications/notifier.js';

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

    /**
     * Timeout when check-in period opens.
     * Used to emit event, and then notify subscribed players.
     */
    private checkInPeriodOpensTimeout: null | NodeJS.Timeout = null;

    /**
     * Whether event already been sent.
     * Security to prevent notifying players multiple times.
     *
     * But if server restart, players will be re-notified.
     */
    private checkInPeriodOpenEventAlreadySend = false;

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

        await this.tournamentEngine.reloadTournament(this.tournament);

        // Must listen before startOnDate or iterateTournament because they may emit those events
        this.on('started', () => this.save());
        this.on('gameStarted', () => this.save());
        this.on('gameEnded', () => this.save());
        this.on('ended', () => this.save());

        if ('created' === this.tournament.state) {
            this.autoNotifyCheckInPeriodOpens();
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

    /**
     * Emits event when check-in period opens,
     * or set a timeout to emit it at date.
     */
    private autoNotifyCheckInPeriodOpens(): void
    {
        if (null !== this.checkInPeriodOpensTimeout) {
            clearTimeout(this.checkInPeriodOpensTimeout);
            this.startTournamentTimeout = null;
        }

        if (this.checkInPeriodOpenEventAlreadySend) {
            return;
        }

        if ('created' !== this.tournament.state) {
            return;
        }

        const checkInOpensIn = getCheckInOpensDate(this.tournament).getTime() - new Date().getTime();

        if (checkInOpensIn <= 0) {
            notifier.emit('tournamentCheckInOpen', this.tournament);
            this.checkInPeriodOpenEventAlreadySend = true;
            return;
        }

        setTimeout(
            () => this.autoNotifyCheckInPeriodOpens(),
            Math.min(checkInOpensIn, 86400000 * 7), // Prevent setting a large number. Instead, retry later
        );
    }

    getTournament(): Tournament
    {
        return this.tournament;
    }

    async startNow(): Promise<void>
    {
        this.logger.info('Tournament started now, with startNow()');

        await this.doStartTournament();
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
                await this.doStartTournament();
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

        const activeTournamentGames = await this.tournamentEngine.getStillActiveGames(this.tournament);

        // Check that we have not missed to report winner to tournament engine
        for (const tournamentGame of activeTournamentGames) {
            if ('done' === tournamentGame.state) {
                this.logger.warning('A game was done, but still active in tournament engine. Reporting winner.', {
                    tournamentGameId: tournamentGame.id,
                    hostedGamePublicId: tournamentGame.hostedGame?.publicId,
                    round: tournamentGame.round,
                    number: tournamentGame.number,
                });

                await this.doMarkGameAsEnded(tournamentGame);
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

        await this.tournamentEngine.updateTournamentGames(this.tournament);

        this.logger.debug('Check if created games can be started');

        for (const tournamentGame of this.tournament.games) {
            if ('waiting' !== tournamentGame.state) {
                continue;
            }

            const matchNumber = tournamentMatchNumber(tournamentGame);

            this.logger.debug('Check if waiting game can start', { matchNumber });

            if (null === tournamentGame.player1) {
                this.logger.debug('No, player1 not yet known');
                continue;
            }

            if (null === tournamentGame.player2) {
                this.logger.debug('No, player2 not yet known');
                continue;
            }

            try {
                this.tournamentEngine.checkBeforeStart(this.tournament, tournamentGame);
                await this.doStartTournamentGame(tournamentGame);

                this.logger.info('Started a tournament game', {
                    matchNumber,
                    player1: tournamentGame.player1?.pseudo,
                    player2: tournamentGame.player2?.pseudo,
                });
            } catch (e) {
                if (!(e instanceof CannotStartTournamentGameError)) {
                    throw e;
                }

                this.logger.debug('Cannot start yet, waiting again', {
                    matchNumber,
                    reason: e.message,
                });
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
    private async doStartTournament(): Promise<void>
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
            await this.tournamentEngine.start(this.tournament);
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
            this.tournament.participants = [];

            if (e instanceof NotEnoughParticipantsToStartTournamentError) {
                this.logger.notice('Tried to start tournament, but could not: not enough participants');
                throw e;
            }

            this.logger.error(e.message, e);
            throw e;
        }
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

        await this.doMarkGameAsEnded(tournamentGame);
    }

    private async doMarkGameAsEnded(tournamentGame: TournamentGame): Promise<void>
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

        await this.tournamentEngine.reportWinner(this.tournament, tournamentGame, winnerIndex);
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
            await this.doMarkGameAsEnded(tournamentGame);
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

        const cancelNextGame = (roundAndNumber: null | string): void => {
            if (null === roundAndNumber) {
                return;
            }

            const { round, number } = getRoundAndNumberFromString(roundAndNumber);
            const tournamentGame = findTournamentGameByRoundAndNumber(this.tournament, round, number);

            if (tournamentGame?.hostedGame) {
                this.hostedGameAccessor
                    .getHostedGameServer(tournamentGame?.hostedGame.publicId)
                    ?.systemCancel()
                ;
            }
        };

        cancelNextGame(tournamentGame.winnerPath);
        cancelNextGame(tournamentGame.loserPath);

        this.tournamentEngine.resetAndRecreateGame(this.tournament, tournamentGame);

        await this.doStartTournamentGame(tournamentGame);
    }

    /**
     * Edit tournament properties.
     * Logs edits in tournament history.
     *
     * @param edited New values to set.
     *
     * @throws {TournamentError} If tournament has already started, or has ended.
     */
    async editTournament(edited: Tournament): Promise<Tournament>
    {
        if ('created' !== this.tournament.state) {
            throw new TournamentError('Cannot edit, tournament has already started');
        }

        const now = new Date();

        if (edited.title !== this.tournament.title) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'title',
                value: edited.title,
                oldValue: this.tournament.title,
            }, now);

            this.tournament.title = edited.title;
            this.tournament.slug = slugifyTournamentName(edited.title);
        }

        if (edited.description !== this.tournament.description) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'description',
                value: edited.description?.substring(0, 12) ?? '',
                oldValue: this.tournament.description?.substring(0, 12) ?? '',
            }, now);

            this.tournament.description = edited.description;
        }

        if (edited.stage1Format !== this.tournament.stage1Format) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'stage1Format',
                value: edited.stage1Format,
                oldValue: this.tournament.stage1Format,
            }, now);

            this.tournament.stage1Format = edited.stage1Format;
        }

        if (edited.stage1Rounds !== this.tournament.stage1Rounds) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'stage1Rounds',
                value: edited.stage1Rounds,
                oldValue: this.tournament.stage1Rounds,
            }, now);

            this.tournament.stage1Rounds = edited.stage1Rounds;
        }

        if (edited.consolation !== this.tournament.consolation) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'consolation',
                value: edited.consolation,
                oldValue: this.tournament.consolation,
            }, now);

            this.tournament.consolation = edited.consolation;
        }

        if (edited.ranked !== this.tournament.ranked) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'ranked',
                value: edited.ranked,
                oldValue: this.tournament.ranked,
            }, now);

            this.tournament.ranked = edited.ranked;
        }

        if (edited.boardsize !== this.tournament.boardsize) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'boardsize',
                value: edited.boardsize,
                oldValue: this.tournament.boardsize,
            }, now);

            this.tournament.boardsize = edited.boardsize;
        }

        if (!isSameTimeControlType(edited.timeControl, this.tournament.timeControl)) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'timeControl',
                value: timeControlToString(edited.timeControl),
                oldValue: timeControlToString(this.tournament.timeControl),
            }, now);

            this.tournament.timeControl = edited.timeControl;
        }

        if (edited.accountRequired !== this.tournament.accountRequired) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'accountRequired',
                value: edited.accountRequired,
                oldValue: this.tournament.accountRequired,
            }, now);

            this.tournament.accountRequired = edited.accountRequired;
        }

        if (edited.startOfficialAt.getTime() !== this.tournament.startOfficialAt.getTime()) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'officiallyStartsAt',
                value: edited.startOfficialAt,
                oldValue: this.tournament.startOfficialAt,
            }, now);

            this.tournament.startOfficialAt = edited.startOfficialAt;
        }

        if (edited.checkInOpenOffsetSeconds !== this.tournament.checkInOpenOffsetSeconds) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'checkInOpenOffsetSeconds',
                value: edited.checkInOpenOffsetSeconds,
                oldValue: this.tournament.checkInOpenOffsetSeconds,
            }, now);

            this.tournament.checkInOpenOffsetSeconds = edited.checkInOpenOffsetSeconds;
        }

        if (edited.startDelayInSeconds !== this.tournament.startDelayInSeconds) {
            addTournamentHistory(this.tournament, 'edited', {
                field: 'startDelayInSeconds',
                value: edited.startDelayInSeconds,
                oldValue: this.tournament.startDelayInSeconds,
            }, now);

            this.tournament.startDelayInSeconds = edited.startDelayInSeconds;
        }

        await this.autoSave.save();

        // In case start date, check in or delay time have been updated, recalculate timeout.
        // Will maybe start tournament, so should persist tournament first, then maybe start tournament.
        this.autoNotifyCheckInPeriodOpens();
        this.autoStartOnDate();

        return this.tournament;
    }

    async editTournamentAdmin(edited: Tournament): Promise<Tournament>
    {
        if (undefined !== edited.featuredFromInSeconds) {
            this.tournament.featuredFromInSeconds = edited.featuredFromInSeconds;
        }

        return await this.autoSave.save();
    }
}
