import { TypedEmitter } from 'tiny-typed-emitter';
import Game from '../../../shared/game-engine/Game.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { AnimatorFacade } from '../../../shared/pixi-board/facades/AnimatorFacade.js';
import { PlayingGameFacade } from '../../../shared/pixi-board/facades/PlayingGameFacade.js';
import { PreviewMoveFacade } from '../../../shared/pixi-board/facades/PreviewMoveFacade.js';
import { PlayerSettingsFacade } from './PlayerSettingsFacade.js';
import { mirrorMove } from '../../../shared/move-notation/move-notation.js';
import { OrientationMode } from '../../../shared/pixi-board/facades/AutoOrientationFacade.js';
import { HexMove, isSpecialHexMove } from '../../../shared/move-notation/hex-move-notation.js';
import { SimulatePlayingGameFacade } from '../../../shared/pixi-board/facades/SimulatePlayingGameFacade.js';

type WinningPathAnimatorFacadeEvents = {
    /**
     * Game has ended, and win animation is over.
     * Used to display win message after animation, and not at same time.
     */
    endedAndWinAnimationOver: () => void;

    /**
     * When simulation mode has been enabled or disabled.
     */
    simulationModeChanged: (enabled: boolean) => void;
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
    private previewMoveFacade: PreviewMoveFacade;
    private playerSettingsFacade: PlayerSettingsFacade;
    private simulatePlayingGameFacade: null | SimulatePlayingGameFacade = null;

    /**
     * Keeps track of which move is currently previewed.
     * Not same as in previewMoveFacade, here we keep "swap-pieces"
     * in case of swap move.
     */
    private previewedMove: null | HexMove = null;

    constructor(
        private gameView: GameView,
        private game: Game,
    ) {
        super();

        this.playerSettingsFacade = new PlayerSettingsFacade(gameView);

        this.playingGameFacade = new PlayingGameFacade(
            this.gameView,
            this.game.getAllowSwap(),
            this.game.getMovesHistory().map(moveTimestamped => moveTimestamped.move),
        );

        this.previewMoveFacade = new PreviewMoveFacade(gameView);

        this.listenModel();

        this.gameView.on('hexClicked', move => {
            this.simulatePlayingGameFacade?.addSimulationMove(move);
        });
    }

    getGameView(): GameView
    {
        return this.gameView;
    }

    getGame(): Game
    {
        return this.game;
    }

    getPlayingGameFacade(): PlayingGameFacade
    {
        return this.playingGameFacade;
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
            this.playingGameFacade.undoAllMoves();

            for (const timestampedMove of this.game.getMovesHistory()) {
                this.playingGameFacade.addMove(timestampedMove.move);
            }
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

    hasPreviewedMove(): boolean
    {
        return this.previewedMove !== null;
    }

    getPreviewedMove(): null | HexMove
    {
        return this.previewedMove;
    }

    setPreviewedMove(move: HexMove, byPlayerIndex: 0 | 1): void
    {
        this.previewedMove = move;

        if (move === 'swap-pieces') {
            const firstMove = this.game.getFirstMove()?.move;

            if (!firstMove) {
                throw new Error('Cannot preview swap piece move, no first move');
            }

            if (isSpecialHexMove(firstMove)) {
                throw new Error('Unexpected special move as first move');
            }

            this.previewMoveFacade.preview(mirrorMove(firstMove), 0, firstMove);
            return;
        }

        this.previewMoveFacade.preview(move, byPlayerIndex);
    }

    removePreviewedMove(): void
    {
        this.previewedMove = null;
        this.previewMoveFacade.cancelPreview();
    }

    getCurrentOrientationMode(): OrientationMode
    {
        return this.playerSettingsFacade.getCurrentOrientationMode();
    }

    isSimulationMode(): boolean
    {
        return this.simulatePlayingGameFacade !== null;
    }

    enableSimulationMode(): void
    {
        if (this.simulatePlayingGameFacade) {
            return;
        }

        this.simulatePlayingGameFacade = new SimulatePlayingGameFacade(this.playingGameFacade);

        this.emit('simulationModeChanged', true);
    }

    disableSimulationMode(): void
    {
        if (!this.simulatePlayingGameFacade) {
            return;
        }

        this.simulatePlayingGameFacade.destroy();
        this.simulatePlayingGameFacade = null;

        this.emit('simulationModeChanged', false);
    }

    getSimulatePlayingGameFacade(): null | SimulatePlayingGameFacade
    {
        return this.simulatePlayingGameFacade;
    }
}
