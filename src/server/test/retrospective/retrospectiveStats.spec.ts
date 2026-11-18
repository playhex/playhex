import assert from 'assert';
import { describe, it } from 'mocha';
import { buildPercentilePopulation, computeGamesStats, computeLadders, computeTopPercents, countGreater } from '../../retrospective/retrospectiveStats.js';
import type { GameRow, LadderChallengeRow, LadderReignRow, LadderRow, PercentileValuesRow } from '../../retrospective/RetrospectiveDataLoader.js';

const date = (iso: string): Date => new Date(iso);

const from = date('2026-01-01T00:00:00Z');
const to = date('2027-01-01T00:00:00Z');

const live = JSON.stringify({ family: 'fischer', options: { initialTime: 600000, timeIncrement: 5000 } });
const correspondence = JSON.stringify({ family: 'fischer', options: { initialTime: 86400000 * 3, timeIncrement: 0 } });

const game = (overrides: Partial<GameRow> = {}): GameRow => ({
    id: 1,
    publicId: 'game-1',
    opponentType: 'player',
    ranked: 1,
    boardsize: 11,
    swapRule: 1,
    timeControlType: live,
    startedAt: date('2026-03-10T10:00:00Z'),
    endedAt: date('2026-03-10T10:10:00Z'),
    winner: 0,
    outcome: 'path',
    moves: 'a1 b2 c3 d4 e5 f6 g7 h8',
    moveTimestamps: null,
    order: 0,
    opponentId: 2,
    opponentPublicId: 'opponent-2',
    opponentPseudo: 'Opponent',
    opponentSlug: 'opponent',
    opponentIsBot: 0,
    opponentIsGuest: 0,
    tournamentRound: null,
    tournamentMatchNumber: null,
    tournamentMatchLabel: null,
    tournamentPublicId: null,
    tournamentTitle: null,
    ladderId: null,
    defenderPositionBefore: null,
    ...overrides,
});

