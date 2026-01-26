import { mirrorMove, Move } from '../../move-notation/move-notation.js';
import GameView from '../GameView.js';
import { GameMarksFacade } from './GameMarksFacade.js';

/**
 * Facade for a full playing game.
 * Add move, undo, show last move, swappable and swapped marks.
 */
export class PlayingGameFacade
{
    private gameMarksFacade: GameMarksFacade;

    constructor(
        private gameView: GameView,
        private swapAllowed: boolean,
        private moves: Move[] = [],
    ) {
        this.gameMarksFacade = new GameMarksFacade(gameView);

        this.markLastMove();
    }

    getLastMove(): null | Move
    {
        if (this.moves.length === 0) {
            return null;
        }

        return this.moves[this.moves.length - 1];
    }

    addMove(move: Move): void
    {
        if (this.moves.length === 1 && this.swapAllowed && move === this.moves[0]) {
            move = 'swap-pieces';
        }

        if (move === 'swap-pieces') {
            if (this.moves.length !== 1) {
                throw new Error('Cannot swap-pieces now, can only swap on move 2');
            }

            if (this.moves[0] === 'pass') {
                throw new Error('Cannot swap a pass move');
            }

            const mirror = mirrorMove(this.moves[0]);

            this.moves.push(move);
            this.gameView.setStone(this.moves[0], null);
            this.gameView.setStone(mirror, 1);
            this.markLastMove();
            return;
        }

        if (move === 'pass') {
            this.moves.push(move);
            this.gameMarksFacade.hideMarks();
            return;
        }

        this.gameView.setStone(move, this.moves.length % 2 as 0 | 1);
        this.moves.push(move);
        this.markLastMove();
    }

    /**
     * Undo last move, remove stone, and show update last move mark.
     * In case of swap-piece undone, mirrors move back.
     */
    undoLastMove(): Move
    {
        const undoneMove = this.moves.pop();

        if (!undoneMove) {
            throw new Error('Cannot undo move, move are empty');
        }

        switch (undoneMove) {
            case 'pass':
                break;

            case 'swap-pieces':
                const swapped = this.moves[0];
                const mirror = mirrorMove(this.moves[0]);

                this.gameView.setStone(swapped, null);
                this.gameView.setStone(mirror, 0);
                break;

            default:
                this.gameView.setStone(undoneMove, null);
        }

        this.markLastMove();

        return undoneMove;
    }

    private markLastMove(): void
    {
        this.gameMarksFacade.hideMarks();

        const lastMove = this.moves.length > 0
            ? this.moves[this.moves.length - 1]
            : null
        ;

        if (lastMove === null) {
            return;
        }

        if (lastMove === 'pass') {
            return;
        }

        if (lastMove === 'swap-pieces') {
            const swappedCoords = mirrorMove(this.moves[0]);

            this.gameMarksFacade.markSwapped(swappedCoords);
            return;
        }

        if (this.moves.length === 1 && this.swapAllowed) {
            this.gameMarksFacade.markSwappable(lastMove);
            return;
        }

        this.gameMarksFacade.markLastMove(lastMove);
    }
}