import { type HexMove } from '../../packages/move-notation/hex-move-notation.js';
import { coordsToMove, mirrorCenter, mirrorMove, mirrorShortDiagonal, parseMove, validateMove, type Move } from '../../packages/move-notation/move-notation.js';
import { countStones, isSimilarEnough, maxPossibleSimilarity, SIMILARITY_THRESHOLD, similarityFromCounts, type Similarity } from './position-similarity.js';

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
 * A position to compare the reference position against,
 * usually a currently playing game.
 */
export type CandidatePosition = (Position | CanonicalPosition) & {
    /**
     * Public id of the game this position comes from, if any.
     */
    gamePublicId?: string;

    /**
     * Source of the game to retrieve it.
     * Can be for example an url.
     */
    source?: string;
};

/**
 * Result of the comparison between the reference position and a candidate.
 */
export type ComparisonResult = Similarity & {
    position: CandidatePosition;

    /**
     * Mirror applied to the reference position to match the candidate,
     * or false if matched as is.
     */
    mirror: false | MirrorType;
};

/**
 * Position cannot be compared: stone on an occupied cell, out of board, misplaced swap-pieces...
 */
export class InvalidPositionError extends Error {}

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
    const occupied = new Set<Move>();
    let blackTurn = true;

    for (let i = 0; i < moves.length; ++i) {
        const move = moves[i];

        if (move === 'pass') {
            blackTurn = !blackTurn;
            continue;
        }

        if (move === 'swap-pieces') {
            const firstMove = black.pop();

            if (i !== 1 || undefined === firstMove) {
                throw new InvalidPositionError('Unexpected swap-pieces, must be the second move');
            }

            const swapped = mirrorMove(firstMove);

            occupied.delete(firstMove);
            occupied.add(swapped);
            white.push(swapped);
            blackTurn = true;

            continue;
        }

        if (occupied.has(move)) {
            throw new InvalidPositionError(`Unexpected move "${move}", cell already occupied`);
        }

        occupied.add(move);
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
 * Validates and normalizes a canonical position coming from an untrusted source (i.e Hexplorer),
 * so that it cannot bypass comparison with duplicate stones, or alternative notations like "a01".
 *
 * Returns a new canonical position, with normalized and sorted moves.
 *
 * @throws {InvalidPositionError} On invalid coords, stone out of board, or cell occupied twice.
 */
export const normalizeCanonicalPosition = ({ boardsize, black, white }: CanonicalPosition): CanonicalPosition => {
    const occupied = new Set<Move>();

    const normalize = (moves: string[]): Move[] => moves
        .map(move => {
            if (!validateMove(move)) {
                throw new InvalidPositionError(`Invalid move "${move}"`);
            }

            const coords = parseMove(move);

            if (coords.row < 0 || coords.col < 0 || coords.row >= boardsize || coords.col >= boardsize) {
                throw new InvalidPositionError(`Move "${move}" is out of board`);
            }

            const normalized = coordsToMove(coords);

            if (occupied.has(normalized)) {
                throw new InvalidPositionError(`Cell "${normalized}" occupied twice`);
            }

            occupied.add(normalized);

            return normalized;
        })
        .sort()
    ;

    return {
        boardsize,
        black: normalize(black),
        white: normalize(white),
    };
};

export const isCanonicalPosition = (position: Position | CanonicalPosition): position is CanonicalPosition => {
    return typeof ((position as CanonicalPosition).black) !== 'undefined';
};

export const toCanonicalPosition = (position: Position | CanonicalPosition): CanonicalPosition => {
    return isCanonicalPosition(position) ? position : createCanonicalPosition(position);
};

/**
 * Reference position (or one of its mirrors),
 * with stones indexed for fast lookup.
 */
type IndexedVariant = {
    mirror: false | MirrorType;
    black: Set<Move>;
    white: Set<Move>;
};

const indexVariant = (position: CanonicalPosition, mirror: false | MirrorType): IndexedVariant => ({
    mirror,
    black: new Set(position.black),
    white: new Set(position.white),
});

const countCommonStones = (variant: IndexedVariant, candidate: CanonicalPosition): number => {
    let common = 0;

    for (const move of candidate.black) {
        if (variant.black.has(move)) {
            ++common;
        }
    }

    for (const move of candidate.white) {
        if (variant.white.has(move)) {
            ++common;
        }
    }

    return common;
};

/**
 * Jaccard similarity of two positions, as is (no mirror).
 */
export const jaccardSimilarity = (a: CanonicalPosition, b: CanonicalPosition): Similarity => {
    return similarityFromCounts(countCommonStones(indexVariant(a, false), b), countStones(a), countStones(b));
};

/**
 * Board sizes of candidates that can be compared to a reference position of this board size.
 *
 * To keep it simple, only handles the case of a player importing moves of a playing game
 * on a board one size bigger (moves keep same coords).
 */
export const comparableBoardsizes = (boardsize: number): number[] => [boardsize, boardsize - 1];

/**
 * Creates the variants of the reference position to compare against candidates, by candidate board size:
 * - same size: reference as is, and all its mirrors,
 * - one size smaller: reference as is only (see comparableBoardsizes()).
 */
const createVariantsByBoardsize = (reference: CanonicalPosition): Map<number, IndexedVariant[]> => {
    const [sameSize, smallerSize] = comparableBoardsizes(reference.boardsize);

    const sameSizeVariants: IndexedVariant[] = [
        indexVariant(reference, false),
        ...([MIRROR_LONG_DIAGONAL, MIRROR_SHORT_DIAGONAL, MIRROR_CENTER] as const)
            .map(mirror => indexVariant(mirrorCanonicalPosition(reference, mirror), mirror))
        ,
    ];

    return new Map([
        [sameSize, sameSizeVariants],
        [smallerSize, [sameSizeVariants[0]]],
    ]);
};

/**
 * Compares reference position to every candidate,
 * trying every variant of the reference (see createVariantsByBoardsize()), and keeping the most similar one for each candidate.
 *
 * Returns results sorted by similarity, most similar first.
 *
 * @param reference is usually the position that AI will analyze or play
 * @param candidates are usually games currently played that should not be analyzed
 * @param predicate Only return results matching this predicate. Defaults to results similar enough to be flagged.
 * @param minSimilarity Skip candidates that cannot reach this similarity, without comparing stones. Should be consistent with predicate.
 */
export const comparePositions = (
    reference: Position | CanonicalPosition,
    candidates: CandidatePosition[],
    predicate: (result: ComparisonResult) => boolean = isSimilarEnough,
    minSimilarity = SIMILARITY_THRESHOLD,
): ComparisonResult[] => {
    const referenceCanonical = toCanonicalPosition(reference);
    const referenceCount = countStones(referenceCanonical);
    const variantsByBoardsize = createVariantsByBoardsize(referenceCanonical);

    const results: ComparisonResult[] = [];

    for (const candidate of candidates) {
        const variants = variantsByBoardsize.get(candidate.boardsize);

        if (!variants) {
            continue;
        }

        const candidateCanonical = toCanonicalPosition(candidate);
        const candidateCount = countStones(candidateCanonical);

        if (maxPossibleSimilarity(referenceCount, candidateCount) < minSimilarity) {
            continue;
        }

        let best: null | ComparisonResult = null;

        for (const variant of variants) {
            const similarity = similarityFromCounts(
                countCommonStones(variant, candidateCanonical),
                referenceCount,
                candidateCount,
            );

            if (best === null || similarity.similarity > best.similarity) {
                best = { ...similarity, position: candidate, mirror: variant.mirror };
            }
        }

        if (best !== null && predicate(best)) {
            results.push(best);
        }
    }

    results.sort((a, b) => b.similarity - a.similarity);

    return results;
};
