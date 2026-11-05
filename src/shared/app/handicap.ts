import type { HexMove } from '@playhex/move-notation';
import type { Game, GameOptions } from './models/index.js';
import type { PlayerIndex } from '../game-engine/Types.js';

/**
 * Handicap imposed when creating a game, applied with Demer handicap system:
 * https://www.hexwiki.net/index.php/Handicap
 *
 * Extra moves are encoded with "pass" moves from the other player,
 * same as guessDemerHandicap() reads them, so moves history still alternates:
 *
 *  - +0.5: red, blue, ...                                no swap
 *  - +1.5: red, pass, red, blue, ...                     no swap
 *  - +1:   red, pass, red, blue, ...                     blue refused to swap
 *  - +1:   red, swap-pieces, red, pass, red, blue, ...   blue swapped
 *  - -1:   red, blue (or swap), pass, blue, red, ...
 *
 * In this file, "demer" is the Demer handicap: positive for red (first player), negative for blue.
 * It only drives handicap setup: actual game handicap must be read from moves with guessDemerHandicap().
 */
export const MAX_HANDICAP = 5;
export const HANDICAP_STEP = 0.5;

export type HandicapStatus =
    /**
     * Red must place first stone.
     * Then followUpPlayerIndex will place followUpStones stones.
     */
    | { type: 'first_stone', playerIndex: 0, swappable: boolean, followUpPlayerIndex: PlayerIndex, followUpStones: number }

    /**
     * Blue must either swap or refuse to swap, but cannot place a stone.
     * Then red will place stones: as many as `stones` if blue refuses, one more if blue swaps.
     */
    | { type: 'swap_decision', playerIndex: 1, beneficiaryIndex: 0, stones: number }

    /**
     * playerIndex must place stone, `stones` is the number of remaining stones, including this one.
     * afterSwap is true just after blue swapped red first stone: red has one more stone to place than announced.
     */
    | { type: 'stones', playerIndex: PlayerIndex, stones: number, afterSwap: boolean }

    /**
     * playerIndex must pass, server does it automatically.
     * Then other player has `stones` remaining stones.
     */
    | { type: 'forced_pass', playerIndex: PlayerIndex, stones: number }
;

export const isValidPresetHandicap = (presetHandicap: number): boolean => {
    return Math.abs(presetHandicap) <= MAX_HANDICAP
        && Number.isInteger(presetHandicap / HANDICAP_STEP)
    ;
};

/**
 * Round a value to nearest valid preset handicap.
 */
export const toValidPresetHandicap = (value: number): number => {
    if (Number.isNaN(value)) {
        return 0;
    }

    const rounded = Math.round(value / HANDICAP_STEP) * HANDICAP_STEP;

    // "+ 0" to prevent -0
    return Math.max(-MAX_HANDICAP, Math.min(MAX_HANDICAP, rounded)) + 0;
};

/**
 * Handicap imposes some options:
 *  - half handicap: swap disabled, and the player who has the advantage plays first
 *  - integer handicap: swap enabled
 */
export const normalizeHandicapOptions = <T extends Pick<GameOptions, 'presetHandicap' | 'swapRule' | 'firstPlayer'>>(options: T): T => {
    const { presetHandicap } = options;

    if (presetHandicap === 0) {
        return options;
    }

    if (Number.isInteger(presetHandicap)) {
        options.swapRule = true;
        return options;
    }

    options.swapRule = false;
    options.firstPlayer = presetHandicap > 0 ? 0 : 1;

    return options;
};

/**
 * Convert preset handicap, relative to host, to Demer handicap, relative to red.
 * Returns 0 while players colors are not known.
 */
export const getPresetDemerHandicap = (game: Pick<Game, 'presetHandicap' | 'host' | 'gameToPlayers'>): number => {
    // presetHandicap is undefined on external games
    if (!game.presetHandicap || game.host === null || game.gameToPlayers.length < 2) {
        return 0;
    }

    return game.gameToPlayers[0].player.publicId === game.host.publicId
        ? game.presetHandicap
        : -game.presetHandicap
    ;
};