describe('retrospectiveStats', () => {
    describe('computeGamesStats', () => {
        it('counts games, moves played by player, and games by month', () => {
            const stats = computeGamesStats([
                game({ order: 0, moves: 'a1 b2 c3' }), // 2 moves by player
                game({ id: 2, order: 1, moves: 'a1 b2 c3', endedAt: date('2026-07-01T00:00:00Z') }), // 1 move by player
                game({ id: 3, opponentType: 'ai', opponentId: 10, moves: 'a1' }),
            ], from, to, new Map(), new Map());

            assert.strictEqual(stats.games1v1, 2);
            assert.strictEqual(stats.botGames, 1);
            assert.strictEqual(stats.movesPlayed, 4);
            assert.strictEqual(stats.distinctOpponents, 1);
            assert.strictEqual(stats.gamesByMonth[2], 2);
            assert.strictEqual(stats.gamesByMonth[6], 1);
        });

        it('counts active days only on days player played a move, in this year', () => {
            const stats = computeGamesStats([
                game({
                    order: 1,
                    moves: 'a1 b2 c3 d4',
                    moveTimestamps: [
                        '2025-12-31T23:59:00Z', // opponent
                        '2025-12-31T23:59:30Z', // player, previous year
                        '2026-01-01T00:00:10Z', // opponent
                        '2026-01-01T00:00:20Z', // player
                    ].join(' '),
                }),
            ], from, to, new Map(), new Map());

            assert.strictEqual(stats.activeDays, 1);
        });

        it('computes live play and thinking time, ignoring correspondence games', () => {
            const stats = computeGamesStats([
                game({
                    order: 0,
                    startedAt: date('2026-03-10T10:00:00Z'),
                    endedAt: date('2026-03-10T10:10:00Z'),
                    moves: 'a1 b2 c3',
                    moveTimestamps: '2026-03-10T10:00:30Z 2026-03-10T10:01:00Z 2026-03-10T10:01:20Z',
                }),
                game({ id: 2, timeControlType: correspondence }),
            ], from, to, new Map(), new Map());

            assert.strictEqual(stats.livePlaySeconds, 600);
            assert.strictEqual(stats.liveThinkingSeconds, 30 + 20);
        });

        it('counts tournament matches without forfeits', () => {
            const stats = computeGamesStats([
                game({ tournamentPublicId: 't' }),
                game({ id: 2, tournamentPublicId: 't', winner: 1 }),
                game({ id: 3, tournamentPublicId: 't', outcome: 'forfeit' }),
            ], from, to, new Map(), new Map());

            assert.strictEqual(stats.tournamentMatchesPlayed, 2);
            assert.strictEqual(stats.tournamentMatchesWon, 1);
        });

        it('picks strongest opponent beaten in ranked games long enough, by current confident rating', () => {
            const strong = game({ id: 2, opponentId: 20 });
            const stats = computeGamesStats([
                game({ id: 1, opponentId: 10 }),
                strong,
                game({ id: 3, opponentId: 30, moves: 'a1 b2' }), // too short
                game({ id: 4, opponentId: 40, ranked: 0 }), // friendly
                game({ id: 5, opponentId: 50, winner: 1 }), // lost
            ], from, to, new Map([[10, 1500], [20, 1800], [30, 2500], [40, 2500], [50, 2500]]), new Map());

            assert.strictEqual(stats.rankedWins, 3);
            assert.strictEqual(stats.strongestOpponentBeaten?.game, strong);
            assert.strictEqual(stats.strongestOpponentBeaten?.rating, 1800);
        });

        it('keeps rating of strongest bot beaten', () => {
            const stats = computeGamesStats([
                game({ id: 1, opponentType: 'ai', opponentId: 10 }),
                game({ id: 2, opponentType: 'ai', opponentId: 20 }),
                game({ id: 3, opponentType: 'ai', opponentId: 30, winner: 1 }),
            ], from, to, new Map(), new Map([[10, 1200], [20, 1600], [30, 2000]]));

            assert.strictEqual(stats.strongestBotBeatenRating, 1600);
        });
    });

    describe('computeLadders', () => {
        const ladders = new Map<number, LadderRow>([[1, { id: 1, slug: 'hex-11', name: 'Hex 11' }]]);
        const playerId = 7;

        const challenge = (overrides: Partial<LadderChallengeRow>): LadderChallengeRow => ({
            ladderId: 1,
            endedAt: date('2026-02-01T00:00:00Z'),
            challengerId: playerId,
            defenderId: 8,
            result: 'challenger_won',
            challengerPositionBefore: null,
            challengerPositionAfter: null,
            defenderPositionBefore: null,
            defenderPositionAfter: null,
            ...overrides,
        });

        it('computes challenges won, best win streak, defenses, and best place first reached', () => {
            const [ladder] = computeLadders(playerId, ladders, [
                challenge({ endedAt: date('2026-02-01T00:00:00Z'), challengerPositionBefore: 5, challengerPositionAfter: 3 }),
                challenge({ endedAt: date('2026-03-01T00:00:00Z'), challengerPositionBefore: 3, challengerPositionAfter: 2 }),
                challenge({ endedAt: date('2026-04-01T00:00:00Z'), result: 'defender_won', challengerPositionBefore: 2, challengerPositionAfter: 2 }),
                challenge({ endedAt: date('2026-05-01T00:00:00Z'), challengerPositionBefore: 2, challengerPositionAfter: 2 }),
                challenge({ endedAt: date('2026-06-01T00:00:00Z'), challengerId: 9, defenderId: playerId, result: 'defender_won', defenderPositionBefore: 1, defenderPositionAfter: 1 }),
            ], [], from, to);

            assert.strictEqual(ladder.slug, 'hex-11');
            assert.strictEqual(ladder.challengesCount, 5);
            assert.strictEqual(ladder.challengesWon, 4);
            assert.strictEqual(ladder.bestWinStreak, 2);
            assert.strictEqual(ladder.defenses, 1);
            assert.strictEqual(ladder.bestPosition, 1);
            assert.strictEqual(ladder.bestPositionAt, '2026-06-01T00:00:00.000Z');
        });

        it('counts time as king within the year, and whether still king at end of year', () => {
            const reigns: LadderReignRow[] = [
                // Started previous year: counted from January 1st
                { ladderId: 1, playerId, startedAt: date('2025-12-01T00:00:00Z'), endedAt: date('2026-01-02T00:00:00Z') },
                // Still king
                { ladderId: 1, playerId, startedAt: date('2026-12-31T00:00:00Z'), endedAt: null },
            ];

            const [ladder] = computeLadders(playerId, ladders, [], reigns, from, to, date('2027-01-05T00:00:00Z'));

            assert.strictEqual(ladder.kingSeconds, 2 * 86400);
            assert.strictEqual(ladder.kingAtYearEnd, true);
            assert.strictEqual(ladder.bestPosition, 1);
            assert.strictEqual(ladder.bestPositionAt, '2026-01-01T00:00:00.000Z');
            assert.strictEqual(ladder.challengesCount, 0);
        });

        it('counts current reign until now when year is not over', () => {
            const [ladder] = computeLadders(playerId, ladders, [], [
                { ladderId: 1, playerId, startedAt: date('2026-06-01T00:00:00Z'), endedAt: null },
            ], from, to, date('2026-06-02T00:00:00Z'));

            assert.strictEqual(ladder.kingSeconds, 86400);
            assert.strictEqual(ladder.kingAtYearEnd, true);
        });

        it('is not king at end of year when reign ended before', () => {
            const [ladder] = computeLadders(playerId, ladders, [], [
                { ladderId: 1, playerId, startedAt: date('2026-06-01T00:00:00Z'), endedAt: date('2026-06-02T00:00:00Z') },
            ], from, to, date('2027-01-05T00:00:00Z'));

            assert.strictEqual(ladder.kingAtYearEnd, false);
        });

        it('ignores unknown ladders', () => {
            assert.deepStrictEqual(computeLadders(playerId, ladders, [challenge({ ladderId: 99 })], [], from, to), []);
        });
    });

    describe('top percents', () => {
        it('counts values strictly greater', () => {
            assert.strictEqual(countGreater([], 5), 0);
            assert.strictEqual(countGreater([1, 2, 3, 3, 4], 3), 1);
            assert.strictEqual(countGreater([1, 2, 3, 3, 4], 0), 5);
            assert.strictEqual(countGreater([1, 2, 3, 3, 4], 4), 0);
        });

        const row = (playerId: number, games1v1: number, overrides: Partial<PercentileValuesRow> = {}): PercentileValuesRow => ({
            playerId,
            hidden: false,
            games1v1,
            livePlaySeconds: 0,
            activeDays: 0,
            chatMessages: 0,
            rankedWins: 0,
            endRating: null,
            accuracy: null,
            movesPlayed: 0,
            liveThinkingSeconds: 0,
            ...overrides,
        });

        it('compares against visible retrospectives only, ignoring missing values', () => {
            const rows = [row(1, 100), row(2, 50), row(3, 10), row(4, 0), row(5, 1000, { hidden: true })];
            const population = buildPercentilePopulation(rows);

            assert.deepStrictEqual(population.games1v1, [10, 50, 100]);
            assert.deepStrictEqual(computeTopPercents(rows[0], population), { games1v1: 33 });
            assert.deepStrictEqual(computeTopPercents(rows[2], population), { games1v1: 100 });
            assert.deepStrictEqual(computeTopPercents(rows[3], population), {});
        });

        it('compares a hidden retrospective as if it was added to population', () => {
            const rows = [row(1, 100), row(2, 50), row(3, 1000, { hidden: true })];

            // Best of 3
            assert.deepStrictEqual(computeTopPercents(rows[2], buildPercentilePopulation(rows)), { games1v1: 33 });
        });
    });
});
