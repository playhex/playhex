import assert from 'assert';
import { describe, it } from 'mocha';
import { Player, Tournament, TournamentSubscription } from '../../../shared/app/models/index.js';
import { createTournamentDefaultsCreate, createTournamentFromCreateInput } from '../../../shared/app/models/Tournament.js';
import { ActiveTournament } from '../../tournaments/ActiveTournament.js';
import { TournamentEngineInterface } from '../../tournaments/organizers/TournamentEngineInterface.js';
import { NoopHostedGameAccessor } from '../../tournaments/hosted-game-accessor/NoopHostedGameAccessor.js';
import { NoopAutoSave } from '../../auto-save/NoopAutoSave.js';
import { getTournamentEngine } from '../../tournaments/organizers/getTournamentEngine.js';
import { v4 as uuidv4 } from 'uuid';
import { groupAndSortTournamentMatches } from '../../../shared/app/tournamentUtils.js';

class MockedOrganizer implements TournamentEngineInterface
{
    finished = false;

    supports()
    {
        return true;
    }

    async getActiveMatches()
    {
        return [];
    }

    isFinished()
    {
        return this.finished;
    }

    async reloadTournament() {}
    async start() {}
    async updateTournamentMatches() {}
    checkBeforeStart() { return true; }
    async reportWinner() {}
    updateParticipantsScore() {}
    resetAndRecreateMatch() {}
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

    describe('start', () => {
        it.only('can start tournament and initialize matches', async () => {
            const tournament = createTournamentFromCreateInput({
                ...createTournamentDefaultsCreate(),
                title: 'Test',
                stage1Format: 'double-elimination',
                startOfficialAt: new Date(),
                startDelayInSeconds: -1,
            });

            tournament.subscriptions = Array(4).fill(null).map((_, i) => {
                const subscription = new TournamentSubscription();

                subscription.checkedIn = new Date();
                subscription.subscribedAt = new Date();
                subscription.tournament = tournament;

                subscription.player = new Player();
                subscription.player.publicId = uuidv4();
                subscription.player.pseudo = `Player ${i}`;
                subscription.player.slug = `player-${i}`;

                return subscription;
            });

            const activeTournament = new ActiveTournament(
                tournament,
                getTournamentEngine(tournament),
                new NoopHostedGameAccessor(),
                new NoopAutoSave(tournament),
            );

            await activeTournament.init();

            await activeTournament.startNow();

            assert.strictEqual(tournament.state, 'running');

            /**
                0.1.1
                0.1.2
                0.2.1
                0.3.1
                1.1.1
                1.2.1
            */
            const { matches } = tournament;
            assert.strictEqual(matches.length, 6);

            const grouped = groupAndSortTournamentMatches(matches);
            assert.strictEqual(grouped[0][0][0], matches[0], 'group and sort works as expected, match 0.1.1');
            assert.strictEqual(grouped[0][0][1], matches[1], 'group and sort works as expected, match 0.1.2');
            assert.strictEqual(grouped[0][1][0], matches[2], 'group and sort works as expected, match 0.2.1');
            assert.strictEqual(grouped[0][2][0], matches[3], 'group and sort works as expected, match 0.3.1');
            assert.strictEqual(grouped[1][0][0], matches[4], 'group and sort works as expected, match 1.1.1');
            assert.strictEqual(grouped[1][1][0], matches[5], 'group and sort works as expected, match 1.2.1');

            assert.strictEqual(matches[0].group, 0, 'tournament.matches index 0, group is 0');
            assert.strictEqual(matches[0].round, 1, 'tournament.matches index 0, round is 1');
            assert.strictEqual(matches[0].number, 1, 'tournament.matches index 0, number is 1');

            assert.strictEqual(matches[1].group, 0, 'tournament.matches index 1, group is 0');
            assert.strictEqual(matches[1].round, 1, 'tournament.matches index 1, round is 1');
            assert.strictEqual(matches[1].number, 2, 'tournament.matches index 1, number is 2');

            assert.strictEqual(matches[2].group, 0, 'tournament.matches index 2, group is 0');
            assert.strictEqual(matches[2].round, 2, 'tournament.matches index 2, round is 2');
            assert.strictEqual(matches[2].number, 1, 'tournament.matches index 2, number is 1');

            assert.strictEqual(matches[3].group, 0, 'tournament.matches index 3, group is 0');
            assert.strictEqual(matches[3].round, 3, 'tournament.matches index 3, round is 3');
            assert.strictEqual(matches[3].number, 1, 'tournament.matches index 3, number is 1');

            assert.strictEqual(matches[4].group, 1, 'tournament.matches index 4, group is 1');
            assert.strictEqual(matches[4].round, 1, 'tournament.matches index 4, round is 1');
            assert.strictEqual(matches[4].number, 1, 'tournament.matches index 4, number is 1');

            assert.strictEqual(matches[5].group, 1, 'tournament.matches index 5, group is 1');
            assert.strictEqual(matches[5].round, 2, 'tournament.matches index 5, round is 2');
            assert.strictEqual(matches[5].number, 1, 'tournament.matches index 5, number is 1');
        });
    });
});
