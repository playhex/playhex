export interface ShadingPatternInterface
{
    /**
     * Returns a shading level between [0, 1] given a coordinate and a boardsize.
     *
     * @param row Row of the cell to shade, in [0, size[
     * @param col Col of the cell to shade, in [0, size[
     * @param size Boardsize
     *
     * @returns A shading level in [0, 1]. 0 means no shading (cell color), 1 means fully shaded (cell shading color).
     *          0.5 means half-shaded (shading color semi-transparent),
     *          useful for tri color shading patterns.
     */
    calc(row: number, col: number, size: number): number;
}
