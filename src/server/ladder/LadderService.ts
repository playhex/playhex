import { Inject, Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { Game, Ladder, LadderChallenge, LadderEvent, LadderPlayer, LadderReign, Player } from '../../shared/app/models/index.js';
import { LadderChallengeCandidateDto, LadderDto, LadderHallOfFameDto, LadderHallOfFamePlayerDto, LadderHallOfFameReignDto, LadderMeDto, LadderPlayerStatusDto } from '../../shared/app/models/LadderDto.js';
import {
    canChallenge,
    canAcceptLive,
    canProposeLive,
    canJoin,
    countIncomingChallenges,
    countOutgoingChallenges,
    defaultLadderRulesConfig,
    endChallenge,
    getAccountAgeDays,
    getEffectiveIncomingSlots,
    getSeatIfWon,
    getKing,
    getOutgoingSlots,
    isInactive,
    isLiveProposalExpired,
    isRunningChallenge,
    isValidIncomingSlotsChoice,
    joinLadder,
    type LadderEventType,
    type LadderGameEnd,
    type LadderRulesConfig,
    listChallengeCandidates,
    removeFromLadder,
} from '../../shared/app/ladder/ladderRules.js';
import type TimeControlType from '../../shared/time-control/TimeControlType.js';
import LadderRepository, { type LadderEntity, type LadderRepositoryInterface } from './LadderRepository.js';
import LadderGameCreator, { type LadderGameCreatorInterface } from './LadderGameCreator.js';
import OnlinePlayersService from '../services/OnlinePlayersService.js';
import { LadderError, LadderRefusalError } from './LadderError.js';
import { KeyedMutex } from './KeyedMutex.js';
import { notifier } from '../services/notifications/notifier.js';
import logger from '../services/logger.js';
import { errorToLogger } from '../../shared/app/utils.js';

const HALL_OF_FAME_SIZE = 10;

/**
 * Used to save only ladder players modified by rules.
 */
const snapshotPlayers = (players: LadderPlayer[]): Map<LadderPlayer, string> => {
    return new Map(players.map(p => [p, snapshotPlayer(p)]));
};

const snapshotPlayer = (p: LadderPlayer): string => JSON.stringify([
    p.state,
    p.position,
    p.leftPosition,
    p.incomingSlots,
    p.currentDefenseStreak,
    p.bestDefenseStreak,
    p.consecutiveChallengeWins,
    p.giantSlayerCount,
    p.climberCount,
    p.joinedAt,
    p.leftAt,
    p.rejoinableAt,
    p.lastGameEndedAt,
]);

const changedPlayers = (players: LadderPlayer[], snapshot: Map<LadderPlayer, string>): LadderPlayer[] => {
    return players.filter(p => snapshot.get(p) !== snapshotPlayer(p));
};

/**
 * Orchestrates ladders: loads data, applies ladderRules, persists.
 * No ladder rule should be written here, only in ladderRules.ts.
 *
 * Every ladder mutation runs exclusively per ladder,
 * so positions are always computed from up to date data.
 */
@Service()
export default class LadderService
{
    private mutex = new KeyedMutex();

    /**
     * Can be changed in tests
     */
    config: LadderRulesConfig = defaultLadderRulesConfig;

    constructor(
        @Inject(() => LadderRepository)
        private ladderRepository: LadderRepositoryInterface,

        @Inject(() => LadderGameCreator)
        private ladderGameCreator: LadderGameCreatorInterface,

        @Inject(() => OnlinePlayersService)
        private onlinePlayersService: Pick<OnlinePlayersService, 'isActive'>,
    ) {}

    async getLadderBySlug(slug: string): Promise<Ladder>
    {
        const ladder = await this.ladderRepository.findLadderBySlug(slug);

        if (ladder === null) {
            throw new LadderError('ladder.not_found', 404);
        }

        return ladder;
    }

    /*
     * ==================== Read ====================
     */

    async getLadderView(ladder: Ladder, now = new Date()): Promise<LadderDto>
    {
        const [players, runningChallenges, currentReign] = await Promise.all([
            this.ladderRepository.findPlayers(ladder.id),
            this.ladderRepository.findRunningChallenges(ladder.id),
            this.ladderRepository.findCurrentReign(ladder.id),
        ]);

        const standings = players
            .filter(p => p.state === 'active')
            .sort((a, b) => a.position! - b.position!)
        ;

        const strikeDates = await this.ladderRepository.findStrikeDates(
            ladder.id,
            standings.map(p => p.playerId),
            new Date(now.getTime() - this.config.strikesWindowMs),
        );

        const dto = new LadderDto();

        dto.ladder = ladder;
        dto.standings = standings;
        dto.runningChallenges = runningChallenges;
        dto.currentReign = currentReign;
        dto.strikes = {};

        for (const ladderPlayer of standings) {
            const count = strikeDates[ladderPlayer.playerId]?.length ?? 0;

            if (count > 0) {
                dto.strikes[ladderPlayer.player.publicId] = count;
            }
        }

        return dto;
    }

    async getMe(ladder: Ladder, player: Player, now = new Date()): Promise<LadderMeDto>
    {
        const [players, challenges, runningChallenges] = await Promise.all([
            this.ladderRepository.findPlayers(ladder.id),
            this.ladderRepository.findRecentChallenges(ladder.id, this.historySince(now)),
            this.ladderRepository.findRunningChallenges(ladder.id),
        ]);

        const ladderPlayer = players.find(p => p.playerId === player.id) ?? null;
        const ladderSize = players.filter(p => p.state === 'active').length;
        const playersById = new Map(players.map(p => [p.playerId, p]));

        const dto = new LadderMeDto();

        await this.fillPlayerStatus(dto, ladder, player.id!, ladderPlayer, players, challenges, runningChallenges, now);

        dto.joinRefusal = ladderPlayer?.state === 'active'
            ? null
            : canJoin({ account: player, ladderPlayer, now, config: this.config })
        ;
        dto.accountAgeDays = getAccountAgeDays(player, now);
        dto.candidates = [];

        if (ladderPlayer !== null && ladderPlayer.state === 'active' && ladderPlayer.position !== null) {
            dto.candidates = listChallengeCandidates(ladderPlayer, players, {
                ladderSize,
                ladder,
                challenges,
                now,
                config: this.config,
            }).map(candidate => {
                const candidateDto = new LadderChallengeCandidateDto();

                candidateDto.player = playersById.get(candidate.playerId)!.player;
                candidateDto.position = candidate.position;
                candidateDto.refusal = candidate.refusal;

                return candidateDto;
            });
        }

        return dto;
    }

    /**
     * Public ladder state of any player: seat, slots, running challenges, stats.
     */
    async getPlayerStatus(ladder: Ladder, playerPublicId: string, now = new Date()): Promise<LadderPlayerStatusDto>
    {
        const [players, challenges, runningChallenges] = await Promise.all([
            this.ladderRepository.findPlayers(ladder.id),
            this.ladderRepository.findRecentChallenges(ladder.id, this.historySince(now)),
            this.ladderRepository.findRunningChallenges(ladder.id),
        ]);

        const ladderPlayer = players.find(p => p.player.publicId === playerPublicId) ?? null;

        if (ladderPlayer === null) {
            throw new LadderError('ladder.player_not_found', 404);
        }

        const dto = new LadderPlayerStatusDto();

        await this.fillPlayerStatus(dto, ladder, ladderPlayer.playerId, ladderPlayer, players, challenges, runningChallenges, now);

        return dto;
    }

    private async fillPlayerStatus(
        dto: LadderPlayerStatusDto,
        ladder: Ladder,
        playerId: number,
        ladderPlayer: null | LadderPlayer,
        players: LadderPlayer[],
        challenges: LadderChallenge[],
        runningChallenges: LadderChallenge[],
        now: Date,
    ): Promise<void> {
        const ladderSize = players.filter(p => p.state === 'active').length;
        const playersById = new Map(players.map(p => [p.playerId, p]));
        const strikeDates = await this.ladderRepository.findStrikeDates(ladder.id, [playerId], new Date(now.getTime() - this.config.strikesWindowMs));

        dto.ladderPlayer = ladderPlayer;
        dto.strikes = strikeDates[playerId]?.length ?? 0;
        dto.runningChallenges = runningChallenges.filter(c => c.challengerId === playerId || c.defenderId === playerId);
        dto.outgoingUsed = countOutgoingChallenges(playerId, challenges);
        dto.incomingUsed = countIncomingChallenges(playerId, challenges);
        dto.outgoingTotal = 0;
        dto.incomingTotal = 0;

        dto.seatsIfWon = {};

        if (ladderPlayer !== null) {
            for (const challenge of dto.runningChallenges) {
                const isChallenger = challenge.challengerId === playerId;
                const opponent = playersById.get(isChallenger ? challenge.defenderId : challenge.challengerId);

                if (opponent) {
                    dto.seatsIfWon[challenge.publicId] = getSeatIfWon(ladderPlayer, opponent, isChallenger);
                }
            }
        }

        if (ladderPlayer !== null && ladderPlayer.state === 'active' && ladderPlayer.position !== null) {
            dto.outgoingTotal = getOutgoingSlots(ladderPlayer.position, ladderSize, this.config);
            dto.incomingTotal = getEffectiveIncomingSlots(ladderPlayer.position, ladderPlayer.incomingSlots, this.config);
        }
    }

    async getHistory(ladder: Ladder, page: number, playerPublicId: null | string = null, perPage = 50): Promise<LadderEvent[]>
    {
        return await this.ladderRepository.findEvents(ladder.id, Math.max(0, page), Math.min(100, Math.max(1, perPage)), playerPublicId);
    }

    async getHallOfFame(ladder: Ladder, now = new Date()): Promise<LadderHallOfFameDto>
    {
        const [reigns, players] = await Promise.all([
            this.ladderRepository.findReigns(ladder.id),
            this.ladderRepository.findPlayers(ladder.id),
        ]);

        const reignDtos = reigns.map(reign => {
            const dto = new LadderHallOfFameReignDto();

            dto.player = reign.player;
            dto.startedAt = reign.startedAt;
            dto.endedAt = reign.endedAt;
            dto.durationMs = (reign.endedAt ?? now).getTime() - reign.startedAt.getTime();
            dto.defenses = reign.defenses;

            return dto;
        });

        const topPlayers = (value: (ladderPlayer: LadderPlayer) => number): LadderHallOfFamePlayerDto[] => players
            .filter(p => value(p) > 0)
            .sort((a, b) => value(b) - value(a))
            .slice(0, HALL_OF_FAME_SIZE)
            .map(p => {
                const dto = new LadderHallOfFamePlayerDto();

                dto.player = p.player;
                dto.value = value(p);

                return dto;
            })
        ;

        const hallOfFame = new LadderHallOfFameDto();

        hallOfFame.longestReigns = [...reignDtos].sort((a, b) => b.durationMs - a.durationMs).slice(0, HALL_OF_FAME_SIZE);
        hallOfFame.mostDefendedReigns = reignDtos.filter(r => r.defenses > 0).sort((a, b) => b.defenses - a.defenses).slice(0, HALL_OF_FAME_SIZE);
        hallOfFame.bestDefenseStreaks = topPlayers(p => p.bestDefenseStreak);
        hallOfFame.giantSlayers = topPlayers(p => p.giantSlayerCount);
        hallOfFame.climbers = topPlayers(p => p.climberCount);

        return hallOfFame;
    }

    /*
     * ==================== Membership ====================
     */

    async join(ladder: Ladder, player: Player, now = new Date()): Promise<LadderPlayer>
    {
        return await this.mutex.runExclusive(ladder.id, async () => {
            const players = await this.ladderRepository.findPlayers(ladder.id);
            let ladderPlayer = players.find(p => p.playerId === player.id) ?? null;

            const refusal = canJoin({ account: player, ladderPlayer, now, config: this.config });

            if (refusal !== null) {
                throw new LadderRefusalError(refusal);
            }

            if (ladderPlayer === null) {
                ladderPlayer = this.createLadderPlayer(ladder, player, now);
                players.push(ladderPlayer);
            }

            const kingBefore = getKing(players);

            joinLadder(ladderPlayer, players.filter(p => p.state === 'active' && p !== ladderPlayer).length, now);

            const toSave: LadderEntity[] = [
                ladderPlayer,
                this.createEvent(ladder, 'join', player, null, null, { position: ladderPlayer.position }, now),
                ...await this.syncReign(ladder, kingBefore, players, now),
            ];

            await this.ladderRepository.saveAll(toSave);

            return ladderPlayer;
        });
    }

    async leave(ladder: Ladder, player: Player, now = new Date()): Promise<void>
    {
        await this.mutex.runExclusive(ladder.id, async () => {
            const players = await this.ladderRepository.findPlayers(ladder.id);
            const ladderPlayer = players.find(p => p.playerId === player.id);

            if (!ladderPlayer || ladderPlayer.state !== 'active') {
                throw new LadderRefusalError('not_member');
            }

            const kingBefore = getKing(players);
            const position = ladderPlayer.position;
            const snapshot = snapshotPlayers(players);

            removeFromLadder(players, ladderPlayer, 'left', now, this.config);

            await this.ladderRepository.saveAll([
                ...changedPlayers(players, snapshot),
                this.createEvent(ladder, 'leave', player, null, null, { position }, now),
                ...await this.syncReign(ladder, kingBefore, players, now),
            ]);
        });
    }

    async setIncomingSlots(ladder: Ladder, player: Player, incomingSlots: number): Promise<LadderPlayer>
    {
        return await this.mutex.runExclusive(ladder.id, async () => {
            const players = await this.ladderRepository.findPlayers(ladder.id);
            const ladderPlayer = players.find(p => p.playerId === player.id);

            if (!ladderPlayer || ladderPlayer.position === null) {
                throw new LadderRefusalError('not_member');
            }

            if (!isValidIncomingSlotsChoice(incomingSlots, ladderPlayer.position, this.config)) {
                throw new LadderError('ladder.invalid_incoming_slots');
            }

            ladderPlayer.incomingSlots = incomingSlots;

            await this.ladderRepository.saveAll([ladderPlayer]);

            return ladderPlayer;
        });
    }

    /*
     * ==================== Challenges ====================
     */

    /**
     * @param liveTimeControlType If set, proposes to play live with this time control, defender must accept.
     */
    async challenge(
        ladder: Ladder,
        challengerPlayer: Player,
        defenderPublicId: string,
        boardsize: number,
        liveTimeControlType: null | TimeControlType,
        now = new Date(),
    ): Promise<LadderChallenge> {
        const challenge = await this.mutex.runExclusive(ladder.id, async () => {
            const [players, challenges] = await Promise.all([
                this.ladderRepository.findPlayers(ladder.id),
                this.ladderRepository.findRecentChallenges(ladder.id, this.historySince(now)),
            ]);

            const challenger = players.find(p => p.playerId === challengerPlayer.id) ?? null;
            const defender = players.find(p => p.player.publicId === defenderPublicId) ?? null;

            const refusal = canChallenge({
                challenger,
                defender,
                ladderSize: players.filter(p => p.state === 'active').length,
                ladder,
                boardsize,
                challenges,
                now,
                config: this.config,
            });

            if (refusal !== null) {
                throw new LadderRefusalError(refusal);
            }

            if (liveTimeControlType !== null) {
                const liveRefusal = canProposeLive(liveTimeControlType, boardsize, this.onlinePlayersService.isActive(defender!.player));

                if (liveRefusal !== null) {
                    throw new LadderRefusalError(liveRefusal);
                }
            }

            const challenge = new LadderChallenge();

            challenge.publicId = uuidv4();
            challenge.ladder = ladder;
            challenge.ladderId = ladder.id;
            challenge.challenger = challenger!.player;
            challenge.challengerId = challenger!.playerId;
            challenge.defender = defender!.player;
            challenge.defenderId = defender!.playerId;
            challenge.boardsize = boardsize;
            challenge.proposedLiveTimeControlType = liveTimeControlType;
            challenge.state = liveTimeControlType === null ? 'playing' : 'pending_live';
            challenge.challengerPositionBefore = challenger!.position;
            challenge.defenderPositionBefore = defender!.position;
            challenge.createdAt = now;

            await this.ladderRepository.saveAll([challenge]);

            if (challenge.state === 'playing') {
                await this.startGame(ladder, challenge, ladder.timeControlType);
            }

            return challenge;
        });

        if (challenge.state === 'pending_live') {
            notifier.emit('ladderLiveProposal', challenge);
        } else {
            notifier.emit('ladderChallenge', challenge);
        }

        return challenge;
    }

    async answerLiveProposal(challengePublicId: string, player: Player, accept: boolean, now = new Date()): Promise<LadderChallenge>
    {
        const challenge = await this.ladderRepository.findChallengeByPublicId(challengePublicId);

        if (challenge === null) {
            throw new LadderError('ladder.challenge_not_found', 404);
        }

        if (challenge.defenderId !== player.id) {
            throw new LadderError('ladder.not_your_challenge', 403);
        }

        return await this.mutex.runExclusive(challenge.ladderId, async () => {
            // Reload inside lock, may have been answered or expired meanwhile
            const current = await this.ladderRepository.findChallengeByPublicId(challengePublicId);

            if (current === null || current.state !== 'pending_live' || current.proposedLiveTimeControlType === null) {
                throw new LadderError('ladder.live_proposal_already_answered', 409);
            }

            // Expired but not yet processed: correspondence game will start
            if (isLiveProposalExpired(current.createdAt, now, this.config)) {
                throw new LadderError('ladder.live_proposal_already_answered', 409);
            }

            if (accept) {
                const refusal = canAcceptLive(this.onlinePlayersService.isActive(current.challenger));

                if (refusal !== null) {
                    throw new LadderRefusalError(refusal);
                }
            }

            current.playedLive = accept;

            await this.startGame(current.ladder, current, accept ? current.proposedLiveTimeControlType : current.ladder.timeControlType);

            return current;
        });
    }

    /**
     * Live proposals without answer in time: start the ladder time control game.
     */
    async startExpiredLiveProposals(now = new Date()): Promise<void>
    {
        const pendingChallenges = await this.ladderRepository.findPendingLiveChallenges();

        for (const challenge of pendingChallenges) {
            if (!isLiveProposalExpired(challenge.createdAt, now, this.config)) {
                continue;
            }

            try {
                await this.mutex.runExclusive(challenge.ladderId, async () => {
                    const current = await this.ladderRepository.findChallengeByPublicId(challenge.publicId);

                    if (current === null || current.state !== 'pending_live') {
                        return;
                    }

                    await this.startGame(current.ladder, current, current.ladder.timeControlType);
                });
            } catch (e) {
                logger.error('Ladder: could not start game of expired live proposal', { challenge: challenge.publicId, ...errorToLogger(e) });
            }
        }
    }

    /**
     * Creates the game of a challenge.
     * If game creation fails, challenge is voided so it no longer takes slots.
     */
    private async startGame(ladder: Ladder, challenge: LadderChallenge, timeControlType: TimeControlType): Promise<void>
    {
        let game: Game;

        try {
            game = await this.ladderGameCreator.createGame(ladder, challenge, timeControlType);
        } catch (e) {
            logger.error('Ladder: could not create game, voiding challenge', { challenge: challenge.publicId, ...errorToLogger(e) });

            challenge.state = 'ended';
            challenge.result = 'voided';
            challenge.endedAt = new Date();

            await this.ladderRepository.saveAll([challenge]);

            throw new LadderError('ladder.game_creation_failed', 500);
        }

        challenge.game = game;
        challenge.state = 'playing';

        await this.ladderRepository.saveAll([challenge]);
    }

    /*
     * ==================== Results ====================
     */

    /**
     * Applies result of a ladder game that ended or has been canceled.
     * Does nothing if game is not a ladder game, or result already applied.
     */
    async onGameOver(game: Game, now = new Date()): Promise<void>
    {
        const gameEnd = this.toLadderGameEnd(game);

        if (gameEnd === null) {
            return;
        }

        const challenge = await this.ladderRepository.findChallengeByGamePublicId(game.publicId);

        if (challenge === null) {
            return;
        }

        await this.mutex.runExclusive(challenge.ladderId, async () => {
            const current = await this.ladderRepository.findChallengeByGamePublicId(game.publicId);

            if (current === null || current.state !== 'playing') {
                return;
            }

            const ladder = current.ladder;
            const [players, currentReign, previousStrikes] = await Promise.all([
                this.ladderRepository.findPlayers(ladder.id),
                this.ladderRepository.findCurrentReign(ladder.id),
                this.ladderRepository.findStrikeDates(ladder.id, [current.challengerId, current.defenderId], new Date(now.getTime() - this.config.strikesWindowMs)),
            ]);

            const challenger = players.find(p => p.playerId === current.challengerId);
            const defender = players.find(p => p.playerId === current.defenderId);

            if (!challenger || !defender) {
                logger.error('Ladder: challenge players not found in ladder', { challenge: current.publicId });
                return;
            }

            const kingBefore = getKing(players);
            const snapshot = snapshotPlayers(players);

            const report = endChallenge({
                players,
                challenger,
                defender,
                gameEnd,
                kingReignDefenses: currentReign?.defenses ?? 0,
                previousStrikes,
                now,
                config: this.config,
            });

            current.state = 'ended';
            current.result = report.result;
            current.endedAt = now;
            current.strikePlayerId = report.strikePlayerId;
            current.strikePlayer = report.strikePlayerId === null ? null : (report.strikePlayerId === challenger.playerId ? challenger.player : defender.player);
            current.challengerPositionBefore = report.challengerPositionBefore;
            current.defenderPositionBefore = report.defenderPositionBefore;
            current.challengerPositionAfter = report.challengerPositionAfter;
            current.defenderPositionAfter = report.defenderPositionAfter;

            const toSave: LadderEntity[] = [current, ...changedPlayers(players, snapshot)];

            toSave.push(this.createEvent(ladder, 'challenge_result', challenger.player, defender.player, current, {
                result: report.result,
                challengerPositionBefore: report.challengerPositionBefore,
                challengerPositionAfter: report.challengerPositionAfter,
                defenderPositionBefore: report.defenderPositionBefore,
                defenderPositionAfter: report.defenderPositionAfter,
            }, now));

            if (report.kingDefended && currentReign !== null) {
                ++currentReign.defenses;
                toSave.push(currentReign);
            }

            if (report.giantSlayer) {
                toSave.push(this.createEvent(ladder, 'giant_slayer', challenger.player, defender.player, current, { kingDefenses: currentReign?.defenses ?? 0 }, now));
            }

            if (report.climber) {
                toSave.push(this.createEvent(ladder, 'climber', challenger.player, null, current, { wins: challenger.consecutiveChallengeWins }, now));
            }

            const struckPlayer = report.strikePlayerId === null
                ? null
                : report.strikePlayerId === challenger.playerId ? challenger : defender
            ;

            if (struckPlayer !== null) {
                toSave.push(this.createEvent(ladder, 'strike', struckPlayer.player, null, current, { strikes: report.strikesCount }, now));
            }

            if (report.removedForStrikesPlayerId !== null && struckPlayer !== null) {
                toSave.push(this.createEvent(ladder, 'removed_strikes', struckPlayer.player, null, current, { strikes: report.strikesCount, position: struckPlayer.leftPosition }, now));
            }

            toSave.push(...await this.syncReign(ladder, kingBefore, players, now, currentReign));

            await this.ladderRepository.saveAll(toSave);

            if (struckPlayer !== null) {
                notifier.emit('ladderStrike', struckPlayer.player, report.strikesCount, report.removedForStrikesPlayerId !== null);
            }
        });
    }

    /**
     * Challenges still playing whose game is already over:
     * result not applied, e.g. server restarted meanwhile.
     */
    async applyMissedResults(): Promise<void>
    {
        const challenges = await this.ladderRepository.findPlayingChallengesWithEndedGame();

        for (const challenge of challenges) {
            if (challenge.game === null) {
                continue;
            }

            logger.info('Ladder: applying missed game result', { challenge: challenge.publicId, game: challenge.game.publicId });

            try {
                await this.onGameOver(challenge.game, challenge.game.endedAt ?? new Date());
            } catch (e) {
                logger.error('Ladder: could not apply missed result', { challenge: challenge.publicId, ...errorToLogger(e) });
            }
        }
    }

    /**
     * Converts a finished game to ladder rules input.
     * null if game is not finished.
     */
    private toLadderGameEnd(game: Game): null | LadderGameEnd
    {
        const playerIdAt = (index: null | number): null | number => {
            if (index === null) {
                return null;
            }

            return game.gameToPlayers.find(gameToPlayer => gameToPlayer.order === index)?.player.id
                ?? game.gameToPlayers[index]?.player.id
                ?? null
            ;
        };

        if (game.state === 'ended') {
            const winnerPlayerId = playerIdAt(game.winner);

            if (winnerPlayerId === null) {
                logger.error('Ladder: ended game without winner', { game: game.publicId });
                return null;
            }

            return { type: 'ended', winnerPlayerId, outcome: game.outcome };
        }

        if (game.state === 'canceled') {
            return {
                type: 'canceled',
                cancelReason: game.cancelReason,
                playerToMoveId: playerIdAt(game.currentPlayerIndex),
            };
        }

        return null;
    }

    /*
     * ==================== Inactivity ====================
     */

    async removeInactivePlayers(now = new Date()): Promise<void>
    {
        const ladders = await this.ladderRepository.findAllLadders();

        for (const ladder of ladders) {
            const removedPlayers = await this.mutex.runExclusive(ladder.id, async () => {
                const [players, runningChallenges] = await Promise.all([
                    this.ladderRepository.findPlayers(ladder.id),
                    this.ladderRepository.findRunningChallenges(ladder.id),
                ]);

                const kingBefore = getKing(players);
                const snapshot = snapshotPlayers(players);
                const toSave: LadderEntity[] = [];
                const removed: Player[] = [];

                for (const ladderPlayer of players) {
                    const hasRunningChallenge = runningChallenges.some(c => isRunningChallenge(c) && (c.challengerId === ladderPlayer.playerId || c.defenderId === ladderPlayer.playerId));

                    if (!isInactive(ladderPlayer, hasRunningChallenge, now, this.config)) {
                        continue;
                    }

                    const position = ladderPlayer.position;

                    removeFromLadder(players, ladderPlayer, 'removed_inactive', now, this.config);
                    toSave.push(this.createEvent(ladder, 'removed_inactive', ladderPlayer.player, null, null, { position }, now));
                    removed.push(ladderPlayer.player);
                }

                if (removed.length === 0) {
                    return removed;
                }

                await this.ladderRepository.saveAll([
                    ...changedPlayers(players, snapshot),
                    ...toSave,
                    ...await this.syncReign(ladder, kingBefore, players, now),
                ]);

                return removed;
            });

            for (const player of removedPlayers) {
                notifier.emit('ladderRemovedInactive', player);
            }
        }
    }

    /*
     * ==================== Helpers ====================
     */

    private historySince(now: Date): Date
    {
        return new Date(now.getTime() - this.config.historyLookbackMs);
    }

    private createLadderPlayer(ladder: Ladder, player: Player, now: Date): LadderPlayer
    {
        const ladderPlayer = new LadderPlayer();

        ladderPlayer.ladder = ladder;
        ladderPlayer.ladderId = ladder.id;
        ladderPlayer.player = player;
        ladderPlayer.playerId = player.id!;
        ladderPlayer.state = 'active';
        ladderPlayer.position = null;
        ladderPlayer.leftPosition = null;
        ladderPlayer.incomingSlots = this.config.minIncomingSlotsOthers;
        ladderPlayer.currentDefenseStreak = 0;
        ladderPlayer.bestDefenseStreak = 0;
        ladderPlayer.consecutiveChallengeWins = 0;
        ladderPlayer.giantSlayerCount = 0;
        ladderPlayer.climberCount = 0;
        ladderPlayer.joinedAt = now;
        ladderPlayer.leftAt = null;
        ladderPlayer.rejoinableAt = null;
        ladderPlayer.lastGameEndedAt = null;

        return ladderPlayer;
    }

    private createEvent(
        ladder: Ladder,
        type: LadderEventType,
        player: Player,
        otherPlayer: null | Player,
        challenge: null | LadderChallenge,
        parameters: LadderEvent['parameters'],
        now: Date,
    ): LadderEvent {
        const event = new LadderEvent();

        event.ladder = ladder;
        event.ladderId = ladder.id;
        event.type = type;
        event.player = player;
        event.otherPlayer = otherPlayer;
        event.challenge = challenge;
        event.parameters = parameters;
        event.createdAt = now;

        return event;
    }

    /**
     * Ends the current reign and starts a new one if the King changed.
     * Returns entities to save.
     */
    private async syncReign(
        ladder: Ladder,
        kingBefore: null | LadderPlayer,
        players: LadderPlayer[],
        now: Date,
        currentReign?: null | LadderReign,
    ): Promise<LadderEntity[]> {
        const kingAfter = getKing(players);

        if (kingBefore?.playerId === kingAfter?.playerId) {
            return [];
        }

        const reign = currentReign !== undefined ? currentReign : await this.ladderRepository.findCurrentReign(ladder.id);
        const toSave: LadderEntity[] = [];

        if (reign !== null && reign.endedAt === null) {
            reign.endedAt = now;
            toSave.push(reign);
        }

        if (kingAfter !== null) {
            const newReign = new LadderReign();

            newReign.ladder = ladder;
            newReign.ladderId = ladder.id;
            newReign.player = kingAfter.player;
            newReign.playerId = kingAfter.playerId;
            newReign.startedAt = now;
            newReign.endedAt = null;
            newReign.defenses = 0;

            toSave.push(newReign);
            toSave.push(this.createEvent(ladder, 'new_king', kingAfter.player, kingBefore?.player ?? null, null, {}, now));
        }

        return toSave;
    }
}
