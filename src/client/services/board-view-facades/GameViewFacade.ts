import { TypedEmitter } from 'tiny-typed-emitter';
import Game from '../../../shared/game-engine/Game.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { AnimatorFacade } from '../../../shared/pixi-board/facades/AnimatorFacade.js';
import { PlayingGameFacade } from '../../../shared/pixi-board/facades/PlayingGameFacade.js';

type WinningPathAnimatorFacadeEvents = {
    /**
     * Game has ended, and win animation is over.
     * Used to display win message after animation, and not at same time.
     */
    endedAndWinAnimationOver: () => void;
};

/**
 * Keeps GameView updated with Game.
 * Shows stones from position, updates when move is played,
 * when move is undone, show swap/swapped,
 * highlight sides, animate winning path.
 */
export class GameViewFacade extends TypedEmitter<WinningPathAnimatorFacadeEvents>
{
    private playingGameFacade: PlayingGameFacade;

    constructor(
        private gameView: GameView,
        private game: Game,
    ) {
        super();

        this.playingGameFacade = new PlayingGameFacade(
            gameView,
            game.getAllowSwap(),
            game.getMovesHistory().map(moveTimestamped => moveTimestamped.move),
        );

        this.listenModel();
    }

    getGameView(): GameView
    {
        return this.gameView;
    }

    getGame(): Game
    {
        return this.game;
    }

    /**
     * Listens for moves played, undo, ended... to update view.
     */
    private listenModel(): void
    {
        this.highlightSidesFromGame();

        this.game.on('played', move => {
            this.playingGameFacade.addMove(move.move);
            this.highlightSidesFromGame();
        });

        this.game.on('undo', async undoneMovesTimestamped => {
            const undoneMoves = undoneMovesTimestamped.map(timestampedMove => timestampedMove.move);

            for (let i = 0; i < undoneMoves.length; ++i) {
                if (i > 0) {
                    // If two moves are undone, slightly wait between these two moves removal
                    await new Promise(r => setTimeout(r, 150));
                }

                if (this.playingGameFacade.getLastMove() !== undoneMoves[i]) {
                    throw new Error('undone move is not same as last move');
                }

                this.playingGameFacade.undoLastMove();
                this.highlightSidesFromGame();
            }
        });

        this.game.on('ended', () => this.endedCallback());
        this.game.on('canceled', () => this.endedCallback());

        this.game.on('updated', () => {
            this.gameView.redraw();
        });
    }

    /**
     * How sides must be highlighted given game state, outcome and winner
     */
    highlightSidesFromGame(): void
    {
        if (this.game.isCanceled()) {
            this.gameView.highlightSides(true, true);
            return;
        }

        if (this.game.isEnded()) {
            this.gameView.highlightSideForPlayer(this.game.getStrictWinner());
            return;
        }

        this.gameView.highlightSideForPlayer(this.game.getCurrentPlayerIndex());
    }

    private async endedCallback(): Promise<void>
    {
        this.highlightSidesFromGame();

        const winningPath = this.game.getBoard().getShortestWinningPath();

        if (winningPath) {
            const animatorFacade = new AnimatorFacade(this.gameView);

            await animatorFacade.animatePath(winningPath);
        }


        this.emit('endedAndWinAnimationOver');
    }
}
