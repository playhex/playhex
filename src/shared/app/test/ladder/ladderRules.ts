import assert from 'node:assert';
import { describe, it } from 'mocha';
import {
    applyChallengeResult,
    breaksDiversityRule,
    canChallenge,
    canJoin,
    defaultLadderRulesConfig,
    endChallenge,
    getChallengeRange,
    getEffectiveIncomingSlots,
    getIncomingSlotsChoices,
    getMinIncomingSlots,
    getOutgoingSlots,
    getSameOpponentCooldownEnd,
    getSeatIfWon,
    isInactive,
    isValidIncomingSlotsChoice,
    joinLadder,
    type LadderChallengeContext,
    type LadderRulesAccount,
    type LadderRulesChallenge,
    type LadderRulesPlayer,
    listChallengeCandidates,
    removeFromLadder,
    resolveChallengeOutcome,
    shouldRemoveForStrikes,
} from '../../ladder/ladderRules.js';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const now = new Date('2026-09-01T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);

const createPlayer = (playerId: number, position: null | number = playerId): LadderRulesPlayer => ({
    playerId,
    state: position === null ? 'left' : 'active',
    position,
    leftPosition: null,
    incomingSlots: 2,
    currentDefenseStreak: 0,
    bestDefenseStreak: 0,
    consecutiveChallengeWins: 0,
    giantSlayerCount: 0,
    climberCount: 0,
    joinedAt: ago(30 * DAY),
    leftAt: null,
    rejoinableAt: null,
    lastGameEndedAt: null,
});

/**
 * Creates a ladder with players 1..n at positions 1..n
 */
const createLadder = (n: number): LadderRulesPlayer[] => Array.from({ length: n }, (_, i) => createPlayer(i + 1));

const endedChallenge = (challengerId: number, defenderId: number, result: 'challenger_won' | 'defender_won', endedAgoMs: number): LadderRulesChallenge => ({
    challengerId,
    defenderId,
    state: 'ended',
    result,
    createdAt: ago(endedAgoMs + DAY),
    endedAt: ago(endedAgoMs),
});

const runningChallenge = (challengerId: number, defenderId: number): LadderRulesChallenge => ({
    challengerId,
    defenderId,
    state: 'playing',
    result: null,
    createdAt: ago(HOUR),
    endedAt: null,
});

const challengeContext = (players: LadderRulesPlayer[], challengerId: number, defenderId: number, challenges: LadderRulesChallenge[] = []): LadderChallengeContext => ({
    challenger: players.find(p => p.playerId === challengerId) ?? null,
    defender: players.find(p => p.playerId === defenderId) ?? null,
    ladderSize: players.filter(p => p.state === 'active').length,
    ladder: { boardsizeMin: 11, boardsizeMax: 19 },
    boardsize: 13,
    challenges,
    now,
});

describe('ladderRules', () => {
    it('gives seat if won', () => {
        const players = createLadder(8);

        assert.strictEqual(getSeatIfWon(players[7], players[4], true), 5);
        assert.strictEqual(getSeatIfWon(players[4], players[7], false), 5, 'defender keeps seat');

        // 5 challenged 6, then climbed above 4 with a parallel challenge
        applyChallengeResult(players, players[5], players[3], 'challenger_won');
        assert.strictEqual(getSeatIfWon(players[5], players[4], true), 4, 'already above defender');

        // defender left from seat 3
        removeFromLadder(players, players[2], 'left', now);
        assert.strictEqual(getSeatIfWon(players[7], players[2], true), 3, 'defender left: takes seat they had');

        assert.strictEqual(getSeatIfWon(players[2], players[0], true), null, 'I left');
    });

    describe('getChallengeRange', () => {
        it('returns null for the King', () => {
            assert.strictEqual(getChallengeRange(1), null);
        });

        it('uses flat 10 seats floor near the top', () => {
            assert.deepStrictEqual(getChallengeRange(2), { from: 1, to: 1 });
            assert.deepStrictEqual(getChallengeRange(7), { from: 1, to: 6 });
            assert.deepStrictEqual(getChallengeRange(11), { from: 1, to: 10 });
            assert.deepStrictEqual(getChallengeRange(12), { from: 2, to: 11 });
        });

        it('uses half the ladder further down', () => {
            assert.deepStrictEqual(getChallengeRange(21), { from: 11, to: 20 });
            assert.deepStrictEqual(getChallengeRange(257), { from: 129, to: 256 });
            assert.deepStrictEqual(getChallengeRange(100), { from: 50, to: 99 });
        });

        it('reaches the top from 257 in 6 wins', () => {
            let position = 257;
            let wins = 0;

            while (position > 1) {
                position = getChallengeRange(position)!.from;
                ++wins;
            }

            assert.strictEqual(wins, 6);
        });
    });

    describe('slots', () => {
        it('gives outgoing slots by seat', () => {
            assert.strictEqual(getOutgoingSlots(1, 100), 1);
            assert.strictEqual(getOutgoingSlots(10, 100), 1);
            assert.strictEqual(getOutgoingSlots(11, 100), 2);
            assert.strictEqual(getOutgoingSlots(50, 100), 2);
            assert.strictEqual(getOutgoingSlots(51, 100), 3);
        });

        it('gives minimum incoming slots by seat', () => {
            assert.strictEqual(getMinIncomingSlots(1), 4);
            assert.strictEqual(getMinIncomingSlots(3), 4);
            assert.strictEqual(getMinIncomingSlots(4), 3);
            assert.strictEqual(getMinIncomingSlots(10), 3);
            assert.strictEqual(getMinIncomingSlots(11), 2);
        });

        it('clamps chosen incoming slots', () => {
            assert.strictEqual(getEffectiveIncomingSlots(1, 2), 4);
            assert.strictEqual(getEffectiveIncomingSlots(1, 5), 5);
            assert.strictEqual(getEffectiveIncomingSlots(20, 2), 2);
            assert.strictEqual(getEffectiveIncomingSlots(20, 9), 5);
        });

        it('only allows incoming slots choices from seat minimum', () => {
            assert.deepStrictEqual(getIncomingSlotsChoices(4), [3, 4, 5]);
            assert.deepStrictEqual(getIncomingSlotsChoices(20), [2, 3, 4, 5]);
            assert.strictEqual(isValidIncomingSlotsChoice(2, 4), false);
            assert.strictEqual(isValidIncomingSlotsChoice(3, 4), true);
            assert.strictEqual(isValidIncomingSlotsChoice(2, 20), true);
            assert.strictEqual(isValidIncomingSlotsChoice(6, 20), false);
        });
    });

    describe('canJoin', () => {
        const account = { isGuest: false, isBot: false, createdAt: ago(30 * DAY) };

        it('allows old enough accounts', () => {
            assert.strictEqual(canJoin({ account, ladderPlayer: null, now }), null);
        });

        it('refuses guests, bots and recent accounts', () => {
            assert.strictEqual(canJoin({ account: { ...account, isGuest: true }, ladderPlayer: null, now }), 'guest');
            assert.strictEqual(canJoin({ account: { ...account, isBot: true }, ladderPlayer: null, now }), 'bot');
            assert.strictEqual(canJoin({ account: { ...account, createdAt: ago(6 * DAY) }, ladderPlayer: null, now }), 'account_too_recent');
        });

        it('uses creation date, including time played as guest before registering', () => {
            assert.strictEqual(canJoin({ account: { ...account, createdAt: ago(30 * DAY), registeredAt: ago(DAY) } as LadderRulesAccount, ladderPlayer: null, now }), null);
        });

        it('refuses members, and rejoin before delay', () => {
            assert.strictEqual(canJoin({ account, ladderPlayer: createPlayer(1), now }), 'already_member');

            const left = createPlayer(1);
            removeFromLadder([left], left, 'left', ago(DAY));
            assert.strictEqual(canJoin({ account, ladderPlayer: left, now }), 'rejoin_too_early');

            const inactive = createPlayer(1);
            removeFromLadder([inactive], inactive, 'removed_inactive', ago(DAY));
            assert.strictEqual(canJoin({ account, ladderPlayer: inactive, now }), null);
        });
    });

    describe('join and remove', () => {
        it('joins at the bottom', () => {
            const newcomer = createPlayer(4, null);

            joinLadder(newcomer, 3, now);

            assert.strictEqual(newcomer.position, 4);
            assert.strictEqual(newcomer.state, 'active');
        });

        it('moves up everyone below a removed player', () => {
            const players = createLadder(4);

            removeFromLadder(players, players[1], 'left', now);

            assert.deepStrictEqual(players.map(p => p.position), [1, null, 2, 3]);
            assert.strictEqual(players[1].rejoinableAt?.getTime(), now.getTime() + 7 * DAY);
        });
    });

    describe('canChallenge', () => {
        it('allows a simple challenge', () => {
            const players = createLadder(5);

            assert.strictEqual(canChallenge(challengeContext(players, 5, 4)), null);
        });

        it('checks range and membership', () => {
            const players = [...createLadder(30), createPlayer(99, null)];

            assert.strictEqual(canChallenge(challengeContext(players, 5, 6)), 'out_of_range');
            assert.strictEqual(canChallenge(challengeContext(players, 30, 14)), 'out_of_range');
            assert.strictEqual(canChallenge(challengeContext(players, 30, 15)), null);
            assert.strictEqual(canChallenge(challengeContext(players, 99, 1)), 'not_member');
            assert.strictEqual(canChallenge(challengeContext(players, 2, 99)), 'defender_not_member');
            assert.strictEqual(canChallenge(challengeContext(players, 11, 1)), null);
        });

        it('checks boardsize', () => {
            const players = createLadder(5);

            assert.strictEqual(canChallenge({ ...challengeContext(players, 5, 4), boardsize: 9 }), 'invalid_boardsize');
            assert.strictEqual(canChallenge({ ...challengeContext(players, 5, 4), boardsize: 19 }), null);
        });

        it('checks outgoing slots', () => {
            const players = createLadder(5);

            assert.strictEqual(canChallenge(challengeContext(players, 5, 3, [runningChallenge(5, 4)])), 'no_outgoing_slot');
        });

        it('checks incoming slots', () => {
            const players = createLadder(40);
            const challenges = [runningChallenge(35, 30), runningChallenge(36, 30)];

            assert.strictEqual(canChallenge(challengeContext(players, 40, 30, challenges)), 'defender_incoming_full');

            players[29].incomingSlots = 3;
            assert.strictEqual(canChallenge(challengeContext(players, 40, 30, challenges)), null);
        });

        it('checks already playing opponent', () => {
            const players = createLadder(40);

            assert.strictEqual(canChallenge(challengeContext(players, 30, 20, [runningChallenge(20, 30)])), 'already_playing_opponent');
        });

        it('checks defender cooling down', () => {
            const players = createLadder(5);
            players[3].lastGameEndedAt = ago(defaultLadderRulesConfig.coolingDownMs - HOUR / 2);

            assert.strictEqual(canChallenge(challengeContext(players, 5, 4)), 'defender_cooling_down');

            players[3].lastGameEndedAt = ago(defaultLadderRulesConfig.coolingDownMs + HOUR / 2);
            assert.strictEqual(canChallenge(challengeContext(players, 5, 4)), null);
        });

        it('checks same opponent cooldown, shorter for revenge', () => {
            const players = createLadder(5);

            // 4 beat 5: revenge cooldown, 2 days
            assert.strictEqual(canChallenge(challengeContext(players, 5, 4, [endedChallenge(4, 5, 'challenger_won', 1 * DAY)])), 'opponent_cooldown');
            assert.strictEqual(canChallenge(challengeContext(players, 5, 4, [endedChallenge(4, 5, 'challenger_won', 3 * DAY)])), null);

            // 5 beat 4: same opponent cooldown, 7 days
            assert.strictEqual(canChallenge(challengeContext(players, 5, 4, [endedChallenge(5, 4, 'challenger_won', 5 * DAY)])), 'opponent_cooldown');
            assert.strictEqual(canChallenge(challengeContext(players, 5, 4, [endedChallenge(5, 4, 'challenger_won', 8 * DAY)])), null);
            assert.strictEqual(getSameOpponentCooldownEnd(5, 4, [])?.getTime(), undefined);
        });

        it('checks diversity rule', () => {
            const challenges = [
                endedChallenge(5, 4, 'defender_won', 20 * DAY),
                endedChallenge(5, 3, 'defender_won', 30 * DAY),
                endedChallenge(5, 4, 'defender_won', 40 * DAY),
            ];

            assert.strictEqual(breaksDiversityRule(5, 4, challenges), true);
            assert.strictEqual(breaksDiversityRule(5, 3, challenges), false);

            const olderGames = [
                endedChallenge(5, 4, 'defender_won', 20 * DAY),
                endedChallenge(5, 1, 'defender_won', 21 * DAY),
                endedChallenge(5, 2, 'defender_won', 22 * DAY),
                endedChallenge(5, 3, 'defender_won', 23 * DAY),
                endedChallenge(5, 6, 'defender_won', 24 * DAY),
                endedChallenge(5, 4, 'defender_won', 40 * DAY),
            ];

            assert.strictEqual(breaksDiversityRule(5, 4, olderGames), false);
        });

        it('lists candidates with refusal reasons', () => {
            const players = createLadder(5);
            const candidates = listChallengeCandidates(players[4], players, {
                ladderSize: 5,
                ladder: { boardsizeMin: 11, boardsizeMax: 19 },
                challenges: [runningChallenge(6, 4), runningChallenge(7, 4), runningChallenge(8, 4)],
                now,
            });

            assert.deepStrictEqual(candidates.map(c => [c.playerId, c.refusal]), [
                [1, null],
                [2, null],
                [3, null],
                [4, 'defender_incoming_full'],
            ]);
        });
    });

    describe('results', () => {
        it('resolves outcome', () => {
            assert.deepStrictEqual(resolveChallengeOutcome(1, 2, { type: 'ended', winnerPlayerId: 1, outcome: 'path' }), { result: 'challenger_won', strikePlayerId: null });
            assert.deepStrictEqual(resolveChallengeOutcome(1, 2, { type: 'ended', winnerPlayerId: 2, outcome: 'resign' }), { result: 'defender_won', strikePlayerId: null });
            assert.deepStrictEqual(resolveChallengeOutcome(1, 2, { type: 'ended', winnerPlayerId: 1, outcome: 'time' }), { result: 'challenger_won', strikePlayerId: 2 });
            assert.deepStrictEqual(resolveChallengeOutcome(1, 2, { type: 'canceled', cancelReason: null, playerToMoveId: 2 }), { result: 'voided', strikePlayerId: 2 });
            assert.deepStrictEqual(resolveChallengeOutcome(1, 2, { type: 'canceled', cancelReason: 'admin', playerToMoveId: 2 }), { result: 'voided', strikePlayerId: null });
        });

        it('challenger takes defender seat, everyone in between moves down', () => {
            const players = createLadder(6);

            applyChallengeResult(players, players[5], players[2], 'challenger_won');

            assert.deepStrictEqual(players.map(p => p.position), [1, 2, 4, 5, 6, 3]);
        });

        it('nobody moves when defender wins', () => {
            const players = createLadder(6);

            applyChallengeResult(players, players[5], players[2], 'defender_won');

            assert.deepStrictEqual(players.map(p => p.position), [1, 2, 3, 4, 5, 6]);
        });

        it('parallel challenge: no double jump', () => {
            const players = createLadder(6);

            // player 6 challenges 3 and 5, wins against 3 first
            applyChallengeResult(players, players[5], players[2], 'challenger_won');
            // then wins against player 5, who is now below
            applyChallengeResult(players, players[5], players[4], 'challenger_won');

            assert.deepStrictEqual(players.map(p => p.position), [1, 2, 4, 5, 6, 3]);
        });

        it('parallel challenge: takes defender current seat', () => {
            const players = createLadder(30);

            // 30 challenges 20 and 16. 25 beats 18: 20 moves to 21.
            applyChallengeResult(players, players[24], players[17], 'challenger_won');
            assert.strictEqual(players[19].position, 21);

            applyChallengeResult(players, players[29], players[19], 'challenger_won');
            assert.strictEqual(players[29].position, 21);
        });

        it('defender left: challenger takes the seat they had when leaving', () => {
            const players = createLadder(6);
            removeFromLadder(players, players[2], 'left', now);

            assert.strictEqual(players[2].leftPosition, 3);

            applyChallengeResult(players, players[5], players[2], 'challenger_won');

            assert.deepStrictEqual(players.map(p => p.position), [1, 2, null, 4, 5, 3]);
        });

        it('defender left: nobody moves if challenger already above that seat', () => {
            const players = createLadder(6);
            removeFromLadder(players, players[4], 'removed_strikes', now);

            // player 4 is now 4, was challenging player 5 who left from seat 5
            applyChallengeResult(players, players[3], players[4], 'challenger_won');

            assert.deepStrictEqual(players.map(p => p.position), [1, 2, 3, 4, null, 5]);
        });

        it('nobody moves if challenger left', () => {
            const players = createLadder(6);
            removeFromLadder(players, players[5], 'left', now);

            applyChallengeResult(players, players[5], players[2], 'challenger_won');

            assert.deepStrictEqual(players.map(p => p.position), [1, 2, 3, 4, 5, null]);
        });

        it('rejoining clears the seat held when leaving', () => {
            const players = createLadder(3);
            removeFromLadder(players, players[0], 'left', now);
            joinLadder(players[0], 2, now);

            assert.strictEqual(players[0].leftPosition, null);
            assert.strictEqual(players[0].position, 3);
        });

        it('removes after 2 strikes in 60 days', () => {
            assert.strictEqual(shouldRemoveForStrikes([now], now), false);
            assert.strictEqual(shouldRemoveForStrikes([ago(59 * DAY), now], now), true);
            assert.strictEqual(shouldRemoveForStrikes([ago(61 * DAY), now], now), false);
        });
    });

    describe('endChallenge', () => {
        it('updates streaks on defense', () => {
            const players = createLadder(5);
            const report = endChallenge({
                players,
                challenger: players[4],
                defender: players[0],
                gameEnd: { type: 'ended', winnerPlayerId: 1, outcome: 'path' },
                kingReignDefenses: 0,
                previousStrikes: {},
                now,
            });

            assert.strictEqual(report.result, 'defender_won');
            assert.strictEqual(report.kingDefended, true);
            assert.strictEqual(players[0].currentDefenseStreak, 1);
            assert.strictEqual(players[0].bestDefenseStreak, 1);
            assert.strictEqual(players[4].lastGameEndedAt, now);
        });

        it('new King, Giant Slayer and Climber', () => {
            const players = createLadder(5);
            players[0].currentDefenseStreak = 5;
            players[1].consecutiveChallengeWins = 2;

            const report = endChallenge({
                players,
                challenger: players[1],
                defender: players[0],
                gameEnd: { type: 'ended', winnerPlayerId: 2, outcome: 'resign' },
                kingReignDefenses: 5,
                previousStrikes: {},
                now,
            });

            assert.strictEqual(report.newKing, true);
            assert.strictEqual(report.dethronedKingId, 1);
            assert.strictEqual(report.giantSlayer, true);
            assert.strictEqual(report.climber, true);
            assert.strictEqual(players[1].position, 1);
            assert.strictEqual(players[0].position, 2);
            assert.strictEqual(players[0].currentDefenseStreak, 0);
            assert.strictEqual(players[1].giantSlayerCount, 1);
            assert.strictEqual(players[1].climberCount, 1);
        });

        it('King left during the game: challenger takes seat 1, but no Giant Slayer', () => {
            const players = createLadder(5);
            removeFromLadder(players, players[0], 'left', now);

            // player 3 was challenging the King, now seat 2 after the King left
            const report = endChallenge({
                players,
                challenger: players[2],
                defender: players[0],
                gameEnd: { type: 'ended', winnerPlayerId: 3, outcome: 'path' },
                kingReignDefenses: 5,
                previousStrikes: {},
                now,
            });

            assert.deepStrictEqual(players.map(p => p.position), [null, 2, 1, 3, 4]);
            assert.strictEqual(report.newKing, true);
            assert.strictEqual(report.dethronedKingId, null);
            assert.strictEqual(report.giantSlayer, false);
        });

        it('voided with strike, removed on second strike', () => {
            const players = createLadder(5);

            const report = endChallenge({
                players,
                challenger: players[4],
                defender: players[2],
                gameEnd: { type: 'canceled', cancelReason: null, playerToMoveId: 3 },
                kingReignDefenses: 0,
                previousStrikes: { 3: [ago(10 * DAY)] },
                now,
            });

            assert.strictEqual(report.result, 'voided');
            assert.strictEqual(report.strikePlayerId, 3);
            assert.strictEqual(report.strikesCount, 2);
            assert.strictEqual(report.removedForStrikesPlayerId, 3);
            assert.deepStrictEqual(players.map(p => p.position), [1, 2, null, 3, 4]);
            assert.strictEqual(players[2].state, 'removed_strikes');
        });
    });

    describe('isInactive', () => {
        it('detects inactive players', () => {
            const player = createPlayer(1);
            player.joinedAt = ago(61 * DAY);

            assert.strictEqual(isInactive(player, false, now), true);
            assert.strictEqual(isInactive(player, true, now), false);

            player.lastGameEndedAt = ago(DAY);
            assert.strictEqual(isInactive(player, false, now), false);
        });
    });
});
