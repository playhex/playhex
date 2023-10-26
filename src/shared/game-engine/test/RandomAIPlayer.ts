import assert from 'assert';
import { describe, it } from 'mocha';
import { Game, Move, Player, RandomAIPlayer } from '..';

describe('RandomAIPlayer', () => {
    it('Runs an entire game', () => {
        const ai = new RandomAIPlayer();
        const player = new Player();

        player.setReady();

        const game = new Game([ai, player]);

        game.startOnceAllPlayersReady();
    });
});
