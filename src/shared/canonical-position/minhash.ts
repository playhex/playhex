import { Coords } from '../move-notation/move-notation.js';
import {
    MIRROR_CENTER,
    MIRROR_LONG_DIAGONAL,
    MIRROR_SHORT_DIAGONAL,
    mirrorPosition,
    movesToStandardizedPosition,
    StandardizedPosition,
} from './index.js';

/**
 * MinHash/LSH parameters.
 *
 * A position is reduced to BAND_COUNT * BAND_SIZE MinHash values,
 * grouped into BAND_COUNT bands of BAND_SIZE values each,
 * and each band is hashed to a single number.
 *
 * Two positions get a same band hash for a given band
 * only if all BAND_SIZE MinHash values of the band agree,
 * which happens with probability jaccard(A, B) ^ BAND_SIZE.
 *
 * So probability that two positions collide on at least one band is:
 * 1 - (1 - jaccard ^ BAND_SIZE) ^ BAND_COUNT
 *
 * With 8 bands of 4, positions with jaccard 0.75+ almost always collide,
 * and unrelated positions almost never do.
 *
 * Changing any of these values, the stone encoding or the hash function
 * invalidates all stored band hashes: the index must then be fully rebuilt.
 */
export const BAND_COUNT = 8;
export const BAND_SIZE = 4;

/**
 * Band hashes of a position, for the position itself and its 3 mirrors.
 * Each item is a list of BAND_COUNT band hashes (32-bit unsigned integers).
 */
export type PositionBandHashes = {
    bandHashes: number[];
    mirrorsBandHashes: number[][];
};

/**
 * Encode a stone (coords + color) as a single integer,
 * so a position becomes a set of integers.
 */
const encodeStone = ({ row, col }: Coords, colorIndex: 0 | 1): number => {
    return colorIndex * 32768 + row * 128 + col;
};

/**
 * Deterministic 32-bit hash of an integer, parametrized by a seed.
 * Murmur3-like finalizer.
 */
const hash32 = (value: number, seed: number): number => {
    let h = (value ^ Math.imul(seed + 1, 0x9e3779b9)) >>> 0;

    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;

    return (h ^ (h >>> 16)) >>> 0;
};

const positionToEncodedStones = (position: StandardizedPosition): number[] => {
    return [
        ...position.black.map(coords => encodeStone(coords, 0)),
        ...position.white.map(coords => encodeStone(coords, 1)),
    ];
};

/**
 * Compute the BAND_COUNT band hashes of a position.
 * Board size is folded into the hashes, so same positions
 * on different board sizes never collide.
 *
 * Returns null for an empty position (no stone), which cannot be hashed.
 */
export const positionBandHashes = (position: string | StandardizedPosition, boardsize: number): null | number[] => {
    if (typeof position === 'string') {
        position = movesToStandardizedPosition(position, boardsize);
    }

    const stones = positionToEncodedStones(position);

    if (stones.length === 0) {
        return null;
    }

    const signature: number[] = [];

    for (let seed = 0; seed < BAND_COUNT * BAND_SIZE; ++seed) {
        let min = Infinity;

        for (const stone of stones) {
            const h = hash32(stone, seed);

            if (h < min) {
                min = h;
            }
        }

        signature.push(min);
    }

    const bandHashes: number[] = [];

    for (let band = 0; band < BAND_COUNT; ++band) {
        let bandHash = hash32(position.boardsize, 0xb0a2d);

        for (let i = 0; i < BAND_SIZE; ++i) {
            bandHash = hash32(bandHash ^ signature[band * BAND_SIZE + i], band);
        }

        bandHashes.push(bandHash);
    }

    return bandHashes;
};

/**
 * Band hashes of a position and of its 3 mirrors.
 *
 * All variants are meant to be stored in the index,
 * so games that are mirrors of a searched position are found
 * by looking up only the searched position band hashes.
 *
 * Returns null for an empty position (no stone).
 */
export const allMirrorsBandHashes = (position: string | StandardizedPosition, boardsize: number): null | PositionBandHashes => {
    if (typeof position === 'string') {
        position = movesToStandardizedPosition(position, boardsize);
    }

    const bandHashes = positionBandHashes(position, boardsize);

    if (bandHashes === null) {
        return null;
    }

    return {
        bandHashes,
        mirrorsBandHashes: [
            positionBandHashes(mirrorPosition(position, MIRROR_LONG_DIAGONAL), boardsize) as number[],
            positionBandHashes(mirrorPosition(position, MIRROR_SHORT_DIAGONAL), boardsize) as number[],
            positionBandHashes(mirrorPosition(position, MIRROR_CENTER), boardsize) as number[],
        ],
    };
};
