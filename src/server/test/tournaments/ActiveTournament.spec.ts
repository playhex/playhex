import assert from 'assert';
import { describe, it } from 'mocha';
import { Tournament, TournamentGame } from '../../../shared/app/models/index.js';
import { createTournamentFromCreateInput } from '../../../shared/app/models/Tournament.js';
import { ActiveTournament } from '../../tournaments/ActiveTournament.js';
import { TournamentEngineInterface } from '../../tournaments/organizers/TournamentEngineInterface.js';
import { NoopHostedGameAccessor } from '../../tournaments/hosted-game-accessor/NoopHostedGameAccessor.js';
import { NoopAutoSave } from '../../auto-save/NoopAutoSave.js';

class MockedOrganizer implements TournamentEngineInterface
{
    finished = false;

    supports(): boolean
    {
        return true;
    }

    getActiveGames(): TournamentGame[]
    {
        return [];
    }

    isFinished(): boolean
    {
        return this.finished;
    }

    initTournamentEngine(): void {}
    start(): void {}
    updateTournamentGames(): void {}
    reportWinner(): void {}
    updateParticipantsScore(): void {}
    resetAndRecreateGame(): void {}
    excludeParticipant(): void {}
}

describe('ActiveTournament', () => {
    describe('iterateTournament', () => {
        it('starts and ends tournament', async () => {
            let tournament = new Tournament();
            const organizer = new MockedOrganizer();

            tournament.title = 'Test tournament';
            tournament.startOfficialAt = new Date(new Date().valueOf() + 60000);

            tournament = createTournamentFromCreateInput(tournament);

            const activeTournament = new ActiveTournament(
                tournament,
                organizer,
                new NoopHostedGameAccessor(),
                new NoopAutoSave(tournament),
            );

            await activeTournament.init();

            assert.strictEqual(tournament.state, 'created');
            assert.strictEqual(tournament.startedAt, null);

            tournament.startOfficialAt = new Date(new Date().valueOf() - 1000000);

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