/**
 * Number of moves in history once handicap is in place.
 * Blue can add moves by swapping, so it depends on already played moves.
 */
export const getHandicapSetupLength = (demer: number, moves: HexMove[]): number => {
    if (demer === 0) {
        return 0;
    }

    const extraMoves = Math.floor(Math.abs(demer));

    if (demer < 0) {
        return 2 * extraMoves + 2;
    }

    return 2 * extraMoves + (moves[1] === 'swap-pieces' ? 3 : 1);
};

/**
 * @returns What must happen next for handicap to be in place, null if it is in place.
 */
export const getHandicapStatus = (demer: number, moves: HexMove[]): null | HandicapStatus => {
    if (demer === 0) {
        return null;
    }

    const extraMoves = Math.floor(Math.abs(demer));
    const swappable = Number.isInteger(demer);

    if (moves.length === 0) {
        return demer > 0
            ? { type: 'first_stone', playerIndex: 0, swappable, followUpPlayerIndex: 0, followUpStones: extraMoves }
            : { type: 'first_stone', playerIndex: 0, swappable, followUpPlayerIndex: 1, followUpStones: extraMoves + 1 }
        ;
    }

    if (demer > 0 && swappable && moves.length === 1) {
        return { type: 'swap_decision', playerIndex: 1, beneficiaryIndex: 0, stones: extraMoves };
    }

    const setupLength = getHandicapSetupLength(demer, moves);

    if (moves.length >= setupLength) {
        return null;
    }

    const beneficiaryIndex: PlayerIndex = demer > 0 ? 0 : 1;
    const nextPlayerIndex = (moves.length % 2) as PlayerIndex;
    const stones = Math.ceil((setupLength - moves.length) / 2);

    return nextPlayerIndex === beneficiaryIndex
        ? { type: 'stones', playerIndex: nextPlayerIndex, stones, afterSwap: demer > 0 && moves.length === 2 && moves[1] === 'swap-pieces' }
        : { type: 'forced_pass', playerIndex: nextPlayerIndex, stones }
    ;
};

/**
 * Whether move at this index is a pass forced by handicap setup,
 * and not a pass decided by a player, either during the game or to refuse to swap.
 */
export const isForcedHandicapPass = (demer: number, moves: HexMove[], moveIndex: number): boolean => {
    if (moveIndex === 1 && demer > 0 && Number.isInteger(demer)) {
        return false;
    }

    return moves[moveIndex] === 'pass'
        && moveIndex < getHandicapSetupLength(demer, moves)
    ;
};

/**
 * @returns true if a player can play this move during handicap setup, or an error message.
 */
export const checkHandicapMove = (demer: number, moves: HexMove[], move: HexMove): true | string => {
    const status = getHandicapStatus(demer, moves);

    if (status === null) {
        return true;
    }

    switch (status.type) {
        case 'swap_decision':
            return move === 'swap-pieces' || move === 'pass'
                ? true
                : 'Handicap: must swap or refuse to swap, cannot place a stone now'
            ;

        case 'forced_pass':
            return 'Handicap: cannot play, handicap is being set up';

        default:
            return move === 'pass'
                ? 'Handicap: cannot pass while handicap is being set up'
                : true
            ;
    }
};

/**
 * Whether an undo of undoneMovesCount moves leaves handicap setup untouched.
 */
export const canUndoWithHandicap = (demer: number, moves: HexMove[], undoneMovesCount: number): boolean => {
    return moves.length - undoneMovesCount >= getHandicapSetupLength(demer, moves);
};

/**
 * Whether game is too early to be considered as played by both players:
 * game can be directly canceled, and is canceled instead of lost when time elapses.
 *
 * Without handicap, it lasts until second move is played.
 * With handicap, it lasts during setup, and until first move played once handicap is in place.
 */
export const isGameInCancelWindow = (demer: number, moves: HexMove[]): boolean => {
    return moves.length <= Math.max(1, getHandicapSetupLength(demer, moves));
};
