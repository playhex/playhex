import { HexMove, isSpecialHexMove } from '../move-notation/hex-move-notation.js';
import { areCoordsSame, Coords, coordsToMove, mirrorMove, Move, parseMove } from '../move-notation/move-notation.js';

/**
 * Mirrored around long diagonal, colors are mirrored, b2 => a1, independant to board size
 */
export const MIRROR_LONG_DIAGONAL = 'long-diagonal' as const;

/**
 * Mirrored around short diagonal, colors are mirrored, a2 => j11 (on 11x11), dependant to board size
 */
export const MIRROR_SHORT_DIAGONAL = 'short-diagonal' as const;

/**
 * Mirrored around center, colors remains same, a2 => k10 (on 11x11), dependant to board size
 */
export const MIRROR_CENTER = 'center' as const;

/**
 * Possibles mirrors of a Hex game position
 */
export type MirrorType =
    | typeof MIRROR_LONG_DIAGONAL
    | typeof MIRROR_SHORT_DIAGONAL
    | typeof MIRROR_CENTER
;

/**
 * Diff between 2 positions.
 * Stones that are missing/extra in reference position
 * that are not in checked position.
 */
export type PositionDiff = {
    /**
     * Stones missing in reference position but not in checked position.
     */
    missing: Move[];

    /**
     * Extra stones in checked position but not in reference position.
     * If mirrored, returns the cell in the point of view of the reference position.
     */
    extra: Move[];
};

/**
 * List of black and white stones,
 * after swap-pieces (if any) is made,
 * and without pass moves.
 */
export type StandardizedPosition = {
    boardsize: number;
    black: Coords[];
    white: Coords[];
};

/**
 * A hex position can be:
 * mirrored vertically and color mirrored,
 * mirrored horizontally and color mirrored,
 * mirrored both horizontally and vertically without color mirror,
 * played in a different order,
 *
 * yet the position is still the same.
 *
 * So to compare two positions and abstract mirroring,
 * we should compare the first position to the 4 mirrors of the second position,
 * and return the lowest distance of the 4 distances.
 *
 * This function should return diff in positionB from positionA (positionA is reference, not mirrored):
 * extra stones, missing stones, and the detected mirroring of the positionB.
 */
export const compareAllPositions = (positionA: string | StandardizedPosition, positionB: string | StandardizedPosition, boardsize: number): PositionDiff => {
    if (typeof positionA === 'string') {
        positionA = movesToStandardizedPosition(positionA, boardsize);
    }

    if (typeof positionB === 'string') {
        positionB = movesToStandardizedPosition(positionB, boardsize);
    }

    let bestDiff = diffPosition(positionA, positionB);
    let bestDistance = positionDiffDistance(bestDiff);

    if (bestDistance === 0) {
        return bestDiff;
    }

    for (const diff of [
        diffPosition(positionA, mirrorPosition(positionB, MIRROR_LONG_DIAGONAL)),
        diffPosition(positionA, mirrorPosition(positionB, MIRROR_SHORT_DIAGONAL)),
        diffPosition(positionA, mirrorPosition(positionB, MIRROR_CENTER)),
    ]) {
        const distance = positionDiffDistance(diff);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestDiff = diff;
        }
    }

    return bestDiff;
};

/**
 * Returns missing and extra stones in positionB from positionA.
 */
const diffPosition = (positionA: StandardizedPosition, positionB: StandardizedPosition): PositionDiff => {
    const missing: Move[] = [];
    const extra: Move[] = [];

    for (const color of colors) {
        for (const coords of positionA[color]) {
            if (!positionB[color].some(c => areCoordsSame(c, coords))) {
                missing.push(coordsToMove(coords));
            }
        }

        for (const coords of positionB[color]) {
            if (!positionA[color].some(c => areCoordsSame(c, coords))) {
                extra.push(coordsToMove(coords));
            }
        }
    }

    return { missing, extra };
};

/**
 * Norm of a position diff.
 * 0 means no diff, 1 means one extra or missing stone.
 */
export const positionDiffDistance = (positionDiff: PositionDiff): number => {
    return positionDiff.extra.length + positionDiff.missing.length;
};

export const mirrorLongDiagonal = ({ row, col }: Coords) => ({ row: col, col: row });
export const mirrorShortDiagonal = ({ row, col }: Coords, size: number) => ({ row: size - col - 1, col: size - row - 1 });
export const mirrorCenter = ({ row, col }: Coords, size: number) => ({ row: size - row - 1, col: size - col - 1 });

export const mirrorPosition = (position: StandardizedPosition, mirrorType: MirrorType): StandardizedPosition => {
    const { boardsize } = position;

    if (mirrorType === MIRROR_LONG_DIAGONAL) {
        return {
            boardsize,
            black: position.white.map(c => mirrorLongDiagonal(c)),
            white: position.black.map(c => mirrorLongDiagonal(c)),
        };
    }

    if (mirrorType === MIRROR_SHORT_DIAGONAL) {
        return {
            boardsize,
            black: position.white.map(c => mirrorShortDiagonal(c, boardsize)),
            white: position.black.map(c => mirrorShortDiagonal(c, boardsize)),
        };
    }

    if (mirrorType === MIRROR_CENTER) {
        return {
            boardsize,
            black: position.black.map(c => mirrorCenter(c, boardsize)),
            white: position.white.map(c => mirrorCenter(c, boardsize)),
        };
    }

    throw new Error('unexpected mirror type: ' + String(mirrorType));
};

const colors = ['black', 'white'] as const;

/**
 * ['d3', 'swap-pieces', 'a2']
 * =>
 * black: [{ row: ... col: ... }]
 * white: [{ row: ... col: ... }]
 */
export const movesToStandardizedPosition = (movesString: string, boardsize: number): StandardizedPosition => {
    const moves = movesString.split(' ') as unknown as HexMove[];

    const standardizedPosition: StandardizedPosition = {
        boardsize,
        black: [],
        white: [],
    };

    for (let i = 0; i < moves.length; ++i) {
        const move = moves[i];

        if (move === 'pass') {
            continue;
        }

        if (move === 'swap-pieces') {
            const move0 = moves[0];

            if (!isSpecialHexMove(move0)) {
                standardizedPosition.white.push(parseMove(mirrorMove(move0)));
            }

            continue;
        }

        standardizedPosition[colors[i % 2]].push(parseMove(move));
    }

    return standardizedPosition;
};
