import assert from 'assert';
import { describe, it } from 'mocha';
import { v4 as uuidv4 } from 'uuid';
import { Game, Player, Tournament, TournamentMatch, TournamentParticipant } from '../../../shared/app/models/index.js';
import { createTournamentDefaultsCreate, createTournamentFromCreateInput } from '../../../shared/app/models/Tournament.js';
import { SlashinftyTournamentOrganizer } from '../../tournaments/organizers/SlashinftyTournamentOrganizer.js';
import { groupAndSortTournamentMatches, tournamentMatchKey } from '../../../shared/app/tournamentUtils.js';

const createDoubleEliminationTournament = (participantsCount: number): Tournament => {
    const tournament = createTournamentFromCreateInput({
        ...createTournamentDefaultsCreate(),
        title: 'Test',
        stage1Format: 'double-elimination',
    });

    tournament.publicId = uuidv4();
    tournament.matches = [];
    tournament.participants = Array(participantsCount).fill(null).map((_, i) => {
        const participant = new TournamentParticipant();

        participant.tournament = tournament;
        participant.player = new Player();
        participant.player.publicId = uuidv4();
        participant.player.pseudo = `Player ${i}`;

        return participant;
    });

    return tournament;
};

/**
 * Starts a double elimination tournament,
 * and returns a function to play the only active match, won by given player pseudo.
 */
const startTournament = (tournament: Tournament) => {
    const organizer = new SlashinftyTournamentOrganizer();

    organizer.start(tournament);
    organizer.updateTournamentMatches(tournament);

    const playMatch = (tournamentMatch: TournamentMatch, winnerIndex: 0 | 1): void => {
        organizer.reportWinner(tournament, tournamentMatch, winnerIndex);
        tournamentMatch.state = 'done';
        tournamentMatch.game = new Game();
        tournamentMatch.game.winner = winnerIndex;

        organizer.updateTournamentMatches(tournament);
        organizer.updateParticipantsScore(tournament);
    };

    /** Plays the only active match, won by given player */
    const play = (winnerPseudo: string): void => {
        const activeMatches = organizer.getActiveMatches(tournament);

        assert.strictEqual(activeMatches.length, 1, 'there is a single match to play');

        const [tournamentMatch] = activeMatches;
        const winnerIndex = tournamentMatch.player1?.pseudo === winnerPseudo ? 0 : 1;

        assert.strictEqual([tournamentMatch.player1?.pseudo, tournamentMatch.player2?.pseudo][winnerIndex], winnerPseudo, `${winnerPseudo} plays match ${tournamentMatchKey(tournamentMatch)}`);

        playMatch(tournamentMatch, winnerIndex);
    };

    /** Pseudo of players of the only active match */
    const activePlayers = (): string[] => {
        const [tournamentMatch] = organizer.getActiveMatches(tournament);

        return [tournamentMatch.player1?.pseudo ?? '', tournamentMatch.player2?.pseudo ?? ''];
    };

    const rankOf = (pseudo: string): undefined | number => tournament.participants.find(p => p.player.pseudo === pseudo)?.rank;

    const labels = (): string[] => groupAndSortTournamentMatches(tournament.matches)
        .flatMap(group => group.flatMap(round => round.map(match => `${tournamentMatchKey(match)} ${match.label}`)))
    ;

    return { organizer, playMatch, play, activePlayers, rankOf, labels };
};

