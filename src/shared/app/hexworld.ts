import { Game } from '../game-engine';

/**
 * Generate a Hexworld review link from a game.
 * Example: "https://hexworld.org/board/#15,e6:sf7i8g10j10l6i4h3b4c13h13l10l9l8m8m9n8k12o8"
 */
export const gameToHexworldLink = (game: Game): string => game
    .getMovesHistory()
    .reduce(
        (link, move, index, moves) => {
            if (1 === index && moves[0].hasSameCoordsAs(moves[1])) {
                return link + ':s';
            }

            return link + move.toString();
        },
        `https://hexworld.org/board/#${game.getSize()}r9c1,`,
    )
;
