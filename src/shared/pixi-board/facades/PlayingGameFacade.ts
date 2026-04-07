import { mirrorMove, Move } from '../../move-notation/move-notation.js';
import { HexMove, isSpecialHexMove } from '../../move-notation/hex-move-notation.js';
import GameView from '../GameView.js';
import { GameMarksFacade } from './GameMarksFacade.js';
import { PreviewMoveFacade } from './PreviewMoveFacade.js';
import TextMark from '../entities/TextMark.js';

const GROUP_MOVE_NUMBERS = 'playing_game_facade_move_numbers';

/**
 * Facade for adding moves alternately.
 * Add move, undo, show last move, swappable and swapped marks.
 */
export class PlayingGameFacade
{
    private gameMarksFacade: GameMarksFacade;

    /**
     * Already occupied cells.
     * Used to quickly check if a cell is empty.
     */
    private placedStones: { [move: string]: 0 | 1 } = {};

    /**
     * Moves history
     */
    private moves: HexMove[] = [];

    /**
     * List of callbacks to call when view is resumed
     * to re-sync view with state.
     *
     * If null, view is not paused.
     */
    private actionsWhilePaused: null | (() => void)[] = null;

    private previewMoveFacade: PreviewMoveFacade;

    /**
     * Keeps track of which move is currently previewed.
     * Not same as in previewMoveFacade, here we keep "swap-pieces"
     * in case of swap move.
     */
    private previewedMove: null | HexMove = null;

    private moveNumbersVisible = false;

    constructor(
        private gameView: GameView,
        private swapAllowed = true,
        initialMoves: HexMove[] = [],
        showLastMovesMarks = true,
    ) {
        this.gameMarksFacade = new GameMarksFacade(gameView);
        this.gameMarksFacade.setVisible(showLastMovesMarks);

        this.previewMoveFacade = new PreviewMoveFacade(gameView);

        for (const move of initialMoves) {
            this.addMove(move);
        }

        this.markLastMove();
    }

    getGameView(): GameView
    {
        return this.gameView;
    }

    getSwapAllowed(): boolean
    {
        return this.swapAllowed;
    }

    getMoves(): HexMove[]
    {
        return this.moves;
    }

    getStoneAt(move: Move): null | 0 | 1
    {
        return this.placedStones[move] ?? null;
    }

    getLastMove(): null | HexMove
    {
        if (this.moves.length === 0) {
            return null;
        }

        return this.moves[this.moves.length - 1];
    }

    setLastMoveMarksVisible(visible = true): void
    {
        this.gameMarksFacade.setVisible(visible);
    }

    /**
     * Player index / color of the next stone that will be placed.
     */
    getCurrentPlayerIndex(): 0 | 1
    {
        return this.moves.length % 2 as 0 | 1;
    }

    /**
     * Convert to 'swap-pieces' when trying to play on first move.
     */
    guessMove(move: HexMove): HexMove
    {
        if (this.moves.length === 1
            && this.swapAllowed
            && move === this.moves[0]
            && move !== 'pass'
        ) {
            return 'swap-pieces';
        }

        return move;
    }

    /**
     * Play a move.
     *
     * @returns Whether move has been played, false if cell was already occupied.
     *
     * @throws When provided move is a bad value
     */
    addMove(move: HexMove): boolean
    {
        move = this.guessMove(move);

        if (move === 'swap-pieces') {
            if (this.moves.length !== 1) {
                throw new Error('Cannot swap-pieces now, can only swap on move 2');
            }

            const firstMove = this.moves[0];

            if (isSpecialHexMove(firstMove)) {
                throw new Error('Cannot swap a special move');
            }

            const mirror = mirrorMove(firstMove);
            this.moves.push(move);
            this.placedStones = {};
            this.placedStones[mirror] = 1;

            this.doOrDeferViewUpdate(() => {
                this.gameView.setStone(firstMove, null);
                this.gameView.setStone(mirror, 1);
                this.markLastMove();
            });

            return true;
        }

        if (move === 'pass') {
            this.moves.push(move);

            this.doOrDeferViewUpdate(() => {
                this.gameMarksFacade.hideMarks();
            });

            return true;
        }

        if (this.placedStones[move] !== undefined) {
            return false;
        }

        const playerIndex = this.getCurrentPlayerIndex();
        this.placedStones[move] = playerIndex;
        this.moves.push(move);

        this.doOrDeferViewUpdate(() => {
            this.gameView.setStone(move, playerIndex);
            this.markLastMove();
        });

        return true;
    }

    addMoves(moves: HexMove[]): boolean
    {
        for (const move of moves) {
            const added = this.addMove(move);

            if (!added) {
                return false;
            }
        }

        return true;
    }

