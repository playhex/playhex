import assert from 'assert';
import { describe, it } from 'mocha';
import { v4 as uuidv4 } from 'uuid';
import { Game, Player, Tournament, TournamentMatch, TournamentParticipant } from '../../../shared/app/models/index.js';
import { createTournamentDefaultsCreate, createTournamentFromCreateInput } from '../../../shared/app/models/Tournament.js';
import { SlashinftyTournamentOrganizer } from '../../tournaments/organizers/SlashinftyTournamentOrganizer.js';

const createRoundRobinTournament = (participantsCount: number): Tournament => {
    const tournament = createTournamentFromCreateInput({
        ...createTournamentDefaultsCreate(),
        title: 'Test',
        stage1Format: 'round-robin',
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

    const playableMatches = (): TournamentMatch[] => tournament.matches
        .filter(tournamentMatch => !tournamentMatch.bye && tournamentMatch.state === 'waiting')
    ;

    return { organizer, playMatch, playableMatches };
};

describe('SlashinftyTournamentOrganizer round robin', () => {
    for (const participantsCount of [2, 3, 4, 5]) {
        it(`ends when all matches are done in rounds order, ${participantsCount} participants`, () => {
            const tournament = createRoundRobinTournament(participantsCount);
            const { organizer, playMatch, playableMatches } = startTournament(tournament);

            const matches = playableMatches().sort((a, b) => a.round - b.round);

            for (const tournamentMatch of matches) {
                assert.strictEqual(organizer.isFinished(tournament), false);
                playMatch(tournamentMatch, 0);
            }

            assert.strictEqual(organizer.isFinished(tournament), true);
        });

        it(`ends when all matches are done in reverse rounds order (correspondence), ${participantsCount} participants`, () => {
            const tournament = createRoundRobinTournament(participantsCount);
            const { organizer, playMatch, playableMatches } = startTournament(tournament);

            const matches = playableMatches().sort((a, b) => b.round - a.round);

            assert.strictEqual(
                organizer.getActiveMatches(tournament).length,
                matches.length,
                'all matches are active from start',
            );

            for (const tournamentMatch of matches) {
                assert.strictEqual(organizer.isFinished(tournament), false);
                playMatch(tournamentMatch, 0);
            }

            assert.strictEqual(organizer.isFinished(tournament), true);
        });
    }
});
