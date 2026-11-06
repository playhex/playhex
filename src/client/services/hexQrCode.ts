import { encode } from 'uqr';

/**
 * Width of the blank margin around the code, in modules, as required by QR code specification.
 */
const QUIET_ZONE = 4;

/**
 * Width of the finder patterns ("eyes") in the corners of the code, in modules.
 */
const EYE_SIZE = 7;

/**
 * Half width and half height of hexagonal eyes, in modules.
 *
 * Scanners locate eyes by measuring them horizontally, vertically and diagonally,
 * and expect them to have the size of the square they replace.
 * So these hexagons are not regular: a regular one is too far from a square,
 * and is not detected by either ZXing or jsQR, depending on its size.
 * These values were tuned by decoding rendered codes with both of them. Check again if changed.
 */
const EYE_HALF_WIDTH = 3.6;
const EYE_HALF_HEIGHT = 3.55;

const hexagonPath = (centerX: number, centerY: number, scale: number): string => {
    const halfWidth = EYE_HALF_WIDTH * scale;
    const halfHeight = EYE_HALF_HEIGHT * scale;

    return `M${[
        [-halfWidth, 0],
        [-halfWidth / 2, -halfHeight],
        [halfWidth / 2, -halfHeight],
        [halfWidth, 0],
        [halfWidth / 2, halfHeight],
        [-halfWidth / 2, halfHeight],
    ].map(([x, y]) => `${(centerX + x).toFixed(3)} ${(centerY + y).toFixed(3)}`).join('L')}Z`;
};

/**
 * Scanners also expect a 1:1:3:1:1 dark/light ratio on lines crossing the center of eyes.
 * The three hexagons are scaled from the same center, so this ratio is kept in all directions.
 * To be drawn with fill-rule="evenodd".
 */
const eyePath = (x: number, y: number): string => {
    const center = EYE_SIZE / 2;

    return [EYE_SIZE, 5, 3]
        .map(width => hexagonPath(x + center, y + center, width / EYE_SIZE))
        .join('')
    ;
};

export type HexQrCode = {
    /**
     * Width and height of the code in svg units, quiet zone included.
     */
    size: number;

    /**
     * Svg path of data modules.
     */
    modulesPath: string;

    /**
     * Svg path of hexagonal eyes, to draw with fill-rule="evenodd".
     */
    eyesPath: string;
};

/**
 * Generates a QR code with hexagonal eyes.
 */
export const createHexQrCode = (text: string): HexQrCode => {
    // Medium error correction keeps game links under version 7 (from 107 characters),
    // which adds version blocks next to the eyes, and is less reliably detected with hexagons.
    // Also means larger modules, so easier to scan.
    const { data, size } = encode(text, { ecc: 'M', border: 0 });

    const isInEye = (x: number, y: number): boolean => {
        const isLeft = x < EYE_SIZE;
        const isRight = x >= size - EYE_SIZE;
        const isTop = y < EYE_SIZE;
        const isBottom = y >= size - EYE_SIZE;

        return (isTop && (isLeft || isRight)) || (isBottom && isLeft);
    };

    let modulesPath = '';

    for (let y = 0; y < size; ++y) {
        for (let x = 0; x < size; ++x) {
            if (!data[y][x] || isInEye(x, y)) {
                continue;
            }

            const startX = x;

            while (x + 1 < size && data[y][x + 1] && !isInEye(x + 1, y)) {
                ++x;
            }

            modulesPath += `M${startX + QUIET_ZONE} ${y + QUIET_ZONE}h${x - startX + 1}v1H${startX + QUIET_ZONE}Z`;
        }
    }

    const farEye = QUIET_ZONE + size - EYE_SIZE;

    return {
        size: size + 2 * QUIET_ZONE,
        modulesPath,
        eyesPath: eyePath(QUIET_ZONE, QUIET_ZONE) + eyePath(farEye, QUIET_ZONE) + eyePath(QUIET_ZONE, farEye),
    };
};
