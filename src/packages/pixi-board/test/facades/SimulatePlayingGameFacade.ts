import assert from 'assert';
import '../mockDom.js';
import GameView from '../../GameView.js';
import { PlayingGameFacade } from '../../facades/PlayingGameFacade.js';
import { SimulatePlayingGameFacade } from '../../facades/SimulatePlayingGameFacade.js';

describe('SimulatePlayingGameFacade', () => {
    it('rewinds and forwards moves in simulation line', () => {
        const gameView = new GameView(7);
        const playingGameFacade = new PlayingGameFacade(gameView, true);

        // add 1 move on main line
        playingGameFacade.addMove('a1');

        // start simulation
        const simulatePlayingGameFacade = new SimulatePlayingGameFacade(playingGameFacade);

        const mainCursorChangedEvents: number[] = [];
        const simulationCursorChangedEvents: number[] = [];

        simulatePlayingGameFacade.on('mainCursorChanged', index => mainCursorChangedEvents.push(index));
        simulatePlayingGameFacade.on('simulationCursorChanged', index => simulationCursorChangedEvents.push(index));

        // add 5 simulation moves
        simulatePlayingGameFacade.addSimulationMove('a2');
        simulatePlayingGameFacade.addSimulationMove('a3');
        simulatePlayingGameFacade.addSimulationMove('a4');
        simulatePlayingGameFacade.addSimulationMove('a5');
        simulatePlayingGameFacade.addSimulationMove('a6');

        // we should see main and simulation moves
        assert.strictEqual(gameView.getStone('a1')?.getPlayerIndex() ?? null, 0);
        assert.strictEqual(gameView.getStone('a2')?.getPlayerIndex() ?? null, 1);
        assert.strictEqual(gameView.getStone('a3')?.getPlayerIndex() ?? null, 0);
        assert.strictEqual(gameView.getStone('a4')?.getPlayerIndex() ?? null, 1);
        assert.strictEqual(gameView.getStone('a5')?.getPlayerIndex() ?? null, 0);
        assert.strictEqual(gameView.getStone('a6')?.getPlayerIndex() ?? null, 1);

        // rewind 4 moves
        simulatePlayingGameFacade.rewind(4);

        assert.strictEqual(gameView.getStone('a1')?.getPlayerIndex() ?? null, 0);
        assert.strictEqual(gameView.getStone('a2')?.getPlayerIndex() ?? null, 1);
        assert.strictEqual(gameView.getStone('a3')?.getPlayerIndex() ?? null, null);
        assert.strictEqual(gameView.getStone('a4')?.getPlayerIndex() ?? null, null);
        assert.strictEqual(gameView.getStone('a5')?.getPlayerIndex() ?? null, null);
        assert.strictEqual(gameView.getStone('a6')?.getPlayerIndex() ?? null, null);

        // forward 3 moves
        simulatePlayingGameFacade.forward(3);

        assert.strictEqual(gameView.getStone('a1')?.getPlayerIndex() ?? null, 0);
        assert.strictEqual(gameView.getStone('a2')?.getPlayerIndex() ?? null, 1);
        assert.strictEqual(gameView.getStone('a3')?.getPlayerIndex() ?? null, 0);
        assert.strictEqual(gameView.getStone('a4')?.getPlayerIndex() ?? null, 1);
        assert.strictEqual(gameView.getStone('a5')?.getPlayerIndex() ?? null, 0);
        assert.strictEqual(gameView.getStone('a6')?.getPlayerIndex() ?? null, null);

        // Events are emitted once
        assert.deepStrictEqual(mainCursorChangedEvents, [], 'we have not rewinded through main line');
        assert.deepStrictEqual(simulationCursorChangedEvents, [
            // add simulation moves
            1, 2, 3, 4, 5,

            // rewind 4
            1,

            // forward 3
            4,
        ]);
    });
});
