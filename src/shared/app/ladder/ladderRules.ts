/**
 * Ladder business rules ("King of the Hill" for players).
 *
 * Every ladder rule lives here, as pure functions: no database, no I/O, no clock
 * (current date is always passed as parameter).
 * Server only loads data, calls these functions, and persists the result.
 * Frontend uses the same functions to display challenge buttons and reasons.
 *
 * Reference: LADDER_RULES.md
 */

import { isLive } from '../timeControlUtils.js';
import type TimeControlType from '../../time-control/TimeControlType.js';

/*
 * ============================================================
 * Types
 * ============================================================
 */

export const ladderPlayerStates = [
    /** Holds a seat in the ladder */
    'active',

    /** Withdrew voluntarily */
    'left',

    /** Removed after too long without any ladder game */
    'removed_inactive',

    /** Removed after too many timeout strikes */
    'removed_strikes',
] as const;

export type LadderPlayerState = typeof ladderPlayerStates[number];

export type LadderChallengeState =
    /**
     * Challenger proposed to play live, waiting for defender answer.
     * No game yet. Already takes a slot on both sides.
     */
    'pending_live'

    /** Game is running */
    | 'playing'

    /** Game ended or canceled, result applied to the ladder */
    | 'ended'
;

export type LadderChallengeResult =
    'challenger_won'
    | 'defender_won'

    /**
     * Game canceled (e.g. timeout before second move): no position change.
     */
    | 'voided'
;

export const ladderEventTypes = [
    'join',
    'leave',
    'removed_inactive',
    'removed_strikes',
    'challenge_result',
    'new_king',
    'giant_slayer',
    'climber',
    'strike',
] as const;

export type LadderEventType = typeof ladderEventTypes[number];

/**
 * Why a player cannot join, or cannot challenge another player.
 * Each value has its translation in "ladder.refusal.<reason>".
 */
export type LadderRefusalReason =
    // join
    | 'guest'
    | 'bot'
    | 'account_too_recent'
    | 'already_member'
    | 'rejoin_too_early'

    // challenge
    | 'not_member'
    | 'cannot_challenge_yourself'
    | 'defender_not_member'
    | 'out_of_range'
    | 'invalid_boardsize'
    | 'no_outgoing_slot'
    | 'defender_incoming_full'
    | 'defender_cooling_down'
    | 'opponent_cooldown'
    | 'diversity_limit'
    | 'defender_diversity_limit'
    | 'already_playing_opponent'
    | 'live_time_control_not_live'
;

/**
 * State of a ladder member, as needed by rules.
 * LadderPlayer entity is compatible with this type.
 */
export type LadderRulesPlayer = {
    playerId: number;
    state: LadderPlayerState;

    /**
     * 1 is the King. null when not active.
     */
    position: null | number;

    /**
     * Seat held when player left or was removed.
     * A challenger beating them after they left still takes this seat.
     */
    leftPosition: null | number;

    /**
     * Incoming slots chosen by player.
     * Effective value is clamped with getEffectiveIncomingSlots().
     */
    incomingSlots: number;

    currentDefenseStreak: number;
    bestDefenseStreak: number;
    consecutiveChallengeWins: number;
    giantSlayerCount: number;
    climberCount: number;

    joinedAt: Date;
    leftAt: null | Date;
    rejoinableAt: null | Date;
    lastGameEndedAt: null | Date;
};

/**
 * A challenge, as needed by rules.
 * LadderChallenge entity is compatible with this type.
 */
export type LadderRulesChallenge = {
    challengerId: number;
    defenderId: number;
    state: LadderChallengeState;
    result: null | LadderChallengeResult;
    createdAt: Date;
    endedAt: null | Date;
};

/**
 * Account of a player wanting to join.
 */
export type LadderRulesAccount = {
    isGuest: boolean;
    isBot: boolean;

    /**
     * Creation date, as guest if the account was created as guest then registered.
     * A player who played as guest for a while can join once registered.
     */
    createdAt: Date;
};

/**
 * How the game of a challenge finished.
 */