describe('SlashinftyTournamentOrganizer double elimination', () => {
    describe('2 participants', () => {
        it('creates winners final and grand final, no loser bracket, no grand final reset yet', () => {
            const tournament = createDoubleEliminationTournament(2);
            const { labels } = startTournament(tournament);

            assert.deepStrictEqual(labels(), [
                '0.1.1 winners_final',
                '0.2.1 grand_final',
            ]);

            const [winnersFinal, grandFinal] = groupAndSortTournamentMatches(tournament.matches)[0].map(round => round[0]);

            assert.strictEqual(winnersFinal.winnerPath, '0.2.1');
            assert.strictEqual(winnersFinal.loserPath, '0.2.1');
            assert.strictEqual(grandFinal.winnerPath, null, 'no path to grand final reset while not shown');
        });

        it('ends after grand final when winners bracket champion wins it again', () => {
            const tournament = createDoubleEliminationTournament(2);
            const { organizer, play, activePlayers, rankOf, labels } = startTournament(tournament);
            const [a, b] = activePlayers();

            play(a);
            assert.strictEqual(organizer.isFinished(tournament), false);

            play(a);
            assert.strictEqual(organizer.isFinished(tournament), true);
            assert.strictEqual(tournament.matches.length, 2, 'no grand final reset');
            assert.deepStrictEqual(labels(), ['0.1.1 winners_final', '0.2.1 grand_final']);
            assert.strictEqual(rankOf(a), 1);
            assert.strictEqual(rankOf(b), 2);
        });

        it('plays grand final reset when loser bracket player wins grand final', () => {
            const tournament = createDoubleEliminationTournament(2);
            const { organizer, play, activePlayers, rankOf, labels } = startTournament(tournament);
            const [a, b] = activePlayers();

            play(a);
            play(b);

            assert.strictEqual(organizer.isFinished(tournament), false, 'both players lost once, grand final reset must be played');
            assert.deepStrictEqual(labels(), [
                '0.1.1 winners_final',
                '0.2.1 grand_final',
                '0.3.1 grand_final_reset',
            ]);
            assert.deepStrictEqual(activePlayers().sort(), [a, b].sort());
            assert.strictEqual(groupAndSortTournamentMatches(tournament.matches)[0][1][0].winnerPath, '0.3.1');

            play(b);

            assert.strictEqual(organizer.isFinished(tournament), true);
            assert.strictEqual(rankOf(b), 1);
            assert.strictEqual(rankOf(a), 2);
        });
    });

    describe('3 participants', () => {
        it('creates winners bracket and a loser bracket final', () => {
            const tournament = createDoubleEliminationTournament(3);
            const { labels } = startTournament(tournament);

            assert.deepStrictEqual(labels(), [
                '0.1.1 semi_final',
                '0.2.1 winners_final',
                '0.3.1 grand_final',
                '1.1.1 losers_final',
            ]);
        });

        it('ends after grand final when winners bracket champion wins it', () => {
            const tournament = createDoubleEliminationTournament(3);
            const { organizer, play, activePlayers, rankOf } = startTournament(tournament);
            const [a, b] = activePlayers();
            const [c] = tournament.participants.map(p => p.player.pseudo).filter(p => p !== a && p !== b);

            play(a); // semi final
            play(c); // winners final
            play(a); // losers final, b is eliminated
            assert.strictEqual(rankOf(b), 3);

            play(c); // grand final
            assert.strictEqual(organizer.isFinished(tournament), true);
            assert.strictEqual(tournament.matches.length, 4, 'no grand final reset');
            assert.strictEqual(rankOf(c), 1);
            assert.strictEqual(rankOf(a), 2);
            assert.strictEqual(rankOf(b), 3);
        });

        it('plays grand final reset when loser bracket player wins grand final', () => {
            const tournament = createDoubleEliminationTournament(3);
            const { organizer, play, activePlayers, rankOf, labels } = startTournament(tournament);
            const [a, b] = activePlayers();
            const [c] = tournament.participants.map(p => p.player.pseudo).filter(p => p !== a && p !== b);

            play(a);
            play(c);
            play(b); // losers final, a is eliminated
            play(b); // grand final, won by loser bracket player

            assert.strictEqual(organizer.isFinished(tournament), false);
            assert.ok(labels().includes('0.4.1 grand_final_reset'));

            play(b);

            assert.strictEqual(organizer.isFinished(tournament), true);
            assert.strictEqual(rankOf(b), 1);
            assert.strictEqual(rankOf(c), 2);
            assert.strictEqual(rankOf(a), 3);
        });
    });

    describe('4 participants', () => {
        it('keeps grand final reset hidden, and shows it when needed', () => {
            const tournament = createDoubleEliminationTournament(4);
            const { organizer, playMatch, labels } = startTournament(tournament);

            assert.deepStrictEqual(labels(), [
                '0.1.1 semi_final',
                '0.1.2 semi_final',
                '0.2.1 winners_final',
                '0.3.1 grand_final',
                '1.1.1 lb',
                '1.2.1 losers_final',
            ]);

            // player1 wins every match until grand final
            let grandFinal: undefined | TournamentMatch;

            while (!(grandFinal = organizer.getActiveMatches(tournament).find(match => match.label === 'grand_final'))) {
                playMatch(organizer.getActiveMatches(tournament)[0], 0);
            }

            assert.strictEqual(tournament.matches.length, 6, 'grand final reset not shown yet');

            // Loser bracket champion wins grand final
            const winnersChampion = groupAndSortTournamentMatches(tournament.matches)[0][1][0].player1;
            playMatch(grandFinal, grandFinal.player1 === winnersChampion ? 1 : 0);

            assert.strictEqual(organizer.isFinished(tournament), false);
            assert.ok(labels().includes('0.4.1 grand_final_reset'));
        });
    });
});
