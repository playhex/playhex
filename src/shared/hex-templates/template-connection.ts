import type { Coords } from '@playhex/move-notation';

/**
 * Maps board coords to a frame where `edge` of `color` is above row 0, and back:
 * each frame is a board symmetry and its own inverse.
 *
 * Edges: red 0 top, 1 bottom; blue 0 left, 1 right.
 */
export const getEdgeFrame = (boardsize: number, color: 0 | 1, edge: 0 | 1) => ({ row, col }: Coords): Coords => {
    const z = boardsize - 1;
    const frame = color === 0 ? { row, col } : { row: col, col: row };

    return edge === 0 ? frame : { row: z - frame.row, col: z - frame.col };
};
