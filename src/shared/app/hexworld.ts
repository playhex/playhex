import { Game } from '../game-engine';
import type { Outcome, PlayerIndex } from '../game-engine/Types';

const outcomeToHexworld = (outcome: Outcome, winner: PlayerIndex | null) => {
    if (winner == null)
        return '';
    const lost = winner === 0 ? 'w' : 'b';
    switch (outcome) {
        case 'resign': return `:r${lost}`;
        case 'time': return `:f${lost}`;
        case 'forfeit': return `:f${lost}`;
        default: return '';
    }
};

/**
 * Generate a Hexworld review link from a game.
 * Example: "https://hexworld.org/board/#15c1,e6:sf7i8g10j10l6i4h3b4c13h13l10l9l8m8m9n8k12o8"
 * @param game
 * @param orientation Board rotation from 0 to 11, where 0 is the "Flat" one.
 */
export const gameToHexworldLink = (game: Game, orientation: number = 11): string => {
    if (orientation < 0 || orientation > 11)
        throw new Error('Invalid board orientation');
    const moves = game.getMovesHistory()
        .map(move => {
            if ('swap-pieces' === move.getSpecialMoveType()) {
                return ':s';
            }
            if ('pass' === move.getSpecialMoveType()) {
                return ':p';
            }
            return move.toString();
        })
        .join('');
    const size = game.getSize();
    const outcome = outcomeToHexworld(game.getOutcome(), game.getWinner());
    // from 1 to 12 (closed), shifted by -2
    const hexworldRotation = (((orientation - 2) % 12) + 11) % 12 + 1;
    const rotationConfig = hexworldRotation === 10 ? '' : 'r' + hexworldRotation;
    return `https://hexworld.org/board/#${size}${rotationConfig}c1,${moves}${outcome}`;
};
