import { coordsToMove, parseMove, validateMove, type Move } from '@playhex/move-notation';
import { swapMaps } from './swap-maps.js';

/*
 * Opening logic shared by all AIs, based on swap maps:
 * - first move: play a fair move, win rate close to 0.5
 * - second move: swap if opponent first move is too strong
 *
 * Not determinist: around 0.5, swap is decided randomly,
 * with a probability following a sigmoid of first move win rate.
 *
 * Choice of thresholds and sigmoid parameters:
 * win rates in swap maps are quite tight, few cells are close to 0.5
 * (none between 0.3 and 0.7 on boards up to 12x12, i.e 11x11 closest cell is 0.194).
 * With tight thresholds (i.e 0.3 / 0.7) and a steep sigmoid, AIs would always open
 * with the same few moves, and swap or not almost deterministically.
 * So thresholds are voluntarily wide and the sigmoid gentle,
 * to make both swap decision and first moves less predictable.
 */

/**
 * First player win rate below which second player never swaps.
 * Voluntarily low, see above.
 */
export const SWAP_NEVER_BELOW = 0.15;

/**
 * First player win rate above which second player always swaps.
 * Voluntarily high, see above.
 */
export const SWAP_ALWAYS_ABOVE = 0.85;

/**
 * Win rate at which second player has one chance on two to swap.
 */
export const SWAP_SIGMOID_CENTER = 0.5;

/**
 * Steepness of swap probability sigmoid.
 * Voluntarily gentle, see above (a steep one like 20 would give 0.4 => 12%, 0.6 => 88%).
 * With 6: 0.2 => 14%, 0.4 => 35%, 0.5 => 50%, 0.6 => 65%, 0.8 => 86% chances to swap.
 * Also used to weight first moves: gentler means more various first moves.
 */
export const SWAP_SIGMOID_STEEPNESS = 6;

/**
 * Minimum number of candidate first moves.
 * On small boards, few or no cells are between SWAP_NEVER_BELOW and SWAP_ALWAYS_ABOVE,
 * so the cells closest to 0.5 are taken instead, to keep some variety.
 * Ties are all included (symmetric cells have same win rate).
 */
export const MIN_FIRST_MOVE_CANDIDATES = 4;

const sigmoid = (winRate: number): number =>
    1 / (1 + Math.exp(-SWAP_SIGMOID_STEEPNESS * (winRate - SWAP_SIGMOID_CENTER)))
;

/**
 * Probability to swap a first move having this first player win rate.
 */
export const swapProbability = (winRate: number): number => {
    if (winRate < SWAP_NEVER_BELOW) {
        return 0;
    }

    if (winRate > SWAP_ALWAYS_ABOVE) {
        return 1;
    }

    return sigmoid(winRate);
};

/**
 * First player win rate after playing this first move.
 *
 * @returns null if there is no swap map for this board size, or move is not a cell (i.e "pass").
 */
export const getFirstMoveWinRate = (size: number, move: string): null | number => {
    const swapMap = swapMaps[size];

    if (!swapMap || !validateMove(move)) {
        return null;
    }

    const { row, col } = parseMove(move);

    return swapMap[row]?.[col] ?? null;
};

/**
 * Whether second player should swap this first move.
 *
 * @param rng Returns a random number in [0;1[
 *
 * @returns null if cannot decide (no swap map for this board size), let the engine decide.
 */
export const shouldSwap = (size: number, firstMove: string, rng: () => number = Math.random): null | boolean => {
    const winRate = getFirstMoveWinRate(size, firstMove);

    if (winRate === null) {
        return null;
    }

    return rng() < swapProbability(winRate);
};

/**
 * Pick a fair first move, more likely close to 0.5.
 *
 * Candidates are all cells between SWAP_NEVER_BELOW and SWAP_ALWAYS_ABOVE,
 * completed by the cells closest to 0.5 to have at least MIN_FIRST_MOVE_CANDIDATES.
 *
 * Each candidate is weighted by s * (1 - s), s being the swap sigmoid (without thresholds),
 * so the more uncertain opponent swap decision is, the more likely this move is played.
 *
 * @param rng Returns a random number in [0;1[
 *
 * @returns null if no swap map for this board size.
 */
export const pickFairFirstMove = (size: number, rng: () => number = Math.random): null | Move => {
    const candidates = getFirstMoveCandidates(size);

    if (candidates === null) {
        return null;
    }

    const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let target = rng() * totalWeight;

    for (const candidate of candidates) {
        target -= candidate.weight;

        if (target < 0) {
            return candidate.move;
        }
    }

    // float rounding
    return candidates[candidates.length - 1].move;
};

/**
 * Candidate first moves and their probability to be played by pickFairFirstMove().
 *
 * @returns null if no swap map for this board size.
 */
export const getFirstMoveCandidates = (size: number): null | { move: Move, winRate: number, weight: number, probability: number }[] => {
    const swapMap = swapMaps[size];

    if (!swapMap) {
        return null;
    }

    const distance = (winRate: number) => Math.abs(winRate - SWAP_SIGMOID_CENTER);
    const cells: { move: Move, winRate: number }[] = [];

    for (let row = 0; row < size; ++row) {
        for (let col = 0; col < size; ++col) {
            cells.push({ move: coordsToMove({ row, col }), winRate: swapMap[row][col] });
        }
    }

    cells.sort((a, b) => distance(a.winRate) - distance(b.winRate));

    const minCandidatesDistance = distance(cells[Math.min(MIN_FIRST_MOVE_CANDIDATES, cells.length) - 1].winRate);
    const candidates = cells
        .filter(({ winRate }) => (winRate >= SWAP_NEVER_BELOW && winRate <= SWAP_ALWAYS_ABOVE)
            || distance(winRate) <= minCandidatesDistance,
        )
        .map(cell => {
            const s = sigmoid(cell.winRate);

            return { ...cell, weight: s * (1 - s) };
        })
    ;

    const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);

    return candidates.map(candidate => ({ ...candidate, probability: candidate.weight / totalWeight }));
};
