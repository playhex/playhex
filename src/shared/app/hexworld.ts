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
 * Example: "https://hexworld.org/board/#15,e6:sf7i8g10j10l6i4h3b4c13h13l10l9l8m8m9n8k12o8"
 */
export const gameToHexworldLink = (game: Game): string => {
    const moves = game.getMovesHistory()
        .map((move, index, moves) => {
            if (1 === index && moves[0].hasSameCoordsAs(move)) {
                return ':s';
            }
            return move.toString();
        })
        .join('');
    const size = game.getSize();
    const outcome = outcomeToHexworld(game.getOutcome(), game.getWinner());
    return `https://hexworld.org/board/#${size}r9c1,${moves}${outcome}`;
};
