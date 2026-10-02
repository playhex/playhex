import { coordsToMove, type Move } from '@playhex/move-notation';
import type { Game } from '../models/index.js';
import EngineGame from '../../game-engine/EngineGame.js';
import type { PuzzleDefinition } from './puzzleTree.js';

/**
 * Position after the n first moves of a game, as puzzle initial position.
 * Handles swap: stones are read from board after replaying moves.
 */
export const getGamePosition = (game: Pick<Game, 'boardsize' | 'swapRule' | 'moves'>, movesCount: number): Pick<PuzzleDefinition, 'boardsize' | 'redStones' | 'blueStones' | 'lastMove' | 'playerColor'> => {
    const engineGame = new EngineGame(game.boardsize);

    engineGame.setAllowSwap(game.swapRule);

    game.moves.slice(0, movesCount).forEach((move, index) => {
        engineGame.move(move, index % 2 === 0 ? 0 : 1);
    });

    const redStones: Move[] = [];
    const blueStones: Move[] = [];
    engineGame.getBoard().getCells().forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
        if (cell === null) {
            return;
        }

        (cell === 0 ? redStones : blueStones).push(coordsToMove({ row: rowIndex, col: colIndex }));
    }));

    let lastMove: null | Move = null;
    const lastPlayed = game.moves[movesCount - 1];

    if (lastPlayed === 'swap-pieces') {
        lastMove = engineGame.getSwapCoords().mirror;
    } else if (lastPlayed !== undefined && lastPlayed !== 'pass') {
        lastMove = lastPlayed;
    }

    return {
        boardsize: game.boardsize,
        redStones,
        blueStones,
        lastMove,
        playerColor: movesCount % 2 === 0 ? 0 : 1,
    };
};
