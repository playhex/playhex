import { TypedEmitter } from 'tiny-typed-emitter';
import { areSamePlayers, deduplicatePlayers } from '../../shared/app/playerUtils.js';
import { Player, Tournament, TournamentAdmin, TournamentMatch, TournamentParticipant, TournamentSubscription } from '../../shared/app/models/index.js';
import baseLogger from '../services/logger.js';
import { getStrictLoserPlayer, getStrictWinnerIndex, getStrictWinnerPlayer, isStateEnded } from '../../shared/app/hostedGameUtils.js';
import { CannotStartTournamentMatchError, GamePlayerNotFoundTournamentError, NotEnoughParticipantsToStartTournamentError, TournamentError } from './TournamentError.js';
import { TournamentEngineInterface } from './organizers/TournamentEngineInterface.js';
import { createGameOptionsForTournament, tournamentStartsAutomatically, sortAndRankParticipants, tournamentMatchKey, findTournamentMatchByRoundAndNumber, parseTournamentMatchKey, slugifyTournamentName, getCheckInOpensDate } from '../../shared/app/tournamentUtils.js';
import HostedGameServer from '../HostedGameServer.js';
import { addTournamentHistory } from '../../shared/app/models/TournamentHistory.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';
import { HostedGameAccessorInterface } from './hosted-game-accessor/HostedGameAccessorInterface.js';
import { AutoSaveInterface } from '../auto-save/AutoSaveInterface.js';
import { isSameTimeControlType, timeControlToString } from '../../shared/app/timeControlUtils.js';
import { notifier } from '../services/notifications/notifier.js';

type TournamentEvents = {
    started: () => void;
    gameStarted: (tournamentMatch: TournamentMatch) => void;
    gameEnded: (tournamentMatch: TournamentMatch) => void;
    ended: () => void;
};

