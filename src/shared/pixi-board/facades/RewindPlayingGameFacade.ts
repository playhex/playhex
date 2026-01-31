import { PlayingGameFacade } from './PlayingGameFacade.js';

/**
 * Rewind through a game history,
 * shows the game position at an earlier state.
 */
export class RewindPlayingGameFacade
{
    /**
     * Rewind in moves history.
     *
     * If set, will show position at the state the cursor is pointing.
     *
     * 0 means before first move, so empty.
     * 1 means first move will be displayed.
     */
    private historyCursor: number;

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
        private playingGameFacade: PlayingGameFacade,
    ) {
        this.historyCursor = playingGameFacade.getMoves().length;
    }

    setHistoryCursor(historyCursor: number): void
    {
        this.historyCursor = historyCursor;
    }
}
