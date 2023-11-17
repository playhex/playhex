import { describe, it } from 'mocha';
import { DeterministRandomAIPlayer, Game, Move, Player } from '..';
import assert from 'assert';

describe('DeterministRandomAIPlayer', () => {
    it.only('Do expected and valid moves', async () => {
        const player = new Player();
        const ai = new DeterministRandomAIPlayer(1);

        player.setReady();

        const waitAITurn = async (): Promise<void> => new Promise(resolve => game.once('played', () => resolve()));

        const game = new Game([player, ai], 3);

        game.startOnceAllPlayersReady();

        /*
            [SERVER] 0 do move Move { row: 2, col: 1 }
            [SERVER] 1 do move Move { row: 1, col: 0 }
            [SERVER] 0 do move Move { row: 0, col: 1 }
            [SERVER] 1 do move Move { row: 0, col: 0 }
            [SERVER] 0 do move Move { row: 1, col: 1 }
            [SERVER] 1 do move Move { row: 0, col: 2 }
            [SERVER] 0 do move Move { row: 1, col: 2 }
            [SERVER] 1 do move Move { row: 2, col: 0 }
        */

        player.move(new Move(2, 1));
        await waitAITurn();
        assert.deepStrictEqual(game.getBoard().getCell(1, 0), 1);

        player.move(new Move(0, 1));
        await waitAITurn();
        assert.deepStrictEqual(game.getBoard().getCell(0, 0), 1);

        player.move(new Move(1, 1));
        await waitAITurn();
        assert.deepStrictEqual(game.getBoard().getCell(0, 2), 1);

        player.move(new Move(1, 2));
        await waitAITurn();
        assert.deepStrictEqual(game.getBoard().getCell(2, 0), 1);
        assert.deepStrictEqual(game.getWinner(), 1)
    });
});