export type LadderGameEnd =
    {
        type: 'ended';
        winnerPlayerId: number;

        /**
         * Game outcome: 'path', 'resign', 'time', 'forfeit'.
         */
        outcome: null | string;
    }
    | {
        type: 'canceled';

        /**
         * null when canceled because of a timeout before the second move.
         */
        cancelReason: null | string;

        /**
         * Player who had to play when the game has been canceled.
         */
        playerToMoveId: null | number;
    }
;

/*
 * ============================================================
 * Config
 * ============================================================
 */

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export type LadderRulesConfig = {
    /** Account must have been created at least this long ago to join */
    minAccountAgeMs: number;

    /** Challenge range: can always challenge up to this number of seats above, even further than half the ladder */
    challengeRangeFlatSeats: number;

    /** Seats (from 1) considered as "top", having a single outgoing slot */
    topSeats: number;
    outgoingSlotsTop: number;
    outgoingSlotsUpperHalf: number;
    outgoingSlotsLowerHalf: number;

    /** Seats (from 1) having the highest minimum incoming slots */
    summitSeats: number;
    minIncomingSlotsSummit: number;
    minIncomingSlotsTop: number;
    minIncomingSlotsOthers: number;
    maxIncomingSlots: number;

    /** After one of their games ended, player cannot be challenged during this delay */
    coolingDownMs: number;

    /** Cannot play again the same opponent during this delay */
    sameOpponentCooldownMs: number;

    /** Same as above, but when this opponent beat you */
    revengeCooldownMs: number;

    /** At most diversityMaxSameOpponent games against same opponent in your last diversityWindow games */
    diversityWindow: number;
    diversityMaxSameOpponent: number;

    /** strikesToRemove strikes within strikesWindowMs => removed from ladder */
    strikesToRemove: number;
    strikesWindowMs: number;

    /** Can rejoin after this delay when removed because of strikes */
    rejoinAfterStrikesMs: number;

    /** Removed if no ladder game during this delay */
    inactivityMs: number;

    /** Can rejoin after this delay after leaving voluntarily */
    rejoinAfterLeaveMs: number;

    /** Defender has this delay to answer a live proposal, then the correspondence game starts */
    liveProposalAnswerMs: number;

    /** Dethroning a King who defended this many times gives Giant Slayer title */
    giantSlayerMinKingDefenses: number;

    /** This many consecutive challenge wins gives Climber title */
    climberConsecutiveWins: number;

    /** How far back challenges history is needed to evaluate cooldowns and diversity */
    historyLookbackMs: number;
};

export const defaultLadderRulesConfig: LadderRulesConfig = {
    minAccountAgeMs: 7 * DAY,
    challengeRangeFlatSeats: 10,
    topSeats: 10,
    outgoingSlotsTop: 1,
    outgoingSlotsUpperHalf: 2,
    outgoingSlotsLowerHalf: 3,
    summitSeats: 3,
    minIncomingSlotsSummit: 4,
    minIncomingSlotsTop: 3,
    minIncomingSlotsOthers: 2,
    maxIncomingSlots: 5,
    coolingDownMs: 2 * HOUR,
    sameOpponentCooldownMs: 7 * DAY,
    revengeCooldownMs: 2 * DAY,
    diversityWindow: 6,
    diversityMaxSameOpponent: 2,
    strikesToRemove: 2,
    strikesWindowMs: 60 * DAY,
    rejoinAfterStrikesMs: 30 * DAY,
    inactivityMs: 60 * DAY,
    rejoinAfterLeaveMs: 7 * DAY,
    liveProposalAnswerMs: 24 * HOUR,
    giantSlayerMinKingDefenses: 5,
    climberConsecutiveWins: 3,
    historyLookbackMs: 120 * DAY,
};

/*
 * ============================================================
 * Seats, range and slots
 * ============================================================
 */

export type LadderChallengeRange = {
    /** Highest seat (smallest number) that can be challenged */
    from: number;

    /** Lowest seat (biggest number) that can be challenged */
    to: number;
};

