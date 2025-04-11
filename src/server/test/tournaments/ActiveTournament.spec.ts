import assert from 'assert';
import { describe, it } from 'mocha';
import { HostedGame, TournamentCreateDTO } from '../../../shared/app/models/index.js';
import { createTournamentFromDTO } from '../../../shared/app/models/Tournament.js';
import { ActiveTournament } from '../../tournaments/ActiveTournament.js';
import { TournamentOrganizerInterface } from '../../tournaments/organizers/TournamentOrganizerInterface.js';

class MockedOrganizer implements TournamentOrganizerInterface
{
    finished = false;

    supports(): boolean
    {
        return true;
    }

    initTournamentEngine(): void
    {
    }

    start(): void
    {
    }

    updateTournamentGames(): void
    {
    }

    reportWinner(): void
    {
    }

    updateParticipantsScore(): void
    {
    }

    isFinished(): boolean
    {
        return this.finished;
    }
}

describe('ActiveTournament', () => {
    describe('iterateTournament', () => {
        it('starts and ends tournament', async () => {
            const tournamentCreate = new TournamentCreateDTO();
            const organizer = new MockedOrganizer();

            tournamentCreate.title = 'Test tournament';
            tournamentCreate.startsAt = new Date(new Date().valueOf() - 60000);

            const tournament = createTournamentFromDTO(tournamentCreate);

            const activeTournament = new ActiveTournament(
                tournament,
                organizer,
                async () => new HostedGame(),
            );

            assert.strictEqual(tournament.state, 'created');

            await activeTournament.iterateTournament();

            assert.strictEqual(tournament.state, 'running');

            await activeTournament.iterateTournament();

            assert.strictEqual(tournament.state, 'running');

            organizer.finished = true;

            await activeTournament.iterateTournament();

            assert.strictEqual(tournament.state, 'ended');
            assert.ok(tournament.endedAt instanceof Date, 'endedAt date is defined');
        });
    });
});
