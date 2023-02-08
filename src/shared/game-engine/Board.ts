import { Coords, PathItem, PlayerIndex } from './Types';

export const BOARD_DEFAULT_SIZE = 11;

export default class Board
{
    private hexes: (null | PlayerIndex)[][];

    constructor(
        private size: number = BOARD_DEFAULT_SIZE,
    ) {
        this.hexes = Array(this.size)
            .fill([])
            .map(() => Array(this.size).fill(null))
        ;
    }

    static createFromGrid(hexes: (null | PlayerIndex)[][]): Board
    {
        const board = new Board(hexes.length);

        hexes.forEach((line, row) => {
            line.forEach((value, col) => {
                board.hexes[row][col] = value;
            });
        });

        return board;
    }

    getCells(): (null|PlayerIndex)[][]
    {
        return this.hexes;
    }

    getCellsClone(): (null|PlayerIndex)[][]
    {
        return this.hexes.map(row => row.slice());
    }

    getCell(row: number, col: number): null|PlayerIndex
    {
        return this.hexes[row][col];
    }

    isEmpty(row: number, col: number): boolean
    {
        return null === this.hexes[row][col];
    }

    containsCoords(row: number, col: number): boolean
    {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    /**
     * Set a cell to a value.
     * Should call move() instead to play the game.
     */
    setCell(row: number, col: number, value: null | PlayerIndex): void
    {
        this.hexes[row][col] = value;
    }

    getSideCells(playerIndex: PlayerIndex, sideIndex: 0 | 1): Coords[]
    {
        const z = this.size - 1;

        return Array(this.size)
            .fill(0)
            .map((_, i) => playerIndex
                ? sideIndex
                    ? {row: z, col: i} // bottom
                    : {row: 0, col: i} // top
                : sideIndex
                    ? {row: i, col: z} // right
                    : {row: i, col: 0} // left
            )
        ;
    }

    calculateWinner(): null|PlayerIndex
    {
        if (this.hasPlayerConnection(0)) {
            return 0;
        }

        if (this.hasPlayerConnection(1)) {
            return 1;
        }

        return null;
    }

    hasPlayerConnection(playerIndex: PlayerIndex): boolean
    {
        const hash = (cell: Coords): string => cell.row + '_' + cell.col;

        const visited: {[key: string]: true} = {};
        const frontier: Coords[] = [];

        this.getSideCells(playerIndex, 0).forEach(cell => {
            if (playerIndex === this.hexes[cell.row][cell.col]) {
                frontier.push(cell);
                visited[hash(cell)] = true;
            }
        });

        let current: undefined|Coords;

        while ((current = frontier.shift())) {
            if (this.isCellOnSide(current, playerIndex, 1)) {
                return true;
            }

            this
                .getNeighboors(current, playerIndex)
                .forEach(cell => {
                    if (!visited[hash(cell)]) {
                        frontier.push(cell);
                        visited[hash(cell)] = true;
                    }
                })
            ;
        }

        return false;
    }

    private flattenPath(pathItem: PathItem): Coords[]
    {
        const path: Coords[] = [];
        let current: null | PathItem = pathItem;

        while (current) {
            path.unshift(current.cell);

            current = current.parent;
        }

        return path;
    }

    getShortestWinningPath(): null | Coords[]
    {
        const winnerIndex = this.calculateWinner();

        if (null === winnerIndex) {
            return null;
        }

        const visited: {[key: string]: true} = {};
        const hash = (cell: Coords): string => cell.row + '_' + cell.col;
        const pathHeads: PathItem[] = this
            .getSideCells(winnerIndex, 0)
            .filter(cell => this.hexes[cell.row][cell.col] === winnerIndex)
            .map<PathItem>(cell => {
                visited[hash(cell)] = true;

                return {
                    parent: null,
                    cell,
                };
            })
        ;

        let pathHead: undefined | PathItem;

        while ((pathHead = pathHeads.shift())) {
            if (this.isCellOnSide(pathHead.cell, winnerIndex, 1)) {
                return this.flattenPath(pathHead);
            }

            this.getNeighboors(pathHead.cell, winnerIndex)
                .forEach(cell => {
                    if (!visited[hash(cell)]) {
                        const pathItem: PathItem = {
                            parent: pathHead as PathItem,
                            cell,
                        };

                        pathHeads.push(pathItem);
                        visited[hash(cell)] = true;
                    }
                })
            ;
        }

        return null;
    }

    isCellOnSide(cell: Coords, playerIndex: PlayerIndex, sideIndex: 0 | 1): boolean
    {
        const z = this.size - 1;

        return playerIndex
            ? sideIndex
                ? cell.row === z // bottom
                : cell.row === 0 // top
            : sideIndex
                ? cell.col === z // right
                : cell.col === 0 // left
    }

    /**
     * Get cells adjacents to a given cell.
     *
     * @param cell Given cell to get neighboors
     * @param playerIndex If null or 0 or 1 provided, get only neighboors with this value
     */
    getNeighboors(cell: Coords, playerIndex: undefined | null | PlayerIndex = undefined): Coords[]
    {
        return [
            {row: cell.row, col: cell.col - 1},
            {row: cell.row, col: cell.col + 1},

            {row: cell.row - 1, col: cell.col},
            {row: cell.row - 1, col: cell.col + 1},

            {row: cell.row + 1, col: cell.col},
            {row: cell.row + 1, col: cell.col - 1},
        ]
            .filter(cell => this.containsCoords(cell.row, cell.col)
                && (
                    playerIndex === undefined
                    || playerIndex === this.hexes[cell.row][cell.col]
                )
            )
        ;
    }
}