/**
 * Seats that player at position can challenge:
 * from ceil(P/2) or P-10, whichever is further up, to P-1.
 *
 * Returns null for the King: nobody to challenge.
 */
export const getChallengeRange = (position: number, config: LadderRulesConfig = defaultLadderRulesConfig): null | LadderChallengeRange => {
    if (position <= 1) {
        return null;
    }

    return {
        from: Math.max(1, Math.min(Math.ceil(position / 2), position - config.challengeRangeFlatSeats)),
        to: position - 1,
    };
};

export const isInChallengeRange = (challengerPosition: number, defenderPosition: number, config: LadderRulesConfig = defaultLadderRulesConfig): boolean => {
    const range = getChallengeRange(challengerPosition, config);

    return range !== null && defenderPosition >= range.from && defenderPosition <= range.to;
};

/**
 * How many challenges a player can send simultaneously:
 * few at the top, many at the bottom.
 */
export const getOutgoingSlots = (position: number, ladderSize: number, config: LadderRulesConfig = defaultLadderRulesConfig): number => {
    if (position <= config.topSeats) {
        return config.outgoingSlotsTop;
    }

    if (position <= Math.ceil(ladderSize / 2)) {
        return config.outgoingSlotsUpperHalf;
    }

    return config.outgoingSlotsLowerHalf;
};

/**
 * Minimum incoming slots: the higher you sit, the more exposed you are.
 */
export const getMinIncomingSlots = (position: number, config: LadderRulesConfig = defaultLadderRulesConfig): number => {
    if (position <= config.summitSeats) {
        return config.minIncomingSlotsSummit;
    }

    if (position <= config.topSeats) {
        return config.minIncomingSlotsTop;
    }

    return config.minIncomingSlotsOthers;
};

/**
 * Incoming slots actually applied: player choice, raised to the minimum of their seat.
 */
export const getEffectiveIncomingSlots = (position: number, chosenIncomingSlots: number, config: LadderRulesConfig = defaultLadderRulesConfig): number => {
    return Math.min(
        config.maxIncomingSlots,
        Math.max(getMinIncomingSlots(position, config), chosenIncomingSlots),
    );
};

/**
 * Incoming slots choices a player can pick at this seat: from seat minimum to max.
 */
export const getIncomingSlotsChoices = (position: number, config: LadderRulesConfig = defaultLadderRulesConfig): number[] => {
    const choices: number[] = [];

    for (let i = getMinIncomingSlots(position, config); i <= config.maxIncomingSlots; ++i) {
        choices.push(i);
    }

    return choices;
};

/**
 * Whether player can choose this number of incoming slots at this seat.
 * If player later climbs to a seat with a higher minimum, the minimum applies.
 */
export const isValidIncomingSlotsChoice = (incomingSlots: number, position: number, config: LadderRulesConfig = defaultLadderRulesConfig): boolean => {
    return Number.isInteger(incomingSlots)
        && incomingSlots >= getMinIncomingSlots(position, config)
        && incomingSlots <= config.maxIncomingSlots
    ;
};

export const isRunningChallenge = (challenge: LadderRulesChallenge): boolean => {
    return challenge.state === 'playing' || challenge.state === 'pending_live';
};

export const countOutgoingChallenges = (playerId: number, challenges: LadderRulesChallenge[]): number => {
    return challenges.filter(c => isRunningChallenge(c) && c.challengerId === playerId).length;
};

export const countIncomingChallenges = (playerId: number, challenges: LadderRulesChallenge[]): number => {
    return challenges.filter(c => isRunningChallenge(c) && c.defenderId === playerId).length;
};

/**
 * Whether player cannot be challenged because one of their games just ended.
 */
export const isCoolingDown = (player: LadderRulesPlayer, now: Date, config: LadderRulesConfig = defaultLadderRulesConfig): boolean => {
    const end = getCoolingDownEnd(player, config);

    return end !== null && now < end;
};

/**
 * Date player can be challenged again after their last game, null if never played.
 */
