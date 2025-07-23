import assert from 'node:assert';
import { TournamentMatch, TournamentParticipant } from '../models/index.js';
import { groupAndSortTournamentMatches, sortAndRankParticipants } from '../tournamentUtils.js';

const p = (playerId: number, score: number, tiebreak: number = 0): TournamentParticipant => {
    const participant = new TournamentParticipant();

    participant.playerId = playerId;
    participant.score = score;
    participant.tiebreak = tiebreak;

    return participant;
};

describe('tournamentUtils', () => {
    describe('sortAndRankParticipants', () => {
        it('sort and rank participants', () => {
            const participants: TournamentParticipant[] = [
                p(1, 1, 1),
                p(2, 0),
                p(3, 2),
                p(4, 1, 2),
                p(5, 4),
            ];

            sortAndRankParticipants(participants);

            // Sorted
            assert.strictEqual(participants[0].playerId, 5);
            assert.strictEqual(participants[1].playerId, 3);
            assert.strictEqual(participants[2].playerId, 4);
            assert.strictEqual(participants[3].playerId, 1);
            assert.strictEqual(participants[4].playerId, 2);

            // Ranked
            assert.strictEqual(participants[0].rank, 1);
            assert.strictEqual(participants[1].rank, 2);
            assert.strictEqual(participants[2].rank, 3);
            assert.strictEqual(participants[3].rank, 4);
            assert.strictEqual(participants[4].rank, 5);
        });

        it('attributes same rank in case of equality', () => {
            const participants: TournamentParticipant[] = [
                p(1, 1, 1),
                p(2, 0),
                p(3, 2),
                p(4, 1, 1),
                p(5, 4),
            ];

            sortAndRankParticipants(participants);

            // Sorted
            assert.strictEqual(participants[0].playerId, 5);
            assert.strictEqual(participants[1].playerId, 3);
            // assert.strictEqual(participants[2].playerId, 4);
            // assert.strictEqual(participants[3].playerId, 1);
            assert.strictEqual(participants[4].playerId, 2);

            // Ranked
            assert.strictEqual(participants[0].rank, 1);
            assert.strictEqual(participants[1].rank, 2);
            assert.strictEqual(participants[2].rank, 3);
            assert.strictEqual(participants[3].rank, 3);
            assert.strictEqual(participants[4].rank, 5);
        });
    });

    describe('getRoundsFromTournament', () => {
        it('creates sorted arrays', () => {
            const tg = (group: number, round: number, number: number): TournamentMatch => {
                const tournamentMatch = new TournamentMatch();

                tournamentMatch.group = group;
                tournamentMatch.round = round;
                tournamentMatch.number = number;

                return tournamentMatch;
            };

            const tg11 = tg(0, 1, 1);
            const tg12 = tg(0, 1, 2);
            const tg21 = tg(0, 2, 1);

            const grouped = groupAndSortTournamentMatches([
                tg21,
                tg12,
                tg11,
            ]);

            assert.deepStrictEqual([
                [[tg11, tg12], [tg21]],
            ], grouped);
        });

        it('creates sorted arrays, with groups', () => {
            const tg = (group: number, round: number, number: number): TournamentMatch => {
                const tournamentMatch = new TournamentMatch();

                tournamentMatch.group = group;
                tournamentMatch.round = round;
                tournamentMatch.number = number;

                return tournamentMatch;
            };

            const wb11 = tg(0, 1, 1);
            const wb12 = tg(0, 1, 2);
            const wb21 = tg(0, 2, 1);
            const lb11 = tg(1, 1, 1);
            const lb21 = tg(1, 2, 1);

            const grouped = groupAndSortTournamentMatches([
                wb21,
                lb11,
                wb11,
                lb21,
                wb12,
            ]);

            assert.deepStrictEqual([
                [[wb11, wb12], [wb21]],
                [[lb11], [lb21]],
            ], grouped);
        });
    });
});
