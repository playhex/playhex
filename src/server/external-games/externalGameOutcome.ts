import type { HexMove } from '@playhex/move-notation';
import { EngineGame } from '../../shared/game-engine/index.js';

/**
 * Replays moves to know if a player connected his sides.
 * Player 0 plays first move.
 *
 * @returns Index of player who connected, null if nobody connected yet,
 *          undefined if moves cannot be replayed (invalid move...).
 */
export const findPathWinner = (boardsize: number, moves: HexMove[]): undefined | null | 0 | 1 => {
    try {
        const engineGame = new EngineGame(boardsize);

        engineGame.setAllowSwap(true);

        moves.forEach((move, index) => engineGame.move(move, index % 2 as 0 | 1));

        return engineGame.getWinner();
    } catch {
        return undefined;
    }
};