export const getCoolingDownEnd = (player: LadderRulesPlayer, config: LadderRulesConfig = defaultLadderRulesConfig): null | Date => {
    return player.lastGameEndedAt === null
        ? null
        : new Date(player.lastGameEndedAt.getTime() + config.coolingDownMs)
    ;
};

/*
 * ============================================================
 * Joining, leaving
 * ============================================================
 */

/**
 * Account age, in full days.
 */
export const getAccountAgeDays = (account: LadderRulesAccount, now: Date): number => {
    return Math.floor((now.getTime() - account.createdAt.getTime()) / DAY);
};

export type LadderJoinContext = {
    account: LadderRulesAccount;

    /**
     * Previous ladder membership of this player, if any.
     */
    ladderPlayer: null | LadderRulesPlayer;

    now: Date;
    config?: LadderRulesConfig;
};

export const canJoin = ({ account, ladderPlayer, now, config = defaultLadderRulesConfig }: LadderJoinContext): null | LadderRefusalReason => {
    if (account.isGuest) {
        return 'guest';
    }

    if (account.isBot) {
        return 'bot';
    }

    if (now.getTime() < account.createdAt.getTime() + config.minAccountAgeMs) {
        return 'account_too_recent';
    }

    if (ladderPlayer === null) {
        return null;
    }

    if (ladderPlayer.state === 'active') {
        return 'already_member';
    }

    if (ladderPlayer.rejoinableAt !== null && now.getTime() < ladderPlayer.rejoinableAt.getTime()) {
        return 'rejoin_too_early';
    }

    return null;
};

/**
 * When a player removed from the ladder for this reason can join again.
 * null means immediately.
 */
export const getRejoinableAt = (reason: Exclude<LadderPlayerState, 'active'>, date: Date, config: LadderRulesConfig = defaultLadderRulesConfig): null | Date => {
    switch (reason) {
        case 'left': return new Date(date.getTime() + config.rejoinAfterLeaveMs);
        case 'removed_strikes': return new Date(date.getTime() + config.rejoinAfterStrikesMs);
        case 'removed_inactive': return null;
    }
};

/**
 * Seat of a newcomer: at the bottom.
 */
export const getJoinPosition = (activePlayersCount: number): number => activePlayersCount + 1;

/**
 * Player (re)joining the ladder, at the bottom.
 * Streaks and titles are kept on rejoin.
 */
export const joinLadder = (player: LadderRulesPlayer, activePlayersCount: number, now: Date): void => {
    player.state = 'active';
    player.position = getJoinPosition(activePlayersCount);
    player.leftPosition = null;
    player.joinedAt = now;
    player.leftAt = null;
    player.rejoinableAt = null;
    player.lastGameEndedAt = null;
    player.currentDefenseStreak = 0;
    player.consecutiveChallengeWins = 0;
};

/**
 * Removes player from the ladder (left, inactive, strikes),
 * everyone below moves up one seat.
 */
export const removeFromLadder = (
    players: LadderRulesPlayer[],
    removedPlayer: LadderRulesPlayer,
    reason: Exclude<LadderPlayerState, 'active'>,
    now: Date,
    config: LadderRulesConfig = defaultLadderRulesConfig,
): void => {
    const removedPosition = removedPlayer.position;

    removedPlayer.state = reason;
    removedPlayer.position = null;
    removedPlayer.leftPosition = removedPosition;
    removedPlayer.leftAt = now;
    removedPlayer.rejoinableAt = getRejoinableAt(reason, now, config);

    if (removedPosition === null) {
        return;
    }

    for (const player of players) {
        if (player.state === 'active' && player.position !== null && player.position > removedPosition) {
            --player.position;
        }
    }
};

/**
 * Whether player should be removed for inactivity:
 * no ladder game for too long, and no game running.
 */
export const isInactive = (player: LadderRulesPlayer, hasRunningChallenge: boolean, now: Date, config: LadderRulesConfig = defaultLadderRulesConfig): boolean => {
    if (player.state !== 'active' || hasRunningChallenge) {
        return false;
    }

    return now > getInactivityRemovalDate(player, config);
};

