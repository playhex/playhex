import { HexMove } from '../move-notation/hex-move-notation.js';
import { mirrorCenter, mirrorMove, mirrorShortDiagonal, Move } from '../move-notation/move-notation.js';

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
 * A raw position, sequence of moves where black plays first.
 */
export type Position = {
    boardsize: number;
    moves: HexMove[];

    /**
     * Source of the game to retrieve it.
     * Can be for example an url.
     */
    source?: string;
};

/**
 * A position described by which cells are occupied by each color.
 * Moves of each color are sorted, so two same positions have same lists.
 */
export type CanonicalPosition = {
    boardsize: number;
    black: Move[];
    white: Move[];
};

/**
 * Diff between 2 canonical positions.
 */
export type ComparisonResult = {
    position: Position;
    distance: number;
    mirror: false | MirrorType;
};

/**
 * Creates a CanonicalPosition from a moves list.
 * Moves are sorted.
 *
 * [d3, swap-pieces, a2]
 * =>
 * black: [a2]
 * white: [c4]
 */
export const createCanonicalPosition = ({ boardsize, moves }: Position): CanonicalPosition => {
    const black: Move[] = [];
    const white: Move[] = [];
    let blackTurn = true;

    for (let i = 0; i < moves.length; ++i) {
        const move = moves[i];

        if (move === 'pass') {
            continue;
        }

        if (move === 'swap-pieces') {
            const firstMove = black.pop();

            if (i !== 1 || undefined === firstMove) {
                throw new Error('Unexpected swap-pieces, must be the second move');
            }

            white.push(mirrorMove(firstMove));
            blackTurn = true;

            continue;
        }

        (blackTurn ? black : white).push(move);
        blackTurn = !blackTurn;
    }

    black.sort();
    white.sort();

    return { boardsize, black, white };
};

/**
 * Returns same position, mirrored.
 * Long and short diagonal mirrors also mirror colors.
 */
export const mirrorCanonicalPosition = (canonicalPosition: CanonicalPosition, mirror: MirrorType): CanonicalPosition => {
    const { boardsize, black, white } = canonicalPosition;

    switch (mirror) {
        case MIRROR_LONG_DIAGONAL:
            return {
                boardsize,
                black: white.map(move => mirrorMove(move)).sort(),
                white: black.map(move => mirrorMove(move)).sort(),
            };

        case MIRROR_SHORT_DIAGONAL:
            return {
                boardsize,
                black: white.map(move => mirrorShortDiagonal(move, boardsize)).sort(),
                white: black.map(move => mirrorShortDiagonal(move, boardsize)).sort(),
            };

        case MIRROR_CENTER:
            return {
                boardsize,
                black: black.map(move => mirrorCenter(move, boardsize)).sort(),
                white: white.map(move => mirrorCenter(move, boardsize)).sort(),
            };
    }
};

/**
 * Number of stones which are not on same cell/color in both positions.
 */
const positionsDistance = (a: CanonicalPosition, b: CanonicalPosition): number => {
    const cells: { [move: Move]: true } = {};
    let distance = 0;

    for (const move of a.black) {
        cells[move] = true;
    }

    for (const move of b.black) {
        if (cells[move]) {
            delete cells[move];
        } else {
            ++distance;
        }
    }

    distance += Object.keys(cells).length;

    const whiteCells: { [move: Move]: true } = {};

    for (const move of a.white) {
        whiteCells[move] = true;
    }

    for (const move of b.white) {
        if (whiteCells[move]) {
            delete whiteCells[move];
        } else {
            ++distance;
        }
    }

    return distance + Object.keys(whiteCells).length;
};

const isCanonicalPosition = (position: Position | CanonicalPosition): position is CanonicalPosition => {
    return typeof ((position  as CanonicalPosition).black) !== 'undefined';
};

/**
 * Compares reference position to every candidate,
 * trying every mirror of the reference, and keeping the closest one.
 *
 * Returns results sorted by distance, closest first.
 *
 * @param reference is usually the game that AI will analyze
 * @param candidates are usually games currently played that should not be analyzed
 * @param maxDistance Skip positions if distance is greater. Will optimize by skipping more and sorting less positions.
 */
export const comparePositions = (reference: Position | CanonicalPosition, candidates: Position[], maxDistance = 1000): ComparisonResult[] => {
    const mirrors: (false | MirrorType)[] = [false, MIRROR_LONG_DIAGONAL, MIRROR_SHORT_DIAGONAL, MIRROR_CENTER];
    const referenceCanonical = isCanonicalPosition(reference) ? reference : createCanonicalPosition(reference);
    const references = mirrors.map(mirror => mirror
        ? mirrorCanonicalPosition(referenceCanonical, mirror)
        : referenceCanonical,
    );

    const similarPositions: ComparisonResult[] = [];

    for (const candidate of candidates) {
        const candidateCanonical = createCanonicalPosition(candidate);

        for (let i = 0; i < mirrors.length; ++i) {
            // Only check if same board size, or one boardsize up or down
            // in case player tries to use size 12 to analyze a position on size 11
            if (Math.abs(reference.boardsize - candidateCanonical.boardsize) > 1) {
                continue;
            }

            // do not compare empty and near-empty positions
            if (candidate.moves.length < 5 || (referenceCanonical.black.length + referenceCanonical.white.length) < 5) {
                continue;
            }

            // skip now if number of moves is too different
            if (Math.abs(referenceCanonical.black.length + referenceCanonical.white.length - candidate.moves.length) > maxDistance) {
                continue;
            }

            const distance = positionsDistance(references[i], candidateCanonical);

            if (distance > maxDistance) {
                continue;
            }

            similarPositions.push({
                position: candidate,
                distance,
                mirror: mirrors[i],
            });
        }
    }

    similarPositions.sort((a, b) => a.distance - b.distance);

    return similarPositions;
};
