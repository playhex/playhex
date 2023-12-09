import { describe, it } from 'mocha';
import { DeterministRandomAIPlayer, Game, Move, Player } from '..';
import assert from 'assert';
import { Coords } from '../Types';

describe('DeterministRandomAIPlayer', () => {
    it('Do expected and valid moves', async () => {
        const player = new Player();
        const ai = new DeterministRandomAIPlayer(1);

        const waitAITurn = async (): Promise<void> => new Promise(resolve => game.once('played', () => resolve()));

        const game = new Game(3, [player, ai]);

        game.start();

        /*
            [SERVER] info: Move played {"move":{"col":0,"row":0}}
            [SERVER] info: Move played {"move":{"col":0,"row":1}}
            [SERVER] info: Move played {"move":{"col":0,"row":2}}
            [SERVER] info: Move played {"move":{"col":2,"row":0}}
            [SERVER] info: Move played {"move":{"col":2,"row":2}}
            [SERVER] info: Move played {"move":{"col":1,"row":2}}
            [SERVER] info: Move played {"move":{"col":2,"row":1}}
            [SERVER] info: Move played {"move":{"col":1,"row":0}}
        */

        const movesSequence: Coords[] = [
            { col: 0 ,row: 0 },
            { col: 0 ,row: 1 },
            { col: 0 ,row: 2 },
            { col: 2 ,row: 0 },
            { col: 2 ,row: 2 },
            { col: 1 ,row: 2 },
            { col: 2 ,row: 1 },
            { col: 1 ,row: 0 },
        ];

        player.move(new Move(movesSequence[0].row, movesSequence[0].col));
        await waitAITurn();
        assert.deepStrictEqual(game.getBoard().getCell(movesSequence[1].row, movesSequence[1].col), 1);

        player.move(new Move(movesSequence[2].row, movesSequence[2].col));
        await waitAITurn();
        assert.deepStrictEqual(game.getBoard().getCell(movesSequence[3].row, movesSequence[3].col), 1);

        player.move(new Move(movesSequence[4].row, movesSequence[4].col));
        await waitAITurn();
        assert.deepStrictEqual(game.getBoard().getCell(movesSequence[5].row, movesSequence[5].col), 1);

        player.move(new Move(movesSequence[6].row, movesSequence[6].col));
        await waitAITurn();
        assert.deepStrictEqual(game.getBoard().getCell(movesSequence[7].row, movesSequence[7].col), 1);
        assert.deepStrictEqual(game.getWinner(), 1);
    });
});