/**
 * Date player will be removed if they play no game until then.
 * No removal while a challenge is running, see isInactive().
 */
export const getInactivityRemovalDate = (player: LadderRulesPlayer, config: LadderRulesConfig = defaultLadderRulesConfig): Date => {
    const lastActivity = Math.max(player.joinedAt.getTime(), player.lastGameEndedAt?.getTime() ?? 0);

    return new Date(lastActivity + config.inactivityMs);
};

/*
 * ============================================================
 * Challenging
 * ============================================================
 */

export type LadderChallengeContext = {
    challenger: null | LadderRulesPlayer;
    defender: null | LadderRulesPlayer;

    /** Number of active players */
    ladderSize: number;

    ladder: {
        boardsizeMin: number;
        boardsizeMax: number;
    };

    /**
     * Board size chosen by challenger.
     * Can be null to check everything except board size (e.g. to display challenge buttons).
     */
    boardsize: null | number;

    /**
     * Running challenges of both players,
     * and their ended challenges within config.historyLookbackMs.
     * Can contain other challenges too.
     */
    challenges: LadderRulesChallenge[];

    now: Date;
    config?: LadderRulesConfig;
};

/**
 * Ended challenges (not voided) of a player, most recent first.
 */
const getPlayedChallenges = (playerId: number, challenges: LadderRulesChallenge[]): LadderRulesChallenge[] => {
    return challenges
        .filter(c => c.state === 'ended' && c.result !== 'voided' && c.endedAt !== null && (c.challengerId === playerId || c.defenderId === playerId))
        .sort((a, b) => b.endedAt!.getTime() - a.endedAt!.getTime())
    ;
};

const isAgainst = (challenge: LadderRulesChallenge, playerA: number, playerB: number): boolean => {
    return (challenge.challengerId === playerA && challenge.defenderId === playerB)
        || (challenge.challengerId === playerB && challenge.defenderId === playerA)
    ;
};

const getWinnerId = (challenge: LadderRulesChallenge): null | number => {
    switch (challenge.result) {
        case 'challenger_won': return challenge.challengerId;
        case 'defender_won': return challenge.defenderId;
        default: return null;
    }
};

/**
 * When a player can play again against an opponent.
 * null if no cooldown.
 */
export const getSameOpponentCooldownEnd = (
    playerId: number,
    opponentId: number,
    challenges: LadderRulesChallenge[],
    config: LadderRulesConfig = defaultLadderRulesConfig,
): null | Date => {
    const lastGame = getPlayedChallenges(playerId, challenges).find(c => isAgainst(c, playerId, opponentId));

    if (!lastGame) {
        return null;
    }

    const opponentWon = getWinnerId(lastGame) === opponentId;

    return new Date(lastGame.endedAt!.getTime() + (opponentWon ? config.revengeCooldownMs : config.sameOpponentCooldownMs));
};

/**
 * Whether a new game between player and opponent would break the diversity rule
 * for player: at most N games against the same opponent in their last M games.
 */
export const breaksDiversityRule = (
    playerId: number,
    opponentId: number,
    challenges: LadderRulesChallenge[],
    config: LadderRulesConfig = defaultLadderRulesConfig,
): boolean => {
    // New game would be one of the last M games, so look at the previous M-1 ones
    const lastGames = [
        ...challenges.filter(c => isRunningChallenge(c) && (c.challengerId === playerId || c.defenderId === playerId)),
        ...getPlayedChallenges(playerId, challenges),
    ].slice(0, config.diversityWindow - 1);

    const againstOpponent = lastGames.filter(c => isAgainst(c, playerId, opponentId)).length;

    return againstOpponent + 1 > config.diversityMaxSameOpponent;
};

/**
 * Whether challenger can challenge defender now.
 * Returns the first reason that prevents it, or null if allowed.
 */
