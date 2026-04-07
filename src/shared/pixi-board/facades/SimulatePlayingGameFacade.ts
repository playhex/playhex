import { TypedEmitter } from 'tiny-typed-emitter';
import { isSpecialHexMove, type HexMove } from '../../move-notation/hex-move-notation.js';
import { PlayingGameFacade } from './PlayingGameFacade.js';
import TextMark from '../entities/TextMark.js';
import { mirrorMove, parseMove } from '../../move-notation/move-notation.js';
import { BoardEntity } from '../BoardEntity.js';
import GameView from '../GameView.js';

type SimulatePlayingGameFacadeEvents = {
    /**
     * Main cursor changed, when browsing through main line.
     * Not triggered when simulation cursor changed (browsing through simulation line).
     *
     * When rewind multiple move at once with rewind(3) or goToMainPosition(3),
     * event will be emitted once at the end.
     */
    mainCursorChanged: (index: number) => void;

    /**
     * Simulation move added or removed.
     * index is the position of simulation cursor now:
     * 0 means we are at the beginning of the simulation line, no simulation show (or simulation just started or stopped).
     */
    simulationCursorChanged: (index: number) => void;
};

const SIMULATION_NUMBERS_GROUP = 'simulation_numbers_group';

/**
 * Rewind through a game history,
 * shows the game position at an earlier state.
 *
 * Example:
 *
 * main line:   a1 b2 c3 d4
 * main cursor:       ^ (2)
 *
 * simulation line:      e5 f6 g7
 * simulation cursor:       ^ (1)
 */
export class SimulatePlayingGameFacade extends TypedEmitter<SimulatePlayingGameFacadeEvents>
{
    private gameView: GameView;

    /**
     * Board position when simulation was started.
     */
    private mainLine: HexMove[];

    /**
     * Where we are pointing in the main line.
     * Shows the board at this given position.
     *
     * 0 means we are pointing to empty board, before all moves.
     * 1 means first move is displayed
     *
     * If there is a simulation line,
     * the simulation line starts to this position.
     */
    private mainCursor: number;

    /**
     * Moves simulated from a current or earlier board position.
     */
    private simulationLine: HexMove[] = [];

    /**
     * Where we are pointing in the simulation line.
     * Used when we rewind/forward through the simulation line.
     *
     * Starts with 0: we hide simulated moves, and display only main line at mainCursor position.
     * 1: means we show the first simulation move after mainCursor position.
     */
    private simulationCursor = 0;

    /**
     * Another playing game facade used for simulation, not paused.
     */
    private playingGameFacade: PlayingGameFacade;

    /**
     * Keep track of numbers added to remove when rewind.
     */
    private numberEntities: BoardEntity[] = [];

    constructor(
        /**
         * The PlayingGameFacade to rewind from.
         * Will take current position as a snapshot,
         * and rewind from it.
         *
         * Moves updates made to PlayingGameFacade
         * should be paused while we are rewinding.
         *
         * Once this RewindPlayingGameFacade is destroyed,
         * the board position is restored to the one in PlayingGameFacade.
         */
        private initialPlayingGameFacade: PlayingGameFacade,
    ) {
        super();

        this.gameView = initialPlayingGameFacade.getGameView();
        this.mainLine = [...this.initialPlayingGameFacade.getMoves()];
        this.mainCursor = this.mainLine.length;

        this.playingGameFacade = new PlayingGameFacade(
            initialPlayingGameFacade.getGameView(),
            initialPlayingGameFacade.getSwapAllowed(),
            this.mainLine,
        );

        this.initialPlayingGameFacade.pauseView();
        this.initialPlayingGameFacade.setLastMoveMarksVisible(false);
    }

    getPlayingGameFacade()
    {
        return this.playingGameFacade;
    }

    getMainCursor(): number
    {
        return this.mainCursor;
    }

    getSimulationCursor(): number
    {
        return this.simulationCursor;
    }

    /**
     * Go to position at given move index, in the main line.
     * goToPosition(1) will go to the position after first move is played.
     * Will remove simulation line if any.
     */
    goToMainPosition(toMoveIndex: number): void
    {
        const emitEventsIfCursorChanged = this.willEmitEventsIfCursorChanged();

        this.resetSimulationLine();

        if (toMoveIndex < this.mainCursor) {
            this.doRewind(this.mainCursor - toMoveIndex);
        }

        if (toMoveIndex > this.mainCursor) {
            this.doForward(toMoveIndex - this.mainCursor);
        }

        emitEventsIfCursorChanged();
    }

    private doRewind(n = 1): void
    {
        for (let i = 0; i < n && (this.mainCursor + this.simulationCursor) > 0; ++i) {
            this.playingGameFacade.undoLastMove();

            if (this.simulationCursor) {
                --this.simulationCursor;

                // Delete simulation line if we fully rewinded,
                // except if simulation line starts from the end of the main line
                if (this.simulationCursor === 0 && this.mainCursor < this.mainLine.length) {
                    this.simulationLine = [];
                }

                this.removeLastNumber();
            } else {
                --this.mainCursor;
            }
        }
    }

