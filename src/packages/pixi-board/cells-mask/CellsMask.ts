import { Coords, Move, parseMove } from '@playhex/move-notation';

const toCoords = (cell: Move | Coords): Coords => typeof cell === 'string'
    ? parseMove(cell)
    : cell
;

/**
 * Which cells of the board are displayed.
 * Used to hide some cells, or to display a partial board.
 *
 * Hidden cells are not drawn, nor their stones and marks, and cannot be clicked.
 *
 * Immutable: create a new mask to change displayed cells.
 */
export class CellsMask
{
    private constructor(
        private boardsize: number,

        /**
         * visible[row][col]
         */
        private visible: boolean[][],
    ) {}

    /**
     * All cells displayed.
     */
    static all(boardsize: number): CellsMask
    {
        return CellsMask.create(boardsize, true, []);
    }

    /**
     * All cells displayed, except these ones.
     */
    static hiding(boardsize: number, cells: (Move | Coords)[]): CellsMask
    {
        return CellsMask.create(boardsize, true, cells);
    }

    /**
     * Only these cells displayed, to show a partial board.
     */
    static showingOnly(boardsize: number, cells: (Move | Coords)[]): CellsMask
    {
        return CellsMask.create(boardsize, false, cells);
    }

    /**
     * @param defaultVisible Visibility of all cells,
     * @param exceptions Cells with the opposite visibility. Cells out of board are ignored.
     */
    private static create(boardsize: number, defaultVisible: boolean, exceptions: (Move | Coords)[]): CellsMask
    {
        const visible = Array(boardsize).fill(null).map(() => Array<boolean>(boardsize).fill(defaultVisible));

        for (const cell of exceptions) {
            const { row, col } = toCoords(cell);

            if (row >= 0 && row < boardsize && col >= 0 && col < boardsize) {
                visible[row][col] = !defaultVisible;
            }
        }

        return new CellsMask(boardsize, visible);
    }

    getBoardsize(): number
    {
        return this.boardsize;
    }

    /**
     * @returns Whether cell is displayed. False for cells out of board.
     */
    isVisible(cell: Move | Coords): boolean
    {
        const { row, col } = toCoords(cell);

        return this.visible[row]?.[col] ?? false;
    }

    hasHiddenCells(): boolean
    {
        return this.visible.some(row => row.includes(false));
    }

    getVisibleCoords(): Coords[]
    {
        const coords: Coords[] = [];

        for (let row = 0; row < this.boardsize; ++row) {
            for (let col = 0; col < this.boardsize; ++col) {
                if (this.visible[row][col]) {
                    coords.push({ row, col });
                }
            }
        }

        return coords;
    }
}