export const canChallenge = ({
    challenger,
    defender,
    ladderSize,
    ladder,
    boardsize,
    challenges,
    now,
    config = defaultLadderRulesConfig,
}: LadderChallengeContext): null | LadderRefusalReason => {
    if (challenger === null || challenger.state !== 'active' || challenger.position === null) {
        return 'not_member';
    }

    if (defender === null || defender.state !== 'active' || defender.position === null) {
        return 'defender_not_member';
    }

    if (challenger.playerId === defender.playerId) {
        return 'cannot_challenge_yourself';
    }

    if (!isInChallengeRange(challenger.position, defender.position, config)) {
        return 'out_of_range';
    }

    if (boardsize !== null && (!Number.isInteger(boardsize) || boardsize < ladder.boardsizeMin || boardsize > ladder.boardsizeMax)) {
        return 'invalid_boardsize';
    }

    if (challenges.some(c => isRunningChallenge(c) && isAgainst(c, challenger.playerId, defender.playerId))) {
        return 'already_playing_opponent';
    }

    if (countOutgoingChallenges(challenger.playerId, challenges) >= getOutgoingSlots(challenger.position, ladderSize, config)) {
        return 'no_outgoing_slot';
    }

    if (countIncomingChallenges(defender.playerId, challenges) >= getEffectiveIncomingSlots(defender.position, defender.incomingSlots, config)) {
        return 'defender_incoming_full';
    }

    if (isCoolingDown(defender, now, config)) {
        return 'defender_cooling_down';
    }

    const cooldownEnd = getSameOpponentCooldownEnd(challenger.playerId, defender.playerId, challenges, config);

    if (cooldownEnd !== null && now.getTime() < cooldownEnd.getTime()) {
        return 'opponent_cooldown';
    }

    if (breaksDiversityRule(challenger.playerId, defender.playerId, challenges, config)) {
        return 'diversity_limit';
    }

    if (breaksDiversityRule(defender.playerId, challenger.playerId, challenges, config)) {
        return 'defender_diversity_limit';
    }

    return null;
};

export type LadderChallengeableCandidate = {
    playerId: number;
    position: number;
    refusal: null | LadderRefusalReason;
};

/**
 * All players in challenger's range, with whether they can be challenged now, and why not.
 */
export const listChallengeCandidates = (
    challenger: LadderRulesPlayer,
    players: LadderRulesPlayer[],
    context: Omit<LadderChallengeContext, 'challenger' | 'defender' | 'boardsize'>,
): LadderChallengeableCandidate[] => {
    if (challenger.state !== 'active' || challenger.position === null) {
        return [];
    }

    const range = getChallengeRange(challenger.position, context.config);

    if (range === null) {
        return [];
    }

    return players
        .filter(p => p.state === 'active' && p.position !== null && p.position >= range.from && p.position <= range.to)
        .sort((a, b) => a.position! - b.position!)
        .map(defender => ({
            playerId: defender.playerId,
            position: defender.position!,
            refusal: canChallenge({ ...context, challenger, defender, boardsize: null }),
        }))
    ;
};

/**
 * Deadline for defender to answer a live proposal.
 */
export const getLiveProposalExpiry = (createdAt: Date, config: LadderRulesConfig = defaultLadderRulesConfig): Date => {
    return new Date(createdAt.getTime() + config.liveProposalAnswerMs);
};

export const isLiveProposalExpired = (createdAt: Date, now: Date, config: LadderRulesConfig = defaultLadderRulesConfig): boolean => {
    return now.getTime() >= getLiveProposalExpiry(createdAt, config).getTime();
};

/**
 * Both players may agree to play live instead, with any live time control.
 */
export const canProposeLive = (liveTimeControlType: TimeControlType, boardsize: number): null | LadderRefusalReason => {
    return isLive({ timeControlType: liveTimeControlType, boardsize })
        ? null
        : 'live_time_control_not_live'
    ;
};

/**
 * Game settings of a ladder challenge: challenger opens, defender may swap.
 */
export const getLadderGameColors = (): { challengerPlaysFirst: true, swapRule: true } => ({
    challengerPlaysFirst: true,
    swapRule: true,
});

/*
 * ============================================================
 * Results
 * ============================================================
 */