    /**
     * Go back in main line history, or in simulation line if any.
     * Remove simulation line if we fully rewinded it, and reached the main line.
     * Do nothing when reached the very beginning.
     */
    rewind(n = 1): void
    {
        const emitEventsIfCursorChanged = this.willEmitEventsIfCursorChanged();

        this.doRewind(n);

        emitEventsIfCursorChanged();
    }

    /**
     * Rewind until having an empty board.
     */
    rewindToFirstMove(): void
    {
        this.goToMainPosition(0);
    }

    private doForward(n = 1): void
    {
        for (let i = 0; i < n; ++i) {
            if (
                // We are in a simulation line
                this.simulationCursor

                // If are at not in silulation line but on the end of the main line,
                // and there is an existing simulation line: forward on simulation line
                || this.simulationLine.length && this.mainCursor >= this.mainLine.length
            ) {
                if (this.simulationCursor < this.simulationLine.length) {
                    this.playingGameFacade.addMove(this.simulationLine[this.simulationCursor]);
                    this.addNumber(this.simulationLine[this.simulationCursor], this.simulationCursor + 1);
                    ++this.simulationCursor;
                }

                continue;
            }

            if (this.mainCursor < this.mainLine.length) {
                this.playingGameFacade.addMove(this.mainLine[this.mainCursor]);
                ++this.mainCursor;
            }
        }
    }

    /**
     * Go forward (after we rewinded) in main line.
     * Or when in simulation line, go forward here.
     * Do nothing if already at the end of either main or simulation line.
     */
    forward(n = 1): void
    {
        const emitEventsIfCursorChanged = this.willEmitEventsIfCursorChanged();

        this.doForward(n);

        emitEventsIfCursorChanged();
    }

    private addNumber(move: HexMove, number: number): void
    {
        if (move === 'pass') {
            return;
        }

        if (move === 'swap-pieces') {
            const firstMove = this.playingGameFacade.getMoves()[0];

            if (!firstMove || isSpecialHexMove(firstMove)) {
                throw new Error('Unexpected first move not just coordinates');
            }

            move = mirrorMove(firstMove);
        }

        const mark = new TextMark(String(number)).setCoords(parseMove(move));

        this.gameView.addEntity(mark, SIMULATION_NUMBERS_GROUP);
        this.numberEntities.push(mark);
    }

    private removeLastNumber(): void
    {
        const lastNumber = this.numberEntities.pop();

        if (!lastNumber) {
            return;
        }

        this.gameView.removeEntity(lastNumber);
    }

    /**
     * Add a move in simulation line.
     * If no simulation line yet, start a new one from the board position we are currently rewinded.
     * swap-pieces move is handled. If playing over first move, it will be replaced by swap-pieces.
     */
    addSimulationMove(move: HexMove): boolean
    {
        move = this.playingGameFacade.guessMove(move);

        if (!this.playingGameFacade.addMove(move)) {
            return false;
        }

        this.addNumber(move, this.simulationCursor + 1);

        // if rewinded in simulation and add another move,
        // delete next moves from previous simulation line first.
        if (this.simulationCursor < this.simulationLine.length) {
            this.simulationLine.splice(this.simulationCursor);
        }

        this.simulationLine.push(move);
        this.simulationCursor++;

        this.emit('simulationCursorChanged', this.simulationCursor);

        return true;
    }

    /**
     * Add a move in simulation line,
     * expect if move is same as the next one in main line:
     * in this case, just forward.
     */
    addSimulationMoveOrForward(move: HexMove): boolean
    {
        // there is a simulation line, add simulation move
        if (this.simulationCursor) {
            return this.addSimulationMove(move);
        }

        // adding same move as in main line, forward
        if (this.mainLine[this.mainCursor] === move) {
            this.forward(1);
            return true;
        }

        // adding a different move, or already at the end of the main line, add simulation move
        return this.addSimulationMove(move);
    }

    addSimulationMoves(moves: HexMove[]): boolean
    {
        for (const move of moves) {
            const added = this.addSimulationMove(move);

            if (!added) {
                return false;
            }
        }

        return true;
    }

    /**
     * Rewind simulation line until main line
     * from which the simulation line started.
     */
    resetSimulationLine(): void
    {
        if (this.simulationCursor) {
            this.doRewind(this.simulationCursor);
        }
    }

    /**
     * Restore initial board state.
     * Reset any rewind or simulation.
     */
    resetSimulationAndRewind(): void
    {
        const emitEventsIfCursorChanged = this.willEmitEventsIfCursorChanged();

        this.resetSimulationLine();

        if (this.mainCursor < this.mainLine.length) {
            this.doForward(this.mainLine.length - this.mainCursor);
        }

        emitEventsIfCursorChanged();
    }

    private willEmitEventsIfCursorChanged(): () => void
    {
        const mainCursorBefore = this.mainCursor;
        const simulationCursorBefore = this.simulationCursor;

        return () => {
            if (mainCursorBefore !== this.mainCursor) {
                this.emit('mainCursorChanged', this.mainCursor);
            }

            if (simulationCursorBefore !== this.simulationCursor) {
                this.emit('simulationCursorChanged', this.simulationCursor);
            }
        };
    }

    destroy(): void
    {
        this.resetSimulationAndRewind();
        this.initialPlayingGameFacade.setLastMoveMarksVisible(true);
        this.initialPlayingGameFacade.resumeView();
        this.playingGameFacade.destroy();
    }
}
