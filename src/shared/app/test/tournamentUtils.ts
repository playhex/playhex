import TournamentParticipant from '../models/TournamentParticipant.js';
import { sortAndRankParticipants } from '../tournamentUtils.js';
import assert from 'node:assert';

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
});
