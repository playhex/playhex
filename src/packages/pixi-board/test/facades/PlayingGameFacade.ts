import assert from 'assert';
import '../mockDom.js';
import GameView from '../../GameView.js';
import { PlayingGameFacade } from '../../facades/PlayingGameFacade.js';

describe('PlayingGameFacade', () => {
    it('previews swap move', () => {
        const gameView = new GameView(3);
        const playingGameFacade = new PlayingGameFacade(gameView, true);

        // red plays a2
        playingGameFacade.addMove('a2');

        assert.strictEqual(gameView.getStone('a2')?.getPlayerIndex() ?? null, 0);
        assert.strictEqual(gameView.getStone('b1')?.getPlayerIndex() ?? null, null);

        // blue previews swap move
        playingGameFacade.setPreviewedMove('swap-pieces', 1);

        assert.strictEqual(gameView.getStone('a2')?.getPlayerIndex() ?? null, null);
        assert.strictEqual(gameView.getStone('b1')?.getPlayerIndex() ?? null, 1);

        // blue cancel preview, swap preview is reverted
        playingGameFacade.removePreviewedMove();

        assert.strictEqual(gameView.getStone('a2')?.getPlayerIndex() ?? null, 0);
        assert.strictEqual(gameView.getStone('b1')?.getPlayerIndex() ?? null, null);
    });

    it('previews swap move when move is played on long diagonale, so swapped move is same coords as move', () => {
        const gameView = new GameView(3);
        const playingGameFacade = new PlayingGameFacade(gameView, true);

        // red plays a2
        playingGameFacade.addMove('b2');

        assert.strictEqual(gameView.getStone('b2')?.getPlayerIndex() ?? null, 0);
        assert.strictEqual(gameView.getStone('b2')?.isFaded() ?? null, false);

        // blue previews swap move
        playingGameFacade.setPreviewedMove('swap-pieces', 1);

        assert.strictEqual(gameView.getStone('b2')?.getPlayerIndex() ?? null, 1);
        assert.strictEqual(gameView.getStone('b2')?.isFaded() ?? null, true);

        // blue cancel preview, swap preview is reverted
        playingGameFacade.removePreviewedMove();

        assert.strictEqual(gameView.getStone('b2')?.getPlayerIndex() ?? null, 0);
        assert.strictEqual(gameView.getStone('b2')?.isFaded() ?? null, false);
    });
});
