import TimeControlType from '../time-control/TimeControlType';
import { HostedGameData } from './Types';

/**
 * Returns average seconds per move
 * for a given time control and a board size.
 */
export const calcAverageSecondsPerMove = (timeControlType: TimeControlType, boardsize: number): number => {
    /**
     * "A typical hex game fills about one-third of the board."
     *      -- from https://trmph.com/hexwiki/Basic_strategy_guide.html
     */
    const averageMoves = boardsize ** 2 / 6;

    const { type, options } = timeControlType;

    switch (type) {
        case 'simple':
            return options.secondsPerMove;

        case 'absolute':
            return options.secondsPerPlayer / averageMoves;

        case 'fischer':
            return options.initialSeconds / averageMoves
                + (options.incrementSeconds ?? 0);

        case 'byoyomi':
            console.log(
                options.initialSeconds / averageMoves
                , (Math.max(options.periodsCount - 1, 0)) * options.periodSeconds / averageMoves
                , (options.periodsCount > 0 ? options.periodSeconds : 0)
            );
            return options.initialSeconds / averageMoves
                + (options.periodsCount > 0
                    ? (options.periodsCount - 1) * options.periodSeconds / averageMoves + options.periodSeconds
                    : 0
                )
            ;
    }
};


type TimeControlCadencyName = 'blitz' | 'normal' | 'correspondance';

/**
 * Naive function that guess if a game is a blitz or correspondance
 * given its time control and board size.
 */
export const timeControlToCadencyName = (hostedGameData: HostedGameData): TimeControlCadencyName => {
    const averageSecondsPerMove = calcAverageSecondsPerMove(
        hostedGameData.timeControl.options,
        hostedGameData.gameOptions.boardsize,
    );

    if (averageSecondsPerMove < 10) {
        return 'blitz';
    }

    // wet finger technique
    if (averageSecondsPerMove > 3600 * 9) {
        return 'correspondance';
    }

    return 'normal';
};

