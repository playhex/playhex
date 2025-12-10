import assert from 'node:assert';
import { HostedGame, Player, Tournament, TournamentMatch, TournamentParticipant } from '../models/index.js';
import { calculateRanksOfLosersBracketRounds, findParticipantByPlayerStrict, groupAndSortTournamentMatches, rankParticipantsDoubleElimination, sortAndRankParticipants } from '../tournamentUtils.js';

const p = (playerId: number, score: number, tiebreak: number = 0): TournamentParticipant => {
    const participant = new TournamentParticipant();

    participant.playerId = playerId;
    participant.score = score;
    participant.tiebreak = tiebreak;

    return participant;
};

const createPlayer = (pseudo: string) => {
    const player = new Player();

    player.pseudo = pseudo;
    player.publicId = pseudo;

    return player;
};

const createTestTournament = (brackets: [number, number, number, null | string, null | string, null | 0 | 1][]): Tournament => {
    const tournament = new Tournament();
    tournament.stage1Format = 'double-elimination';
    tournament.matches = [];
    tournament.participants = [];
    const players: Player[] = [];

    const findOrCreatePlayer = (pseudo: null | string) => {
        if (pseudo === null) {
            return null;
        }

        let player = players.find(p => p.pseudo === pseudo);

        if (!player) {
            player = createPlayer(pseudo);
            players.push(player);
        }

        return player;
    };

    for (const [group, round, number, p1, p2, winner] of brackets) {
        const tournamentMatch = new TournamentMatch();

        tournamentMatch.group = group;
        tournamentMatch.round = round;
        tournamentMatch.number = number;
        tournamentMatch.player1 = findOrCreatePlayer(p1);
        tournamentMatch.player2 = findOrCreatePlayer(p2);
        tournamentMatch.state = winner === null ? 'waiting' : 'done';
        tournamentMatch.hostedGame = new HostedGame();
        tournamentMatch.hostedGame.winner = winner;

        tournament.matches.push(tournamentMatch);
    }

    for (const player of players) {
        const participant = new TournamentParticipant();

        participant.player = player;

        tournament.participants.push(participant);
    }

    return tournament;
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

    describe('calculateRanksOfLosersBracketRounds', () => {
        it('returns ranks of eliminated players given the loser bracket round', () => {
            const tournament = createTestTournament([
                // hex monthly 28, 8 participants, beginning. https://playhex.org/tournaments/hex-monthly-28
                [0, 1, 1, 'comp', 'loko', null],
                [0, 1, 2, 'gulc', 'maso', null],
                [0, 1, 3, 'blac', 'alca', null],
                [0, 1, 4, 'como', 'azka', null],
                [0, 2, 1, null, null, null],
                [0, 2, 2, null, null, null],
                [0, 3, 1, null, null, null],
                [0, 4, 1, null, null, null],

                [1, 1, 1, null, null, null],
                [1, 1, 2, null, null, null],
                [1, 2, 1, null, null, null],
                [1, 2, 2, null, null, null],
                [1, 3, 1, null, null, null],
                [1, 4, 1, null, null, null],
            ]);

            const [, loserBracket] = groupAndSortTournamentMatches(tournament.matches);

            const ranks = calculateRanksOfLosersBracketRounds(loserBracket);

            assert.deepStrictEqual(ranks, [7, 5, 4, 3]);
        });
    });

    describe('rankParticipantsDoubleElimination', () => {
        it('sets all ranks to the lowest one when no game played yet', () => {
            const tournament = createTestTournament([
                // hex monthly 28, 8 participants, beginning. https://playhex.org/tournaments/hex-monthly-28
                [0, 1, 1, 'comp', 'loko', null],
                [0, 1, 2, 'gulc', 'maso', null],
                [0, 1, 3, 'blac', 'alca', null],
                [0, 1, 4, 'como', 'azka', null],
                [0, 2, 1, null, null, null],
                [0, 2, 2, null, null, null],
                [0, 3, 1, null, null, null],
                [0, 4, 1, null, null, null],

                [1, 1, 1, null, null, null],
                [1, 1, 2, null, null, null],
                [1, 2, 1, null, null, null],
                [1, 2, 2, null, null, null],
                [1, 3, 1, null, null, null],
                [1, 4, 1, null, null, null],
            ]);

            rankParticipantsDoubleElimination(tournament);

            assert.strictEqual(tournament.participants[0].rank, 7);
            assert.strictEqual(tournament.participants[1].rank, 7);
            assert.strictEqual(tournament.participants[2].rank, 7);
            assert.strictEqual(tournament.participants[3].rank, 7);
            assert.strictEqual(tournament.participants[4].rank, 7);
            assert.strictEqual(tournament.participants[5].rank, 7);
            assert.strictEqual(tournament.participants[6].rank, 7);
            assert.strictEqual(tournament.participants[7].rank, 7);
        });

        it('sets all ranks to the right one on an ended tournament', () => {
            const tournament = createTestTournament([
                // hex monthly 28, 8 participants, ended. https://playhex.org/tournaments/hex-monthly-28
                [0, 1, 1, 'comp', 'loko', 1],
                [0, 1, 2, 'gulc', 'maso', 0],
                [0, 1, 3, 'blac', 'alca', 0],
                [0, 1, 4, 'como', 'azka', 0],
                [0, 2, 1, 'gulc', 'loko', 1],
                [0, 2, 2, 'como', 'blac', 1],
                [0, 3, 1, 'loko', 'blac', 0],
                [0, 4, 1, 'loko', 'gulc', 0],

                [1, 1, 1, 'comp', 'maso', 1],
                [1, 1, 2, 'alca', 'azka', 0],
                [1, 2, 1, 'como', 'maso', 0],
                [1, 2, 2, 'gulc', 'alca', 0],
                [1, 3, 1, 'como', 'gulc', 1],
                [1, 4, 1, 'blac', 'gulc', 1],
            ]);

            rankParticipantsDoubleElimination(tournament);

            const rankOf = (pseudo: string): undefined | number => {
                return findParticipantByPlayerStrict(tournament, createPlayer(pseudo)).rank;
            };

            assert.strictEqual(rankOf('loko'), 1, 'loko is ranked 1');
            assert.strictEqual(rankOf('gulc'), 2, 'gulc is ranked 2');
            assert.strictEqual(rankOf('blac'), 3, 'blac is ranked 3');
            assert.strictEqual(rankOf('como'), 4, 'como is ranked 4');
            assert.strictEqual(rankOf('alca'), 5, 'alca is ranked 5');
            assert.strictEqual(rankOf('maso'), 5, 'maso is ranked 5');
            assert.strictEqual(rankOf('comp'), 7, 'comp is ranked 7');
            assert.strictEqual(rankOf('azka'), 7, 'azka is ranked 7');
        });

        it('sets all ranks to the right one on an ended tournament, and not disturbed when there is a first round with less matches', () => {
            const tournament = createTestTournament([
                // 12x12 blitz 2, 5 participants, ended. https://playhex.org/tournaments/12x12-blitz-2
                [0, 1, 1, 'tiyu', 'alca', 0],
                [0, 2, 1, 'loko', 'tiyu', 0],
                [0, 2, 2, 'sya1', 'como', 0],
                [0, 3, 1, 'sya1', 'loko', 1],
                [0, 4, 1, 'loko', 'sya1', 0],

                [1, 1, 1, 'como', 'alca', 0],
                [1, 2, 1, 'tiyu', 'como', 1],
                [1, 3, 1, 'sya1', 'como', 0],
            ]);

            rankParticipantsDoubleElimination(tournament);

            const rankOf = (pseudo: string): undefined | number => {
                return findParticipantByPlayerStrict(tournament, createPlayer(pseudo)).rank;
            };

            assert.strictEqual(rankOf('loko'), 1, 'loko is ranked 1');
            assert.strictEqual(rankOf('sya1'), 2, 'sya1 is ranked 2');
            assert.strictEqual(rankOf('como'), 3, 'como is ranked 3');
            assert.strictEqual(rankOf('tiyu'), 4, 'tiyu is ranked 4');
            assert.strictEqual(rankOf('alca'), 5, 'alca is ranked 5');
        });

        it('sets correct ranks to players in an ended tournament with 18 players', () => {
            const tournament = createTestTournament([
                // Hex Monthly 21, 18 participants, ended. https://playhex.org/tournaments/hex-monthly-21
                [0, 1, 1, 'alca', 'myop', 1],
                [0, 1, 2, 'daal', 'azka', 1],
                [0, 2, 1, 'loko', 'myop', 0],
                [0, 2, 2, 'sya1', 'fals', 1],
                [0, 2, 3, 'como', 'bael', 0],
                [0, 2, 4, 'sand', 'fjan', 1],
                [0, 2, 5, 'kspt', 'azka', 0],
                [0, 2, 6, 'amph', 'eust', 0],
                [0, 2, 7, 'gulc', 'ator', 0],
                [0, 2, 8, 'maso', 'tone', 0],
                [0, 3, 1, 'loko', 'fals', 0],
                [0, 3, 2, 'fjan', 'como', 1],
                [0, 3, 3, 'amph', 'kspt', 1],
                [0, 3, 4, 'maso', 'gulc', 1],
                [0, 4, 1, 'loko', 'como', 0],
                [0, 4, 2, 'kspt', 'gulc', 0],
                [0, 5, 1, 'kspt', 'loko', 1],
                [0, 6, 1, 'loko', 'kspt', 0],

                [1, 1, 1, 'tone', 'alca', 0],
                [1, 1, 2, 'sand', 'daal', 0],
                [1, 2, 1, 'ator', 'tone', 1],
                [1, 2, 2, 'eust', 'azka', 0],
                [1, 2, 3, 'sand', 'bael', 1],
                [1, 2, 4, 'myop', 'sya1', 0],
                [1, 3, 1, 'fjan', 'tone', 0],
                [1, 3, 2, 'eust', 'fals', 0],
                [1, 3, 3, 'bael', 'maso', 1],
                [1, 3, 4, 'amph', 'myop', 0],
                [1, 4, 1, 'eust', 'fjan', 1],
                [1, 4, 2, 'maso', 'amph', 1],
                [1, 5, 1, 'gulc', 'fjan', 0],
                [1, 5, 2, 'amph', 'como', 1],
                [1, 6, 1, 'como', 'gulc', 0],
                [1, 7, 1, 'como', 'kspt', 1],
            ]);


            rankParticipantsDoubleElimination(tournament);

            const rankOf = (pseudo: string): undefined | number => {
                return findParticipantByPlayerStrict(tournament, createPlayer(pseudo)).rank;
            };

            assert.strictEqual(rankOf('loko'), 1, 'loko is ranked 1');
            assert.strictEqual(rankOf('kspt'), 2, 'kspt is ranked 2');
            assert.strictEqual(rankOf('como'), 3, 'como is ranked 3');
            assert.strictEqual(rankOf('gulc'), 4, 'gulc is ranked 4');
            assert.strictEqual(rankOf('fjan'), 5, 'fjan is ranked 5');
            assert.strictEqual(rankOf('amph'), 5, 'amph is ranked 5');
            assert.strictEqual(rankOf('maso'), 7, 'maso is ranked 7');
            assert.strictEqual(rankOf('eust'), 7, 'eust is ranked 7');
            assert.strictEqual(rankOf('bael'), 9, 'bael is ranked 9');
            assert.strictEqual(rankOf('tone'), 9, 'tone is ranked 9');
            assert.strictEqual(rankOf('fals'), 9, 'fals is ranked 9');
            assert.strictEqual(rankOf('myop'), 9, 'myop is ranked 9');
            assert.strictEqual(rankOf('sya1'), 13, 'sya1 is ranked 13');
            assert.strictEqual(rankOf('ator'), 13, 'ator is ranked 13');
            assert.strictEqual(rankOf('sand'), 13, 'sand is ranked 13');
            assert.strictEqual(rankOf('azka'), 13, 'azka is ranked 13');
            assert.strictEqual(rankOf('alca'), 17, 'alca is ranked 17');
            assert.strictEqual(rankOf('daal'), 17, 'daal is ranked 17');
        });

        it('sets lowest ranks to players in a beginning tournament with 18 players', () => {
            const tournament = createTestTournament([
                // Hex Monthly 21, 18 participants, beginning. https://playhex.org/tournaments/hex-monthly-21
                [0, 1, 1, 'alca', 'myop', null],
                [0, 1, 2, 'daal', 'azka', null],
                [0, 2, 1, 'loko', null, null],
                [0, 2, 2, 'sya1', 'fals', null],
                [0, 2, 3, 'como', 'bael', null],
                [0, 2, 4, 'sand', 'fjan', null],
                [0, 2, 5, 'kspt', null, null],
                [0, 2, 6, 'amph', 'eust', null],
                [0, 2, 7, 'gulc', 'ator', null],
                [0, 2, 8, 'maso', 'tone', null],
                [0, 3, 1, null, null, null],
                [0, 3, 2, null, null, null],
                [0, 3, 3, null, null, null],
                [0, 3, 4, null, null, null],
                [0, 4, 1, null, null, null],
                [0, 4, 2, null, null, null],
                [0, 5, 1, null, null, null],
                [0, 6, 1, null, null, null],

                [1, 1, 1, null, null, null],
                [1, 1, 2, null, null, null],
                [1, 2, 1, null, null, null],
                [1, 2, 2, null, null, null],
                [1, 2, 3, null, null, null],
                [1, 2, 4, null, null, null],
                [1, 3, 1, null, null, null],
                [1, 3, 2, null, null, null],
                [1, 3, 3, null, null, null],
                [1, 3, 4, null, null, null],
                [1, 4, 1, null, null, null],
                [1, 4, 2, null, null, null],
                [1, 5, 1, null, null, null],
                [1, 5, 2, null, null, null],
                [1, 6, 1, null, null, null],
                [1, 7, 1, null, null, null],
            ]);


            rankParticipantsDoubleElimination(tournament);

            const rankOf = (pseudo: string): undefined | number => {
                return findParticipantByPlayerStrict(tournament, createPlayer(pseudo)).rank;
            };

            assert.strictEqual(rankOf('loko'), 13, 'loko is ranked 13');
            assert.strictEqual(rankOf('kspt'), 13, 'kspt is ranked 13');
            assert.strictEqual(rankOf('como'), 13, 'como is ranked 13');
            assert.strictEqual(rankOf('gulc'), 13, 'gulc is ranked 13');
            assert.strictEqual(rankOf('fjan'), 13, 'fjan is ranked 13');
            assert.strictEqual(rankOf('amph'), 13, 'amph is ranked 13');
            assert.strictEqual(rankOf('maso'), 13, 'maso is ranked 13');
            assert.strictEqual(rankOf('eust'), 13, 'eust is ranked 13');
            assert.strictEqual(rankOf('bael'), 13, 'bael is ranked 13');
            assert.strictEqual(rankOf('tone'), 13, 'tone is ranked 13');
            assert.strictEqual(rankOf('fals'), 13, 'fals is ranked 13');
            assert.strictEqual(rankOf('sya1'), 13, 'sya1 is ranked 13');
            assert.strictEqual(rankOf('ator'), 13, 'ator is ranked 13');
            assert.strictEqual(rankOf('sand'), 13, 'sand is ranked 13');

            assert.strictEqual(rankOf('myop'), 17, 'myop is ranked 17');
            assert.strictEqual(rankOf('azka'), 17, 'azka is ranked 17');
            assert.strictEqual(rankOf('alca'), 17, 'alca is ranked 17');
            assert.strictEqual(rankOf('daal'), 17, 'daal is ranked 17');
        });

        it('sets ranks to far to players in a middle of a tournament with 18 players', () => {
            const tournament = createTestTournament([
                // Hex Monthly 21, 18 participants, 1 game finished. https://playhex.org/tournaments/hex-monthly-21
                [0, 1, 1, 'alca', 'myop', 1],
                [0, 1, 2, 'daal', 'azka', null],
                [0, 2, 1, 'loko', 'myop', null],
                [0, 2, 2, 'sya1', 'fals', null],
                [0, 2, 3, 'como', 'bael', null],
                [0, 2, 4, 'sand', 'fjan', null],
                [0, 2, 5, 'kspt', null, null],
                [0, 2, 6, 'amph', 'eust', null],
                [0, 2, 7, 'gulc', 'ator', null],
                [0, 2, 8, 'maso', 'tone', null],
                [0, 3, 1, null, null, null],
                [0, 3, 2, null, null, null],
                [0, 3, 3, null, null, null],
                [0, 3, 4, null, null, null],
                [0, 4, 1, null, null, null],
                [0, 4, 2, null, null, null],
                [0, 5, 1, null, null, null],
                [0, 6, 1, null, null, null],

                [1, 1, 1, null, 'alca', null],
                [1, 1, 2, null, null, null],
                [1, 2, 1, null, null, null],
                [1, 2, 2, null, null, null],
                [1, 2, 3, null, null, null],
                [1, 2, 4, null, null, null],
                [1, 3, 1, null, null, null],
                [1, 3, 2, null, null, null],
                [1, 3, 3, null, null, null],
                [1, 3, 4, null, null, null],
                [1, 4, 1, null, null, null],
                [1, 4, 2, null, null, null],
                [1, 5, 1, null, null, null],
                [1, 5, 2, null, null, null],
                [1, 6, 1, null, null, null],
                [1, 7, 1, null, null, null],
            ]);


            rankParticipantsDoubleElimination(tournament);

            const rankOf = (pseudo: string): undefined | number => {
                return findParticipantByPlayerStrict(tournament, createPlayer(pseudo)).rank;
            };

            assert.strictEqual(rankOf('loko'), 13, 'loko is ranked 13');
            assert.strictEqual(rankOf('kspt'), 13, 'kspt is ranked 13');
            assert.strictEqual(rankOf('como'), 13, 'como is ranked 13');
            assert.strictEqual(rankOf('gulc'), 13, 'gulc is ranked 13');
            assert.strictEqual(rankOf('fjan'), 13, 'fjan is ranked 13');
            assert.strictEqual(rankOf('amph'), 13, 'amph is ranked 13');
            assert.strictEqual(rankOf('maso'), 13, 'maso is ranked 13');
            assert.strictEqual(rankOf('eust'), 13, 'eust is ranked 13');
            assert.strictEqual(rankOf('bael'), 13, 'bael is ranked 13');
            assert.strictEqual(rankOf('tone'), 13, 'tone is ranked 13');
            assert.strictEqual(rankOf('fals'), 13, 'fals is ranked 13');
            assert.strictEqual(rankOf('sya1'), 13, 'sya1 is ranked 13');
            assert.strictEqual(rankOf('ator'), 13, 'ator is ranked 13');
            assert.strictEqual(rankOf('sand'), 13, 'sand is ranked 13');

            // myop won a match, he progress, and now is at least 13th
            assert.strictEqual(rankOf('myop'), 13, 'myop is ranked 13');

            assert.strictEqual(rankOf('azka'), 17, 'azka is ranked 17');
            assert.strictEqual(rankOf('alca'), 17, 'alca is ranked 17');
            assert.strictEqual(rankOf('daal'), 17, 'daal is ranked 17');
        });

        it('sets better ranks to losers as long as they progress in losers bracket', () => {
            const tournament = createTestTournament([
                [0, 1, 1, 'A', 'B', 0],
                [0, 1, 2, 'C', 'D', 0],
                [0, 1, 3, 'E', 'F', null],
                [0, 1, 4, 'G', 'H', null],
                [0, 2, 1, 'A', 'C', null],
                [0, 2, 2, null, null, null],
                [0, 3, 1, null, null, null],
                [0, 4, 1, null, null, null],

                [1, 1, 1, 'B', 'D', 0],
                [1, 1, 2, null, null, null],
                [1, 2, 1, 'B', null, null],
                [1, 2, 2, null, null, null],
                [1, 3, 1, null, null, null],
                [1, 4, 1, null, null, null],
            ]);

            rankParticipantsDoubleElimination(tournament);

            const rankOf = (pseudo: string): undefined | number => {
                return findParticipantByPlayerStrict(tournament, createPlayer(pseudo)).rank;
            };

            assert.strictEqual(rankOf('A'), 5, 'A wins, he goes 5th');
            assert.strictEqual(rankOf('B'), 5, 'B loses first match, kept 7th, but wins next match in losers bracket, so goes 5th');
            assert.strictEqual(rankOf('C'), 5, 'C wins, he goes 5th');
            assert.strictEqual(rankOf('D'), 7, 'D is eliminated after two losses');
            assert.strictEqual(rankOf('E'), 7, 'E is 7th');
            assert.strictEqual(rankOf('F'), 7, 'F is 7th');
            assert.strictEqual(rankOf('G'), 7, 'G is 7th');
            assert.strictEqual(rankOf('H'), 7, 'H is 7th');
        });
    });
});
