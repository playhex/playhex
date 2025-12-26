import { getBestMove, getBestMoveCustomPosition, WHO_BLUE, WHO_RED } from 'davies-hex-ai';
import { Game, Move } from '../game-engine/index.js';
import { PlayerIndex } from 'time-control/TimeControl.js';

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
        game.getMovesHistory().map(move => move.toString()),
        daviesLevel,
    );

    return Move.fromString(move);
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
    );

    return Move.fromString(move);
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
        position[0].push(new Move(0, i).toString());
        position[0].push(new Move(10, i).toString());
    }

    for (let i = 1; i < 10; ++i) {
        position[1].push(new Move(i, 0).toString());
        position[1].push(new Move(i, 10).toString());
    }

    for (let i = 0; i < 9; ++i) {
        for (let j = 0; j < 9; ++j) {
            const color = game.getBoard().getCell(i, j);

            if (color === null) {
                continue;
            }

            position[color].push(new Move(i + 1, j + 1).toString());
        }
    }

    const output = getBestMoveCustomPosition(
        game.getCurrentPlayerIndex() === 0 ? WHO_RED : WHO_BLUE,
        position,
        daviesLevel,
    );

    const move = Move.fromString(output);

    --move.row;
    --move.col;

    return move;
};