export type LadderChallengeOutcome = {
    result: LadderChallengeResult;

    /**
     * Player who timed out and gets a strike, if any.
     */
    strikePlayerId: null | number;
};

/**
 * Timeouts give a strike, resigning never does.
 * A game canceled because a player did not play in time is voided, with a strike to this player.
 * A game canceled by admin or system is voided, without strike.
 */
export const resolveChallengeOutcome = (challengerId: number, defenderId: number, gameEnd: LadderGameEnd): LadderChallengeOutcome => {
    if (gameEnd.type === 'ended') {
        const challengerWon = gameEnd.winnerPlayerId === challengerId;
        const loserId = challengerWon ? defenderId : challengerId;
        const timedOut = gameEnd.outcome === 'time' || gameEnd.outcome === 'forfeit';

        return {
            result: challengerWon ? 'challenger_won' : 'defender_won',
            strikePlayerId: timedOut ? loserId : null,
        };
    }

    const canceledByTimeout = gameEnd.cancelReason === null || gameEnd.cancelReason === 'inactive';

    return {
        result: 'voided',
        strikePlayerId: canceledByTimeout ? gameEnd.playerToMoveId : null,
    };
};

/**
 * Seat a challenger takes by beating this defender:
 * their current seat, or the seat they held when they left the ladder.
 */
export const getDefenderSeat = (defender: LadderRulesPlayer): null | number => {
    return defender.state === 'active'
        ? defender.position
        : defender.leftPosition
    ;
};

/**
 * Seat a player will have if they win this challenge, with current positions.
 * Challenger takes defender seat (see getDefenderSeat()) if it is still above. Defender keeps their seat.
 */
export const getSeatIfWon = (me: LadderRulesPlayer, opponent: LadderRulesPlayer, iAmChallenger: boolean): null | number => {
    if (me.state !== 'active' || me.position === null) {
        return null;
    }

    const opponentSeat = iAmChallenger ? getDefenderSeat(opponent) : null;

    if (opponentSeat !== null && opponentSeat < me.position) {
        return opponentSeat;
    }

    return me.position;
};

/**
 * Moves players after a challenge.
 *
 * Challenger wins: takes the seat the defender occupies now, defender and everyone in between move down one seat.
 * If defender left the ladder while the game was running, challenger takes the seat they held when they left.
 * If challenger is already above this seat (climbed with a parallel challenge), nobody moves.
 * Defender wins, or voided: nobody moves.
 * If challenger left the ladder while the game was running, nobody moves.
 */
export const applyChallengeResult = (
    players: LadderRulesPlayer[],
    challenger: LadderRulesPlayer,
    defender: LadderRulesPlayer,
    result: LadderChallengeResult,
): void => {
    if (result !== 'challenger_won') {
        return;
    }

    const defenderPosition = getDefenderSeat(defender);

    if (challenger.state !== 'active' || challenger.position === null || defenderPosition === null) {
        return;
    }

    const challengerPosition = challenger.position;

    if (challengerPosition < defenderPosition) {
        return;
    }

    for (const player of players) {
        if (player.state === 'active' && player.position !== null && player.position >= defenderPosition && player.position < challengerPosition) {
            ++player.position;
        }
    }

    challenger.position = defenderPosition;
};

/**
 * Whether player should be removed from the ladder, given all their strikes dates (including a new one).
 */
export const shouldRemoveForStrikes = (strikeDates: Date[], now: Date, config: LadderRulesConfig = defaultLadderRulesConfig): boolean => {
    const recentStrikes = strikeDates.filter(date => now.getTime() - date.getTime() <= config.strikesWindowMs);

    return recentStrikes.length >= config.strikesToRemove;
};

export type LadderChallengeEndContext = {
    /** All ladder members, positions will be updated */
    players: LadderRulesPlayer[];

    challenger: LadderRulesPlayer;
    defender: LadderRulesPlayer;
    gameEnd: LadderGameEnd;

    /**
     * Number of defenses of the current King during their reign.
     */
    kingReignDefenses: number;

    /**
     * Previous strikes dates of the player who may get a strike now.
     * Keyed by player id.
     */
    previousStrikes: { [playerId: number]: Date[] };

    now: Date;
    config?: LadderRulesConfig;
};

