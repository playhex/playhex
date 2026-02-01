import { Move } from '../../move-notation/move-notation.js';
import GameView from '../GameView.js';
import { PlayingGameFacade } from './PlayingGameFacade.js';

/**
 * Rewind through a game history,
 * shows the game position at an earlier state.
 */
export class SimulatePlayingGameFacade
{
    /**
     * Board position when simulation was started.
     */
    private mainLine: Move[];

    /**
     * Rewind in moves history.
     *
     * If set, will show position at the state the cursor is pointing.
     *
     * 0 means before first move, so empty.
     * 1 means first move will be displayed.
     */
    private mainCursor: number;

    /**
     * Moves played from a current or earlier board position.
     */
    private simulationLine: Move[] = [];

    /**
     * Rewind in moves history.
     *
     * If set, will show position at the state the cursor is pointing.
     *
     * 0 means before first move, so empty.
     * 1 means first move will be displayed.
     */
    private simulationCursor = 0;

    /**
     * Another playing game facade used for simulation, not paused.
     */
    private simulatedPlayingFacade: PlayingGameFacade;

    constructor(
        gameView: GameView,

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
        this.mainLine = [...this.initialPlayingGameFacade.getMoves()];
        this.mainCursor = this.mainLine.length;

        this.simulatedPlayingFacade = new PlayingGameFacade(
            gameView,
            initialPlayingGameFacade.getSwapAllowed(),
            this.mainLine,
        );

        this.initialPlayingGameFacade.pauseView();
    }

    setHistoryCursor(historyCursor: number): void
    {
        this.mainCursor = historyCursor;
    }

    /**
     * Go back in main line history, or in simulation line if any.
     * Remove simulation line if we fully rewinded it, and reached the main line.
     * Do nothing when reached the very beginning.
     */
    rewind(n = 1): void
    {
        for (let i = 0; i < n && this.mainCursor > 0; ++i) {
            this.simulatedPlayingFacade.undoLastMove();

            if (this.simulationCursor) {
                --this.simulationCursor;

                // Delete simulation line if we fully rewinded,
                // except if simulation line starts from the end of the main line
                if (this.simulationCursor === 0 && this.mainCursor < this.mainLine.length) {
                    this.simulationLine = [];
                }
            } else {
                --this.mainCursor;
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
        for (let i = 0; i < n; ++i) {
            if (this.simulationCursor

                // If we have a simulation line starting from the end of main line,
                // go forward on it.
                || this.simulationLine.length && this.mainCursor >= this.mainLine.length
            ) {
                if (this.simulationCursor < this.simulationLine.length) {
                    this.simulatedPlayingFacade.addMove(this.simulationLine[this.simulationCursor]);
                    ++this.simulationCursor;
                }

                break;
            }

            if (this.mainCursor < this.mainLine.length) {
                this.simulatedPlayingFacade.addMove(this.mainLine[this.mainCursor]);
                ++this.mainCursor;
            }
        }
    }

    addSimulationMove(move: Move): boolean
    {
        if (!this.simulatedPlayingFacade.addMove(move)) {
            return false;
        }

        // if rewinded in simulation and add another move,
        // delete next moves from previous simulation line first.
        if (this.simulationCursor < this.simulationLine.length) {
            this.simulationLine.splice(this.simulationCursor);
        }

        this.simulationLine.push(move);
        this.simulationCursor++;

        return true;
    }

    resetSimulationAndRewind(): void
    {
        if (this.simulationCursor) {
            this.rewind(this.simulationCursor);
        }

        if (this.mainCursor < this.mainLine.length) {
            this.forward(this.mainLine.length);
        }
    }

    destroy(): void
    {
        this.resetSimulationAndRewind();
        this.initialPlayingGameFacade.resumeView();
        this.simulatedPlayingFacade.destroy();
    }
}