/**
 * A tournament that is waiting to start, or running.
 * Matches can be started, ended, results can update...
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

        this.logger.debug('ActiveTournament initialized');
    }

    /**
     * Should be called synchronously when this tournament is created, or loaded from memory.
     */
    async init(): Promise<void>
    {
        if (this.tournament.state === 'ended') {
            return;
        }

        await this.tournamentEngine.reloadTournament(this.tournament);

        // Must listen before startOnDate or iterateTournament because they may emit those events
        this.on('started', () => this.save());
        this.on('gameStarted', () => this.save());
        this.on('gameEnded', () => this.save());
        this.on('ended', () => this.save());

        if (this.tournament.state === 'created') {
            this.autoNotifyCheckInPeriodOpens();
            this.autoStartOnDate();
            return;
        }

        if (this.tournament.state !== 'running') {
            throw new Error(`Unexpected tournament state: "${this.tournament.state}".`);
        }

        for (const tournamentMatch of this.tournament.matches) {
            if (tournamentMatch.hostedGame !== null && tournamentMatch.state === 'playing') {
                const hostedGameServer = this.hostedGameAccessor.getHostedGameServer(tournamentMatch.hostedGame.publicId);

                if (hostedGameServer === null) {
                    this.logger.notice('While tournament initialization, no active hosted game for this tournamentMatch. Assume it will be solved in next iteration and continue with other tournamentMatches', {
                        matchKey: tournamentMatchKey(tournamentMatch),
                        tournamentMatchState: tournamentMatch.state,
                        hostedGameState: tournamentMatch.hostedGame.state,
                    });

                    continue;
                }

                this.listenHostedGameServer(tournamentMatch, hostedGameServer);
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
     * A player decided to not play the tournament anymore
     */
    async playerSelfUnsubscribe(playerPublicId: string): Promise<null | TournamentSubscription>
    {
        if (this.tournament.state !== 'created') {
            throw new TournamentError('Too late to unsubscribe, tournament started');
        }

        const subscription = await this.removeSubscription(playerPublicId);

        if (subscription === null) {
            return null;
        }

        addTournamentHistory(this.tournament, 'player_unsubscribed', {
            playerPublicId: subscription.player.publicId,
            playerPseudo: pseudoString(subscription.player),
        });

        await this.save();

        return subscription;
    }

    /**
     * Host kicked a player from tournament.
     * Only before tournament started.
     * He may join again.
     */
    async hostKick(playerPublicId: string): Promise<null | TournamentSubscription>
    {
        if (this.tournament.state !== 'created') {
            throw new TournamentError('Cannot ban player, tournament already started');
        }

        const subscription = await this.removeSubscription(playerPublicId);

        if (subscription === null) {
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
        if (this.startTournamentTimeout !== null) {
            clearTimeout(this.startTournamentTimeout);
            this.startTournamentTimeout = null;
        }

        if (this.tournament.state !== 'created') {
            return;
        }

        const autoStartDate = tournamentStartsAutomatically(this.tournament);

        if (autoStartDate === null) {
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
        if (this.checkInPeriodOpensTimeout !== null) {
            clearTimeout(this.checkInPeriodOpensTimeout);
            this.startTournamentTimeout = null;
        }

        if (this.checkInPeriodOpenEventAlreadySend) {
            return;
        }

        if (this.tournament.state !== 'created') {
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

        if (this.tournament.state === 'ended') {
            this.logger.debug('Ended, do nothing');
            return;
        }

        const now = new Date();

        if (this.tournament.state === 'created') {
            if (now < this.tournament.startOfficialAt) {
                this.logger.debug('Tournament not yet started, do nothing');
                return;
            }

            const autoStartDate = tournamentStartsAutomatically(this.tournament);

            if (autoStartDate === null) {
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

        this.logger.debug('Tournament is playing, progress tournament matchs');


        // First mark games as ended
        await this.endPlayingMatchesIfEnded();

        // Then create new games from updated bracket
        await this.createNextGames();

        this.endTournamentIfEnded();

        this.logger.debug('Workflow end');
    }

    private async endPlayingMatchesIfEnded(): Promise<void>
    {
        this.logger.debug('Check if playing matches have ended');

        // Check playing games has ended
        for (const tournamentMatch of this.tournament.matches) {
            if (tournamentMatch.state === 'playing') {
                await this.checkPlayingGameHasEnded(tournamentMatch);
            }
        }

        const activeTournamentMatches = await this.tournamentEngine.getActiveMatches(this.tournament);

        // Check that we have not missed to report winner to tournament engine
        for (const tournamentMatch of activeTournamentMatches) {
            if (tournamentMatch.state === 'done') {
                this.logger.warning('A game was done, but still active in tournament engine. Reporting winner.', {
                    tournamentMatchId: tournamentMatch.id,
                    hostedGamePublicId: tournamentMatch.hostedGame?.publicId,
                    matchKey: tournamentMatchKey(tournamentMatch),
                });

                await this.doMarkGameAsEnded(tournamentMatch);
            }
        }
    }

    /**
     * Get next games from tournament engine bracket,
     * and start games if needed.
     */
    private async createNextGames(): Promise<void>
    {
        this.logger.debug('Add/update tournament matches');

        await this.tournamentEngine.updateTournamentMatches(this.tournament);

        this.logger.debug('Check if created games can be started');

        for (const tournamentMatch of this.tournament.matches) {
            if (tournamentMatch.state !== 'waiting') {
                continue;
            }

            const matchKey = tournamentMatchKey(tournamentMatch);

            this.logger.debug('Check if waiting game can start', { matchKey });

            if (!tournamentMatch.player1) {
                this.logger.debug('No, player1 not yet known');
                continue;
            }

            if (!tournamentMatch.player2) {
                this.logger.debug('No, player2 not yet known');
                continue;
            }

            try {
                this.tournamentEngine.checkBeforeStart(this.tournament, tournamentMatch);
                await this.doStartTournamentMatch(tournamentMatch);

                this.logger.info('Started a tournament match', {
                    matchKey,
                    player1: tournamentMatch.player1?.pseudo ?? '-',
                    player2: tournamentMatch.player2?.pseudo ?? '-',
                });
            } catch (e) {
                if (!(e instanceof CannotStartTournamentMatchError)) {
                    throw e;
                }

                this.logger.debug('Cannot start yet, waiting again', {
                    matchKey,
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
        if (this.tournament.state !== 'created') {
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

            if (this.startTournamentTimeout !== null) {
                clearTimeout(this.startTournamentTimeout);
                this.startTournamentTimeout = null;
            }

            addTournamentHistory(this.tournament, 'started');

            this.emit('started');
        } catch (e) {
            // If tournament hasn't started, participants array must be empty because will be rebuilt again
            this.tournament.participants = [];

            if (e instanceof NotEnoughParticipantsToStartTournamentError) {
                this.logger.notice('Tried to start tournament, but could not: not enough participants', {
                    tournamentSlug: this.tournament.slug,
                });
                throw e;
            }

            this.logger.error('Unexpected error when starting tournament', {
                message: e.message,
                errorFull: e,
                tournamentSlug: this.tournament.slug,
            });
            throw e;
        }
    }

    /**
     * If game was playing and is now over,
     * mark tournament match as finished and report winner to tournament engine.
     */
    private async checkPlayingGameHasEnded(tournamentMatch: TournamentMatch): Promise<void>
    {
        const { hostedGame } = tournamentMatch;
        const matchKey = tournamentMatchKey(tournamentMatch);

        this.logger.debug('Check if game has ended', {
            matchKey,
            hostedGameState: tournamentMatch.hostedGame?.state,
        });

        if (!hostedGame) {
            this.logger.error('No hostedGame for active tournamentMatch', { matchKey });
            return;
        }

        if (hostedGame.state === 'playing') {
            this.logger.debug('still playing, do nothing.', { matchKey });
            return;
        }

        if (hostedGame.state === 'created') {
            this.logger.error('Unexpected tournament match state: "created"', { matchKey, hostedGamePublicId: hostedGame.publicId });
            return;
        }

        if (hostedGame.state === 'canceled') {
            this.logger.info('game has been canceled, recreate', { matchKey, hostedGamePublicId: hostedGame.publicId });
            await this.doStartTournamentMatch(tournamentMatch);
            addTournamentHistory(this.tournament, 'match_canceled_recreated', {
                group: tournamentMatch.group,
                round: tournamentMatch.round,
                number: tournamentMatch.number,
            });
            return;
        }

        if (!isStateEnded(hostedGame)) {
            this.logger.error('Unexpected tournament match state', { hostedGamePublicId: hostedGame.publicId, state: hostedGame.state });
            return;
        }

        await this.doMarkGameAsEnded(tournamentMatch);
    }

    private async doMarkGameAsEnded(tournamentMatch: TournamentMatch): Promise<void>
    {
        const { hostedGame } = tournamentMatch;
        const matchKey = tournamentMatchKey(tournamentMatch);

        if (!hostedGame) {
            this.logger.error('No hostedGame for active tournamentMatch', { matchKey });
            return;
        }

        if (!isStateEnded(hostedGame)) {
            this.logger.error('doMarkGameAsEnded must be used on "ended" game', { matchKey, hostedGamePublicId: hostedGame.publicId, state: hostedGame.state });
            return;
        }

        const winnerIndex = getStrictWinnerIndex(hostedGame);

        this.logger.info('Tournament game has ended, report winner', { matchKey, winnerIndex });

        await this.tournamentEngine.reportWinner(this.tournament, tournamentMatch, winnerIndex);
        tournamentMatch.state = 'done';
        let endedAt = hostedGame.gameData?.endedAt;

        if (!endedAt) {
            this.logger.warning('No game endedAt date for an ended tournament match. Assume match just ended now.', {
                matchKey,
            });

            endedAt = new Date();
        }

        addTournamentHistory(this.tournament, 'match_ended', {
            hostedGamePublicId: hostedGame.publicId,
            group: tournamentMatch.group,
            round: tournamentMatch.round,
            number: tournamentMatch.number,
            winnerPseudo: pseudoString(getStrictWinnerPlayer(hostedGame)),
            loserPseudo: pseudoString(getStrictLoserPlayer(hostedGame)),
        }, endedAt);

        this.emit('gameEnded', tournamentMatch);
    }

    private async doStartTournamentMatch(tournamentMatch: TournamentMatch): Promise<void>
    {
        const matchKey = tournamentMatchKey(tournamentMatch);

        this.logger.debug('Create and start tournament match', { matchKey });

        if (!tournamentMatch.player1 || !tournamentMatch.player2) {
            this.logger.error('startTournamentMatch() called on tournamentMatch, but still a player missing', { matchKey });
            return;
        }

        tournamentMatch.tournament = this.tournament;

        const hostedGameServer = await this.hostedGameAccessor.createHostedGameServer(createGameOptionsForTournament(this.tournament), tournamentMatch);

        tournamentMatch.state = 'playing';
        tournamentMatch.hostedGame = hostedGameServer.getHostedGame();

        this.listenHostedGameServer(tournamentMatch, hostedGameServer);

        this.emit('gameStarted', tournamentMatch);
    }

    private listenHostedGameServer(tournamentMatch: TournamentMatch, hostedGameServer: HostedGameServer): void
    {
        hostedGameServer.on('ended', async () => {
            await this.doMarkGameAsEnded(tournamentMatch);
            await this.createNextGames();
            this.endTournamentIfEnded();
        });

        hostedGameServer.on('canceled', async () => {
            // Prevent recreate game while we "reset and recreate" previous game.
            if (!tournamentMatch.player1 || !tournamentMatch.player2) {
                this.logger.info('game has been canceled, but do not recreate because players have been removed', {
                    hostedGamePublicId: tournamentMatch.hostedGame?.publicId,
                    matchKey: tournamentMatchKey(tournamentMatch),
                });

                return;
            }

            this.logger.info('game has been canceled, recreate', {
                hostedGamePublicId: tournamentMatch.hostedGame?.publicId,
                matchKey: tournamentMatchKey(tournamentMatch),
            });

            await this.doStartTournamentMatch(tournamentMatch);

            addTournamentHistory(this.tournament, 'match_canceled_recreated', {
                group: tournamentMatch.group,
                round: tournamentMatch.round,
                number: tournamentMatch.number,
            });
        });
    }

    private updateRanking(): void
    {
        this.tournamentEngine.updateParticipantsScore(this.tournament);

        sortAndRankParticipants(this.tournament.participants);
    }

    /**
     * Forfeit a player in a tournament match.
     * Useful if a player does not play and make the tournament stuck.
     *
     * @throws {GamePlayerNotFoundTournamentError} If this game does not exists in this tournament, or if player is not in this game
     * @throws {TournamentError} If cannot forfeit now, because game not yet started or game is already ended
     * @throws {Error} In case of unnexpected error
     */
    forfeitGamePlayer(hostedGamePublicId: string, playerPublicId: string): void
    {
        const tournamentMatch = this.tournament.matches
            .find(g => g.hostedGame?.publicId === hostedGamePublicId)
        ;

        if (!tournamentMatch) {
            throw new GamePlayerNotFoundTournamentError('No hosted game with this public id');
        }

        if (tournamentMatch.state !== 'playing') {
            throw new TournamentError('Cannot forfeit now, tournament match is not playing');
        }

        if (!tournamentMatch.hostedGame) {
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
     * Clear results of a tournament match.
     * For ended games only: results will be reset to 0, and game will be recreated.
     * Depth limited: only for games where next games in brackets are not yet ended.
     *
     * @throws {GamePlayerNotFoundTournamentError} If this game does not exists in this tournament, or if player is not in this game
     * @throws {TooDeepResetError} When trying to reset a match when its child are already done too. Try reset next matches first, then deeper ones.
     * @throws {TournamentError} If cannot forfeit now, because game not yet started or game is already ended
     * @throws {Error} In case of unnexpected error
     */
    async resetAndRecreateGame(hostedGamePublicId: string): Promise<void>
    {
        const tournamentMatch = this.tournament.matches
            .find(g => g.hostedGame?.publicId === hostedGamePublicId)
        ;

        if (!tournamentMatch) {
            throw new GamePlayerNotFoundTournamentError('No hosted game with this public id');
        }

        if (tournamentMatch.state !== 'done') {
            throw new TournamentError('Cannot clear results now, tournament match is not ended');
        }

        if (!tournamentMatch.hostedGame) {
            throw new Error('Missing hosted game');
        }

        const cancelNextGame = (matchKey: null | string): void => {
            if (matchKey === null) {
                return;
            }

            const { group, round, number } = parseTournamentMatchKey(matchKey);
            const tournamentMatch = findTournamentMatchByRoundAndNumber(this.tournament, group, round, number);

            if (!tournamentMatch) {
                return;
            }

            // Must set player1 and player2 to null before cancel game to prevent recreating game
            tournamentMatch.state = 'waiting';
            tournamentMatch.player1 = null;
            tournamentMatch.player2 = null;

            if (tournamentMatch.hostedGame) {
                this.hostedGameAccessor
                    .getHostedGameServer(tournamentMatch.hostedGame.publicId)
                    ?.systemCancel()
                ;

                tournamentMatch.hostedGame = null;
            }
        };

        this.tournamentEngine.resetAndRecreateMatch(this.tournament, tournamentMatch);

        // Cancel next games, and set hostedGame to null
        cancelNextGame(tournamentMatch.winnerPath);
        cancelNextGame(tournamentMatch.loserPath);

        tournamentMatch.state = 'waiting';

        await this.tournamentEngine.updateTournamentMatches(this.tournament);
        await this.doStartTournamentMatch(tournamentMatch);
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
        if (this.tournament.state !== 'created') {
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

    /**
     * Change some tournament values from admin API (not tournament admins)
     */
    async editTournamentAdmin(edited: Tournament): Promise<Tournament>
    {
        if (undefined !== edited.featuredFromInSeconds) {
            this.tournament.featuredFromInSeconds = edited.featuredFromInSeconds;
        }

        return await this.autoSave.save();
    }

    /**
     * Replace tournament admins by these new ones.
     * Players must have been loaded from database to link them to tournament.
     */
    async changeTournamentAdmins(players: Player[]): Promise<void>
    {
        if (areSamePlayers(players, this.tournament.admins.map(admin => admin.player))) {
            return;
        }

        if (players.some(player => !player.id)) {
            throw new Error('Players must have been loaded from database to link them to tournament');
        }

        players = deduplicatePlayers(players);

        const previousAdmins = this.tournament.admins;
        this.tournament.admins = [];

        for (const player of players) {
            const previousAdmin = previousAdmins.find(admin => admin.player.publicId === player.publicId);

            if (previousAdmin) {
                this.tournament.admins.push(previousAdmin);
                continue;
            }

            const admin = new TournamentAdmin();

            admin.player = player;
            admin.tournament = this.tournament;

            this.tournament.admins.push(admin);
        }

        try {
            await this.save();

            addTournamentHistory(this.tournament, 'changed_admins', {
                newAdmins: this.tournament.admins.length === 0
                    ? '- none -'
                    : this.tournament.admins
                        .map(admin => admin.player.pseudo)
                        .join(', ')
                ,
            }, new Date());
        } catch (e) {
            this.tournament.admins = previousAdmins;

            this.logger.error('Error while changing tournament admins', {
                message: e.message,
                e,
            });
        }
    }
}
