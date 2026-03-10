/**
 * Calc distance to nearest side, useful to draw i.e rings.
 */
export const distToSide = (row: number, col: number, size: number): number => {
    return Math.min(row, col, size - row - 1, size - col - 1);
};
