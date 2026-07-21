import type { Outcome, PlayerIndex } from '../game-engine/Types.js';
import type { HexMove } from '../move-notation/hex-move-notation.js';
import HostedGame from './models/HostedGame.js';

const outcomeToHexworld = (outcome: null | Outcome, winner: PlayerIndex | null) => {
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
export const gameToHexworldLink = (hostedGame: HostedGame, orientation: number = 11): string => {
    return `https://hexworld.org/board/#${createHexworldString(hostedGame, orientation)}`;
};

/**
 * Encodes moves as a Hexworld moves string, 'e6:sf7i8g10j10'.
 * Special moves have their own token: ':s' for swap, ':p' for pass.
 */
export const movesToHexworldString = (moves: HexMove[]): string => moves
    .map(move => {
        if (move === 'swap-pieces') {
            return ':s';
        }
        if (move === 'pass') {
            return ':p';
        }
        return move;
    })
    .join('')
;

/**
 * Generate Hexworld string from hostedGame, '15c1,e6:sf7i8g10j10'
 * to pass as query hash.
 */
export const createHexworldString = (hostedGame: HostedGame, orientation: number = 11): string => {
    if (orientation < 0 || orientation > 11)
        throw new Error('Invalid board orientation');
    const moves = movesToHexworldString(hostedGame.moves);
    const size = hostedGame.boardsize;
    const outcome = outcomeToHexworld(hostedGame.outcome, hostedGame.winner);
    // from 1 to 12 (closed), shifted by -2
    const hexworldRotation = (((orientation - 2) % 12) + 11) % 12 + 1;
    const rotationConfig = hexworldRotation === 10 ? '' : 'r' + hexworldRotation;
    return `${size}${rotationConfig}c1,${moves}${outcome}`;
};

/**
 * Parses 14r1c1,d3:sa3... to { size: 14, moves: ["d3", "swap-pieces",  "a3", ...]' }
 *
 * Supports a cursor comma: "11c1,h4e7f9,b9c3" means the full line is h4 e7 f9 b9 c3,
 * with the cursor at f9 (cursorMoveCount = 3). When present, cursorMoveCount is returned.
 */
export const parseHexworldString = (hexworldString: string): { size: number, moves: string[], cursorMoveCount?: number } => {
    const match = hexworldString.match(/^(\d+)(?:x(\d+))?[^,]*,(.*)$/);

    if (!match) {
        throw new Error('Invalid Hexworld string');
    }

    const [, sizeStr, heightStr, movesStr] = match;

    if (heightStr !== undefined && heightStr !== sizeStr) {
        throw new Error('Non-square boards are not supported');
    }

    // Cursor comma: "played_moves,continuation" — join segments to parse uniformly
    let cursorMoveCount: number | undefined;
    let fullMovesStr = movesStr;
    const commaIndex = movesStr.indexOf(',');
    if (commaIndex !== -1) {
        cursorMoveCount = (movesStr.slice(0, commaIndex).match(/([a-z]+\d+)|(:s|:p)/g) ?? []).length;
        fullMovesStr = movesStr.slice(0, commaIndex) + movesStr.slice(commaIndex + 1);
    }

    const moves = fullMovesStr.match(/([a-z]+\d+)|(:s|:p|:r.|:f.)/g);

    if (!moves) {
        throw new Error('Error while parsing moves');
    }

    for (let i = 0; i < moves.length; ++i) {
        if (!moves[i].startsWith(':')) {
            continue;
        }

        if (moves[i] === ':s') {
            moves[i] = 'swap-pieces';
        } else if (moves[i] === ':p') {
            moves[i] = 'pass';
        } else if (moves[i].match(/^:(r|f).$/)) {
            delete moves[i];
        } else {
            throw new Error('Unexpected special move "' + moves[i] + '"');
        }
    }

    return {
        size: parseInt(sizeStr),
        moves: moves.filter(m => m),
        cursorMoveCount,
    };
};