export type LadderChallengeEndReport = {
    result: LadderChallengeResult;
    strikePlayerId: null | number;

    /** Strike count within the window, for strikePlayerId, including the new one */
    strikesCount: number;

    /** Player removed because of strikes, if any */
    removedForStrikesPlayerId: null | number;

    challengerPositionBefore: null | number;
    defenderPositionBefore: null | number;
    challengerPositionAfter: null | number;
    defenderPositionAfter: null | number;

    /** Challenger became the King */
    newKing: boolean;

    /** King who was dethroned, if any */
    dethronedKingId: null | number;

    /** King who defended successfully */
    kingDefended: boolean;

    giantSlayer: boolean;
    climber: boolean;
};

/**
 * Applies everything that happens when a challenge game ends:
 * outcome, positions, streaks, titles, strikes.
 * Mutates players, returns a report of what happened.
 */
export const endChallenge = ({
    players,
    challenger,
    defender,
    gameEnd,
    kingReignDefenses,
    previousStrikes,
    now,
    config = defaultLadderRulesConfig,
}: LadderChallengeEndContext): LadderChallengeEndReport => {
    const { result, strikePlayerId } = resolveChallengeOutcome(challenger.playerId, defender.playerId, gameEnd);

    const challengerPositionBefore = challenger.position;
    const defenderPositionBefore = defender.position;
    const defenderWasKing = defender.state === 'active' && defender.position === 1;

    applyChallengeResult(players, challenger, defender, result);

    challenger.lastGameEndedAt = now;
    defender.lastGameEndedAt = now;

    let giantSlayer = false;
    let climber = false;
    let newKing = false;
    let kingDefended = false;

    if (result === 'challenger_won') {
        ++challenger.consecutiveChallengeWins;
        defender.currentDefenseStreak = 0;

        if (challenger.consecutiveChallengeWins % config.climberConsecutiveWins === 0) {
            climber = true;
            ++challenger.climberCount;
        }

        if (challenger.position === 1 && challengerPositionBefore !== 1) {
            newKing = true;

            if (defenderWasKing && kingReignDefenses >= config.giantSlayerMinKingDefenses) {
                giantSlayer = true;
                ++challenger.giantSlayerCount;
            }
        }
    }

    if (result === 'defender_won') {
        ++defender.currentDefenseStreak;
        defender.bestDefenseStreak = Math.max(defender.bestDefenseStreak, defender.currentDefenseStreak);
        challenger.consecutiveChallengeWins = 0;
        kingDefended = defenderWasKing;
    }

    let strikesCount = 0;
    let removedForStrikesPlayerId: null | number = null;

    if (strikePlayerId !== null) {
        const strikeDates = [...(previousStrikes[strikePlayerId] ?? []), now];
        const struckPlayer = strikePlayerId === challenger.playerId ? challenger : defender;

        strikesCount = strikeDates.filter(date => now.getTime() - date.getTime() <= config.strikesWindowMs).length;

        if (struckPlayer.state === 'active' && shouldRemoveForStrikes(strikeDates, now, config)) {
            removeFromLadder(players, struckPlayer, 'removed_strikes', now, config);
            removedForStrikesPlayerId = strikePlayerId;
        }
    }

    return {
        result,
        strikePlayerId,
        strikesCount,
        removedForStrikesPlayerId,
        challengerPositionBefore,
        defenderPositionBefore,
        challengerPositionAfter: challenger.position,
        defenderPositionAfter: defender.position,
        newKing,
        dethronedKingId: newKing && defenderWasKing ? defender.playerId : null,
        kingDefended,
        giantSlayer,
        climber,
    };
};

/**
 * The King is whoever holds seat 1.
 * Can change after a challenge, or when the King leaves or is removed.
 */
export const getKing = <T extends LadderRulesPlayer>(players: T[]): null | T => {
    return players.find(p => p.state === 'active' && p.position === 1) ?? null;
};
