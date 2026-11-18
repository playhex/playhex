import assert from 'assert';
import { describe, it } from 'mocha';
import {
    analyzedPlayerMoves,
    areRetrospectivesListed,
    bestTournament,
    type BlunderGameCandidate,
    fullYearsBetween,
    generateRetrospectiveShareCode,
    type GameOfTheYearCandidate,
    ImportanceTier,
    isBlunder,
    isRetrospectiveEligible,
    isRetrospectiveYearComplete,
    isRetrospectiveYearOver,
    isValidRetrospectiveShareCode,
    pickBlunderGame,
    pickChallenges,
    pickGameOfTheYear,
    pickRival,
    type RivalGame,
    shouldShowLobbyCard,
    topPercent,
    type AnalyzedPlayerMove,
    type ChallengesInput,
} from '../../retrospective/retrospectiveRules.js';
import type { GameAnalyzeData } from '../../models/GameAnalyze.js';

const date = (iso: string) => new Date(iso);

describe('retrospectiveRules', () => {
    describe('isRetrospectiveYearOver', () => {
        it('is available only from January 1st of next year', () => {
            assert.strictEqual(isRetrospectiveYearOver(2026, date('2026-12-31T23:59:59Z')), false);
            assert.strictEqual(isRetrospectiveYearOver(2026, date('2027-01-01T00:00:00Z')), true);
            assert.strictEqual(isRetrospectiveYearOver(2025, date('2026-06-01T00:00:00Z')), true);
        });
    });

    describe('shouldShowLobbyCard', () => {
        it('is not shown if last year retrospective does not exist', () => {
            assert.strictEqual(shouldShowLobbyCard(date('2027-01-10T00:00:00Z'), null, false), false);
        });

        it('is shown from January 1st, until end of April', () => {
            assert.strictEqual(shouldShowLobbyCard(date('2027-01-01T00:00:00Z'), null, true), true);
            assert.strictEqual(shouldShowLobbyCard(date('2027-04-30T23:59:59Z'), null, true), true);
            assert.strictEqual(shouldShowLobbyCard(date('2027-05-01T00:00:00Z'), null, true), false);
            assert.strictEqual(shouldShowLobbyCard(date('2027-11-01T00:00:00Z'), null, true), false);
        });

        it('is hidden once dismissed this year', () => {
            assert.strictEqual(shouldShowLobbyCard(date('2027-02-01T00:00:00Z'), date('2027-01-05T00:00:00Z'), true), false);
        });

        it('is shown again when dismissed date is from a previous retrospective', () => {
            assert.strictEqual(shouldShowLobbyCard(date('2027-02-01T00:00:00Z'), date('2026-01-05T00:00:00Z'), true), true);
            assert.strictEqual(shouldShowLobbyCard(date('2027-01-01T00:00:00Z'), date('2026-12-31T23:59:59Z'), true), true);
        });
    });

    describe('topPercent', () => {
        it('computes top percent', () => {
            assert.strictEqual(topPercent(0, 100), 1);
            assert.strictEqual(topPercent(0, 1000), 1);
            assert.strictEqual(topPercent(6, 100), 7);
            assert.strictEqual(topPercent(99, 100), 100);
            assert.strictEqual(topPercent(0, 0), 100);
        });

        it('rounds down, without top 0%', () => {
            assert.strictEqual(topPercent(0, 75), 1);
            assert.strictEqual(topPercent(1, 75), 2);
            assert.strictEqual(topPercent(0, 30), 3);
            assert.strictEqual(topPercent(0, 300), 1);
            assert.strictEqual(topPercent(6, 75), 9);
        });
    });

    describe('fullYearsBetween', () => {
        it('counts full years', () => {
            assert.strictEqual(fullYearsBetween(date('2023-05-10T00:00:00Z'), date('2026-12-31T23:59:59Z')), 3);
            assert.strictEqual(fullYearsBetween(date('2026-05-10T00:00:00Z'), date('2026-12-31T23:59:59Z')), 0);
            assert.strictEqual(fullYearsBetween(date('2024-12-31T23:59:59Z'), date('2026-12-31T23:59:59Z')), 2);
        });
    });

    describe('analyzedPlayerMoves and isBlunder', () => {
        const analyze: GameAnalyzeData = [
            // black (order 0) plays a1, keeping 60% black win
            { moveIndex: 0, color: 'black', whiteWin: 0.5, move: { move: 'a1', value: 0.1, whiteWin: 0.4 }, bestMoves: [{ move: 'b2', value: 0.2, whiteWin: 0.4 }] },
            // white (order 1) blunders: from 80% to 5% white win
            { moveIndex: 1, color: 'white', whiteWin: 0.4, move: { move: 'c3', value: 0.01, whiteWin: 0.05 }, bestMoves: [{ move: 'd4', value: 0.3, whiteWin: 0.8 }] },
            null,
            // black blunders: from 90% to 10% black win
            { moveIndex: 3, color: 'black', whiteWin: 0.1, move: { move: 'e5', value: 0.01, whiteWin: 0.9 }, bestMoves: [{ move: 'f6', value: 0.3, whiteWin: 0.1 }] },
        ];

        it('returns moves of player, from player point of view', () => {
            const black = analyzedPlayerMoves(analyze, 0);

            assert.deepStrictEqual(black.map(m => m.moveIndex), [0]);
            assert.strictEqual(black[0].winRateBefore.toFixed(2), '0.60');
            assert.strictEqual(black[0].winRateAfter.toFixed(2), '0.60');
            assert.strictEqual(isBlunder(black[0]), false);

            const white = analyzedPlayerMoves(analyze, 1);

            assert.deepStrictEqual(white.map(m => m.moveIndex), [1, 3]);
            assert.strictEqual(isBlunder(white[0]), true);
            assert.strictEqual(white[0].bestMove, 'd4');
        });

        it('uses color of the move to get player point of view', () => {
            const moves = analyzedPlayerMoves(analyze, 1);

            // move 3 is analyzed as black move: from 90% to 10% black win
            assert.strictEqual(moves[1].winRateBefore.toFixed(2), '0.90');
            assert.strictEqual(moves[1].winRateAfter.toFixed(2), '0.10');
            assert.strictEqual(isBlunder(moves[1]), true);
        });

        it('does not consider a loss of 0.7 or less as a blunder', () => {
            assert.strictEqual(isBlunder({ moveIndex: 0, move: 'a1', bestMove: 'b1', winRateBefore: 0.8, winRateAfter: 0.1 + 1e-9 }), false);
            assert.strictEqual(isBlunder({ moveIndex: 0, move: 'a1', bestMove: 'b1', winRateBefore: 0.9, winRateAfter: 0.1 }), true);
        });
    });

    describe('pickBlunderGame', () => {
        /**
         * Player moves (even indexes) of a game, from a list of win rates before each move.
         * Win rate after a move is win rate before next one.
         */
        const playerMoves = (winRates: number[]): AnalyzedPlayerMove[] => winRates.map((winRateBefore, i) => ({
            moveIndex: i * 2,
            move: 'a1',
            bestMove: 'b2',
            winRateBefore,
            winRateAfter: winRates[i + 1] ?? winRateBefore,
        }));

        const candidate = (name: string, winRates: number[], options: { won?: boolean, tier?: number, opponentRating?: null | number } = {}): BlunderGameCandidate<string> => ({
            game: name,
            moves: playerMoves(winRates),
            movesCount: winRates.length * 2,
            won: options.won ?? false,
            importance: {
                tier: (options.tier ?? ImportanceTier.REGISTERED_OPPONENT) as BlunderGameCandidate<string>['importance']['tier'],
                opponentRating: options.opponentRating ?? null,
            },
        });

        // Winning most of the game, very winning for a while, then a blunder near the end, losing until the end.
        const thrown = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.9, 0.92, 0.95, 0.95, 0.1, 0.05, 0.02];

        it('picks a game lost by a late blunder, after being very winning', () => {
            const picked = pickBlunderGame([candidate('a', thrown)]);

            assert.strictEqual(picked?.candidate.game, 'a');
            assert.strictEqual(picked?.blunder.moveIndex, 24);
        });

        it('ignores won games, and too short games', () => {
            assert.strictEqual(pickBlunderGame([candidate('a', thrown, { won: true })]), null);
            assert.strictEqual(pickBlunderGame([candidate('a', [0.9, 0.9, 0.9, 0.9, 0.9, 0.1, 0.05])]), null);
        });

        it('ignores games where player was losing most of the time', () => {
            assert.strictEqual(pickBlunderGame([candidate('a', [0.4, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.75, 0.8, 0.85, 0.9, 0.95, 0.1, 0.05, 0.02])]), null);
        });

        it('ignores games where player was not very winning since a while', () => {
            assert.strictEqual(pickBlunderGame([candidate('a', [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.5, 0.95, 0.1, 0.05, 0.02])]), null);
        });

        it('ignores games where player recovered after the blunder', () => {
            assert.strictEqual(pickBlunderGame([candidate('a', [...thrown.slice(0, 14), 0.6, 0.1])]), null);
        });

        it('ignores games with too many blunders', () => {
            assert.strictEqual(pickBlunderGame([candidate('a', [0.9, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.95, 0.1, 0.05, 0.02])]), null);
        });

        it('prefers important games, and strong opponents', () => {
            const picked = pickBlunderGame([
                candidate('weak', thrown, { opponentRating: 1400 }),
                candidate('strong', thrown, { opponentRating: 1900 }),
                candidate('guest', thrown, { tier: ImportanceTier.GUEST_OPPONENT }),
            ]);

            assert.strictEqual(picked?.candidate.game, 'strong');

            const pickedTournament = pickBlunderGame([
                candidate('strong', thrown, { opponentRating: 1900 }),
                candidate('tournament', thrown, { tier: ImportanceTier.TOURNAMENT, opponentRating: 1500 }),
            ]);

            assert.strictEqual(pickedTournament?.candidate.game, 'tournament');
        });
    });

    describe('pickGameOfTheYear', () => {
        const game = (name: string, override: Partial<GameOfTheYearCandidate<string>>): GameOfTheYearCandidate<string> => ({
            game: name,
            endedAt: date('2026-06-01T00:00:00Z'),
            opponentType: 'player',
            opponentIsGuest: false,
            opponentRating: null,
            won: true,
            tournament: null,
            ladder: null,
            ...override,
        });

        it('prefers best tournament, at most advanced round', () => {
            const picked = pickGameOfTheYear([
                game('rated', { opponentRating: 2500 }),
                game('other-tournament', { tournament: { publicId: 'other', round: 5 } }),
                game('best-round-1', { tournament: { publicId: 'best', round: 1 } }),
                game('best-round-3', { tournament: { publicId: 'best', round: 3 } }),
            ], 'best');

            assert.strictEqual(picked?.game, 'best-round-3');
        });

        it('then prefers ladder game played at the best place', () => {
            const picked = pickGameOfTheYear([
                game('rated', { opponentRating: 2500 }),
                game('ladder-bottom', { ladder: { defenderPositionBefore: 40 } }),
                game('ladder-top', { ladder: { defenderPositionBefore: 2 } }),
            ], null);

            assert.strictEqual(picked?.game, 'ladder-top');
        });

        it('never picks excluded game, already displayed as strongest opponent beaten', () => {
            assert.strictEqual(pickGameOfTheYear([
                game('final', { tournament: { publicId: 'best', round: 3 } }),
                game('round-1', { tournament: { publicId: 'best', round: 1 } }),
            ], 'best', 'final')?.game, 'round-1');

            assert.strictEqual(pickGameOfTheYear([
                game('strong', { opponentRating: 1900 }),
                game('weak', { opponentRating: 1400 }),
            ], null, 'strong')?.game, 'weak');

            assert.strictEqual(pickGameOfTheYear([game('strong', { opponentRating: 1900 })], null, 'strong'), null);
        });

        it('then strongest registered opponent', () => {
            const picked = pickGameOfTheYear([
                game('guest', { opponentIsGuest: true }),
                game('bot', { opponentType: 'ai' }),
                game('weak', { opponentRating: 1400 }),
                game('strong', { opponentRating: 1900 }),
            ], null);

            assert.strictEqual(picked?.game, 'strong');
        });

        it('ignores lost games', () => {
            const picked = pickGameOfTheYear([
                game('lost-tournament', { tournament: { publicId: 'best', round: 3 }, won: false }),
                game('won-rated', { opponentRating: 1500 }),
            ], 'best');

            assert.strictEqual(picked?.game, 'won-rated');
        });

        it('returns null when only guests and bots', () => {
            assert.strictEqual(pickGameOfTheYear([
                game('guest', { opponentIsGuest: true }),
                game('bot', { opponentType: 'ai' }),
            ], null), null);
        });
    });

    describe('bestTournament', () => {
        it('prefers most players ranked below, then bigger tournament', () => {
            assert.strictEqual(bestTournament([
                { name: '2nd of 3', rank: 2, participantsCount: 3 },
                { name: '3rd of 8', rank: 3, participantsCount: 8 },
            ])?.name, '3rd of 8');

            assert.strictEqual(bestTournament([
                { name: '1st of 4', rank: 1, participantsCount: 4 },
                { name: '3rd of 6', rank: 3, participantsCount: 6 },
            ])?.name, '3rd of 6');

            assert.strictEqual(bestTournament([]), null);
        });
    });

    describe('pickChallenges', () => {
        const input = (override: Partial<ChallengesInput>): ChallengesInput => ({
            botGames: 0,
            tournaments: [],
            ladders: [],
            nextBot: null,
            ...override,
        });

        it('returns no challenge when nothing is relevant', () => {
            assert.deepStrictEqual(pickChallenges(input({})), []);
        });

        it('suggests tournament podium or win depending on best rank', () => {
            assert.deepStrictEqual(pickChallenges(input({ tournaments: [{ rank: 5 }] })), [{ type: 'tournament_podium' }]);
            assert.deepStrictEqual(pickChallenges(input({ tournaments: [{ rank: 5 }, { rank: 2 }] })), [{ type: 'tournament_win' }]);
            assert.deepStrictEqual(pickChallenges(input({ tournaments: [{ rank: 1 }] })), []);
        });

        it('suggests ladder challenges depending on whether player was king', () => {
            const ladder = { slug: 'main', name: 'King of the Hill', gamesCount: 3 };

            assert.deepStrictEqual(
                pickChallenges(input({ ladders: [{ ...ladder, kingSeconds: 0, kingAtYearEnd: false, defenses: 0 }] })),
                [{ type: 'ladder_king', ladderSlug: 'main', ladderName: 'King of the Hill' }],
            );

            assert.deepStrictEqual(
                pickChallenges(input({ ladders: [{ ...ladder, kingSeconds: 86400 * 4, kingAtYearEnd: true, defenses: 2 }] })),
                [{ type: 'ladder_defenses', ladderSlug: 'main', ladderName: 'King of the Hill', defenses: 3 }],
            );
        });

        it('suggests to reclaim the throne when player was king, even less than a day, but no longer at end of year', () => {
            const ladder = { slug: 'main', name: 'King of the Hill', gamesCount: 3 };

            assert.deepStrictEqual(
                pickChallenges(input({ ladders: [{ ...ladder, kingSeconds: 3600, kingAtYearEnd: false, defenses: 0 }] })),
                [{ type: 'ladder_reclaim', ladderSlug: 'main', ladderName: 'King of the Hill' }],
            );

            assert.deepStrictEqual(
                pickChallenges(input({ ladders: [{ ...ladder, kingSeconds: 3600, kingAtYearEnd: true, defenses: 0 }] })),
                [{ type: 'ladder_defenses', ladderSlug: 'main', ladderName: 'King of the Hill', defenses: 1 }],
            );
        });

        it('keeps at most 3 challenges, prioritized by activity', () => {
            const bot = { publicId: 'b', pseudo: 'Bot', slug: 'bot', isBot: true };
            const challenges = pickChallenges(input({
                botGames: 200,
                tournaments: [{ rank: 4 }, { rank: 6 }],
                ladders: [
                    { slug: 'main', name: 'KotH', gamesCount: 1, kingSeconds: 0, kingAtYearEnd: false, defenses: 0 },
                    { slug: 'other', name: 'Other', gamesCount: 0, kingSeconds: 0, kingAtYearEnd: false, defenses: 0 },
                ],
                nextBot: bot,
            }));

            assert.deepStrictEqual(challenges.map(c => c.type), ['beat_bot', 'tournament_podium', 'ladder_king']);
        });
    });

    describe('share code', () => {
        it('generates 5 letters or digits', () => {
            let i = 0;
            const code = generateRetrospectiveShareCode(max => (i++ * 17) % max);

            assert.strictEqual(code.length, 5);
            assert.ok(isValidRetrospectiveShareCode(code));
        });

        it('validates codes', () => {
            assert.ok(isValidRetrospectiveShareCode('aZ3kQ'));
            assert.ok(!isValidRetrospectiveShareCode('aZ3k'));
            assert.ok(!isValidRetrospectiveShareCode('aZ3kQ1'));
            assert.ok(!isValidRetrospectiveShareCode('aZ-kQ'));
        });
    });

    describe('isRetrospectiveEligible', () => {
        const player = {
            isBot: false,
            slug: 'alice',
            createdAt: date('2025-03-01T00:00:00Z'),
            registeredAt: date('2025-03-01T00:00:00Z'),
        };

        it('is eligible when registered, there for the whole year, and played', () => {
            assert.ok(isRetrospectiveEligible(player, 2026, 1));
        });

        it('is not eligible without game this year', () => {
            assert.ok(!isRetrospectiveEligible(player, 2026, 0));
        });

        it('is not eligible for year of arrival', () => {
            assert.ok(!isRetrospectiveEligible(player, 2025, 10));
        });

        it('is not eligible for guests, bots, and anonymous accounts of deleted players', () => {
            assert.ok(!isRetrospectiveEligible({ ...player, registeredAt: null }, 2026, 10));
            assert.ok(!isRetrospectiveEligible({ ...player, registeredAt: date('2027-01-01T00:00:00Z') }, 2026, 10));
            assert.ok(!isRetrospectiveEligible({ ...player, isBot: true }, 2026, 10));
            assert.ok(!isRetrospectiveEligible({ ...player, slug: 'anonymous-12' }, 2026, 10));
        });
    });

    describe('pickRival', () => {
        const game = (opponent: null | string, won: boolean, day = 1): RivalGame<string> => ({
            opponent,
            opponentId: opponent === null ? null : opponent.charCodeAt(0),
            won,
            endedAt: date(`2026-03-${String(day).padStart(2, '0')}T00:00:00Z`),
        });

        it('picks registered opponent played the most, with record', () => {
            assert.deepStrictEqual(pickRival([
                game('a', true), game('a', false), game('a', true),
                game('b', true), game('b', true), game('b', false), game('b', false),
                game(null, true), game(null, true), game(null, true), game(null, true), game(null, true),
            ]), { opponent: 'b', wins: 2, losses: 2 });
        });

        it('requires a minimum of games', () => {
            assert.strictEqual(pickRival([game('a', true), game('a', false)]), null);
        });

        it('prefers most recent opponent on equality', () => {
            assert.strictEqual(pickRival([
                game('a', true, 20), game('a', true, 2), game('a', true, 3),
                game('b', true, 1), game('b', true, 2), game('b', true, 10),
            ])?.opponent, 'a');
        });
    });

    describe('isRetrospectiveYearComplete', () => {
        it('is false for the year player arrived', () => {
            assert.ok(!isRetrospectiveYearComplete(new Date('2025-03-01T00:00:00Z'), 2025));
            assert.ok(isRetrospectiveYearComplete(new Date('2025-03-01T00:00:00Z'), 2026));
            assert.ok(isRetrospectiveYearComplete(new Date('2024-12-31T23:59:59Z'), 2025));
        });
    });

    describe('areRetrospectivesListed', () => {
        it('lists from 2027-01-01 midnight UTC', () => {
            assert.ok(!areRetrospectivesListed(new Date('2026-12-31T23:59:59Z')));
            assert.ok(areRetrospectivesListed(new Date('2027-01-01T00:00:00Z')));
        });
    });
});
