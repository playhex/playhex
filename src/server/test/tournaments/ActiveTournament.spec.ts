import assert from 'assert';
import { describe, it } from 'mocha';
import { Tournament, TournamentGame } from '../../../shared/app/models/index.js';
import { createTournamentFromCreateInput } from '../../../shared/app/models/Tournament.js';
import { ActiveTournament } from '../../tournaments/ActiveTournament.js';
import { TournamentEngineInterface } from '../../tournaments/organizers/TournamentEngineInterface.js';
import { NoopHostedGameAccessor } from '../../tournaments/hosted-game-accessor/NoopHostedGameAccessor.js';

class MockedOrganizer implements TournamentEngineInterface
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

    getActiveGames(): TournamentGame[]
    {
        return [];
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
            let tournament = new Tournament();
            const organizer = new MockedOrganizer();

            tournament.title = 'Test tournament';
            tournament.startsAt = new Date(new Date().valueOf() + 60000);

            tournament = createTournamentFromCreateInput(tournament);

            const activeTournament = new ActiveTournament(
                tournament,
                organizer,
                new NoopHostedGameAccessor(),
                async () => tournament,
            );

            activeTournament.init();

            assert.strictEqual(tournament.state, 'created');
            assert.strictEqual(tournament.startedAt, null);

            tournament.startsAt = new Date(new Date().valueOf() - 1000000);

            await activeTournament.iterateTournament();

            assert.strictEqual(tournament.state, 'running');
            assert.ok((tournament.startedAt as null | Date) instanceof Date);

            await activeTournament.iterateTournament();

            assert.strictEqual(tournament.state, 'running');

            organizer.finished = true;

            await activeTournament.iterateTournament();

            assert.strictEqual(tournament.state, 'ended');
            assert.ok(tournament.endedAt instanceof Date, 'endedAt date is defined');
        });
    });
});