    /**
     * Undo last move, remove stone, and show update last move mark.
     * In case of swap-piece undone, mirrors move back.
     */
    undoLastMove(): null | HexMove
    {
        const undoneMove = this.moves.pop();

        if (!undoneMove) {
            return null;
        }

        switch (undoneMove) {
            case 'pass':
                break;

            case 'swap-pieces':
                const swapped = this.moves[0];

                if (isSpecialHexMove(swapped)) {
                    throw new Error('Unexpected special move as first move');
                }

                const mirror = mirrorMove(swapped);

                delete this.placedStones[mirror];
                this.placedStones[swapped] = 0;

                this.doOrDeferViewUpdate(() => {
                    this.gameView.setStone(mirror, null);
                    this.gameView.setStone(swapped, 0);
                });

                break;

            default:
                delete this.placedStones[undoneMove];

                this.doOrDeferViewUpdate(() => {
                    this.gameView.setStone(undoneMove, null);
                });
        }

        this.doOrDeferViewUpdate(() => {
            this.markLastMove();
        });

        return undoneMove;
    }

    undoAllMoves(): void
    {
        while (this.moves.length) {
            this.undoLastMove();
        }
    }

    /**
     * Mark last move (and remove other mark if any)
     * given current moves history.
     */
    private markLastMove(): void
    {
        this.gameMarksFacade.hideMarks();

        const lastMove = this.moves[this.moves.length - 1];

        if (!lastMove) {
            return;
        }

        if (lastMove === 'pass') {
            return;
        }

        const firstMove = this.moves[0];

        if (lastMove === 'swap-pieces') {
            if (isSpecialHexMove(firstMove)) {
                throw new Error('Unexpected special move as first move');
            }

            const swappedCoords = mirrorMove(firstMove);

            this.gameMarksFacade.markSwapped(swappedCoords);
            return;
        }

        if (this.moves.length === 1 && this.swapAllowed) {
            this.gameMarksFacade.markSwappable(lastMove);
            return;
        }

        this.gameMarksFacade.markLastMove(lastMove);
    }

    isViewPaused(): boolean
    {
        return this.actionsWhilePaused !== null;
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
        this.removePreviewedMove();

        this.previewedMove = move;

        if (move === 'pass') {
            return;
        }

        if (move === 'swap-pieces') {
            const firstMove = this.moves[0];

            if (!firstMove) {
                throw new Error('Cannot preview swap piece move, no first move');
            }

            if (isSpecialHexMove(firstMove)) {
                throw new Error('Unexpected special move as first move');
            }

            this.previewMoveFacade.preview(mirrorMove(firstMove), 1, firstMove);
            return;
        }

        this.previewMoveFacade.preview(move, byPlayerIndex);
    }

    removePreviewedMove(): void
    {
        this.previewedMove = null;
        const clearedMoves = this.previewMoveFacade.cancelPreview();

        for (const clearedMove of clearedMoves) {
            if (this.placedStones[clearedMove] !== undefined) {
                this.gameView.setStone(clearedMove, this.placedStones[clearedMove]);
            }
        }
    }

    /**
     * Pauses the view so addMove won't add the stone visually until we resume the view.
     *
     * Used to do simulation.
     */
    pauseView(): void
    {
        if (this.actionsWhilePaused !== null) {
            throw new Error('Cannot pause view, already paused.');
        }

        this.actionsWhilePaused = [];
    }

    resumeView(): void
    {
        if (this.actionsWhilePaused === null) {
            return;
        }

        for (const action of this.actionsWhilePaused) {
            action();
        }

        this.actionsWhilePaused = null;
    }

    /**
     * Just call the callback,
     * or if view is paused, call it when we resume.
     */
    private doOrDeferViewUpdate(viewUpdate: () => void): void
    {
        if (this.actionsWhilePaused === null) {
            viewUpdate();
        } else {
            this.actionsWhilePaused.push(viewUpdate);
        }
    }

    /**
     * Add number of move on all played move in order.
     * Shows "S" on blue move if blue swapped.
     */
    showMoveNumbers(): void
    {
        if (this.moveNumbersVisible) {
            return;
        }

        this.doAddMoveNumbers();
        this.moveNumbersVisible = true;
    }

    hideMoveNumbers(): void
    {
        if (!this.moveNumbersVisible) {
            return;
        }

        this.gameView.removeEntitiesGroup(GROUP_MOVE_NUMBERS);
        this.moveNumbersVisible = false;
    }

    toggleMoveNumbers(): void
    {
        if (this.moveNumbersVisible) {
            this.hideMoveNumbers();
        } else {
            this.showMoveNumbers();
        }
    }

    private doAddMoveNumbers(): void
    {
        const [first, second] = this.moves;

        if (second === 'swap-pieces') {
            if (isSpecialHexMove(first)) {
                throw new Error('Unexpected special move as first move');
            }

            const swappedCoords = mirrorMove(first);

            this.addText('S', swappedCoords);
        } else {
            if (first && !isSpecialHexMove(first)) {
                this.addText('1', first);
            }

            if (second && !isSpecialHexMove(second)) {
                this.addText('2', second);
            }
        }

        for (let i = 2; i < this.moves.length; ++i) {
            const move = this.moves[i];

            if (!isSpecialHexMove(move)) {
                this.addText(String(i + 1), move);
            }
        }
    }

    private addText(text: string, move: Move): void
    {
        const mark = new TextMark(text)
            .setCoords(move)
            .setColor(0xffffff)
            .setSizeCoef(0.9)
        ;

        this.gameView.addEntity(mark, GROUP_MOVE_NUMBERS);
    }

    destroy(): void
    {
        this.gameMarksFacade.hideMarks();
    }
}
