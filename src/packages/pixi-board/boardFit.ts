import { PointData } from 'pixi.js';

const { min, max, sin, cos } = Math;

/**
 * Area that must be visible: a point, and a margin around it.
 */
export type FitDisc = PointData & {
    radius: number;
};

export type BoardFit = {
    /**
     * Scale to apply to the board to fit in wrapper.
     */
    scale: number;

    /**
     * Point, in board coordinates, to place at the center of the wrapper.
     */
    pivot: PointData;
};

const rotate = ({ x, y }: PointData, angle: number): PointData => ({
    x: x * cos(angle) - y * sin(angle),
    y: x * sin(angle) + y * cos(angle),
});

/**
 * Computes how to scale and center the board to make all discs fit in the wrapper.
 *
 * @param discs Areas that must be visible, in board coordinates (i.e cells). Must not be empty.
 * @param rotation Board rotation, in radians.
 * @param wrapper Size of the area the board must fit in.
 */
export const computeBoardFit = (
    discs: FitDisc[],
    rotation: number,
    wrapper: { width: number, height: number },
): BoardFit => {
    const rotated = discs.map(disc => ({ ...rotate(disc, rotation), radius: disc.radius }));

    const left = min(...rotated.map(d => d.x - d.radius));
    const right = max(...rotated.map(d => d.x + d.radius));
    const top = min(...rotated.map(d => d.y - d.radius));
    const bottom = max(...rotated.map(d => d.y + d.radius));

    return {
        scale: min(
            wrapper.width / (right - left),
            wrapper.height / (bottom - top),
        ),
        pivot: rotate({ x: (left + right) / 2, y: (top + bottom) / 2 }, -rotation),
    };
};
