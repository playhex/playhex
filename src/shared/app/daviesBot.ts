import { getBestMove, getBestMoveCustomPosition, WHO_BLUE, WHO_RED } from 'davies-hex-ai';
import { Game } from '../game-engine/index.js';
import { PlayerIndex } from 'time-control/TimeControl.js';
import { coordsToMove, Move, moveToCoords } from '../move-notation/move-notation.js';

/**
 * Uses Davies AI to compute a move from a Game.
 * Davies only supports 11x11 boards.
 */
export const calcDaviesMove = async (game: Game, daviesLevel = 7, waitBeforePlay = 0): Promise<Move> => {
    if (game.getSize() !== 11) {
        throw new Error('Davies AI only supports 11x11');
    }

    if (waitBeforePlay > 0) {
        await new Promise(resolve => {
            setTimeout(resolve, waitBeforePlay);
        });
    }

    const move = getBestMove(
        game.getCurrentPlayerIndex() === 0 ? WHO_RED : WHO_BLUE,
        game.getMovesHistory().map(timestampedMove => timestampedMove.move),
        daviesLevel,
    ) as Move;

    return move;
};

export const calcDaviesMoveCustomPosition = async (playerTurn: PlayerIndex, position: [string[], string[]], daviesLevel = 7, waitBeforePlay = 0): Promise<Move> => {
    if (waitBeforePlay > 0) {
        await new Promise(resolve => {
            setTimeout(resolve, waitBeforePlay);
        });
    }

    const move = getBestMoveCustomPosition(
        playerTurn === 0 ? WHO_RED : WHO_BLUE,
        position,
        daviesLevel,
    ) as Move;

    return move;
};

/**
 * Fill outside cells with stones to create a 9x9 board.
 * Then shift move input and output to use davies AI on 9x9 board.
 */
export const calcDaviesMoveFor9x9Board = async (game: Game, daviesLevel = 7, waitBeforePlay = 0): Promise<Move> => {
    if (game.getSize() !== 9) {
        throw new Error('calcDaviesMoveFor9x9Board() only supports 9x9');
    }

    if (waitBeforePlay > 0) {
        await new Promise(resolve => {
            setTimeout(resolve, waitBeforePlay);
        });
    }

    const position: [string[], string[]] = [[], []];

    for (let i = 0; i < 11; ++i) {
        position[0].push(coordsToMove({ row: 0, col: i }));
        position[0].push(coordsToMove({ row: 10, col: i }));
    }

    for (let i = 1; i < 10; ++i) {
        position[1].push(coordsToMove({ row: i, col: 0 }));
        position[1].push(coordsToMove({ row: i, col: 10 }));
    }

    for (let i = 0; i < 9; ++i) {
        for (let j = 0; j < 9; ++j) {
            const color = game.getBoard().getCell(coordsToMove({ row: i, col: j }));

            if (color === null) {
                continue;
            }

            position[color].push(coordsToMove({ row: i + 1, col: j + 1 }));
        }
    }

    const output = getBestMoveCustomPosition(
        game.getCurrentPlayerIndex() === 0 ? WHO_RED : WHO_BLUE,
        position,
        daviesLevel,
    ) as Move;

    const coords = moveToCoords(output);

    --coords.row;
    --coords.col;

    return coordsToMove(coords);
};
