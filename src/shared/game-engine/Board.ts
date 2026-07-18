import { Coords, Move, parseMove } from '../move-notation/move-notation.js';
import { PlayerIndex } from './Types.js';

export const BOARD_DEFAULT_SIZE = 17;

/**
 * Y board.
 * Can set any cell, no rule check.
 * Check winning group.
 *
 * The board is a triangle of hexagonal cells. It is stored in a square
 * `size x size` array, but only the cells with `row + col <= size - 1` are on
 * the board (the lower-left triangle). The three sides are:
 *
 * - side 0 (top):        row === 0
 * - side 1 (left):       col === 0
 * - side 2 (hypotenuse): row + col === size - 1
 *
 * Both players (0 = red, 1 = blue) win the same way: connect all three sides
 * with a single contiguous group of their own stones. There are no draws.
 */
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

    getSize(): number
    {
        return this.size;
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

    getCells(): (null | PlayerIndex)[][]
    {
        return this.hexes;
    }

    getCellsClone(): (null | PlayerIndex)[][]
    {
        return this.hexes.map(row => row.slice());
    }

    getCell(move: Move): null | PlayerIndex
    {
        const { row, col } = parseMove(move);

        return this.hexes[row][col];
    }

    isEmpty(move: Move): boolean
    {
        const { row, col } = parseMove(move);

        return this.hexes[row][col] === null;
    }

    containsCoords(row: number, col: number): boolean
    {
        // Only the lower-left triangle (row + col <= size - 1) is on the board.
        return row >= 0 && col >= 0 && row + col <= this.size - 1;
    }

    containsMove(move: Move): boolean
    {
        const { row, col } = parseMove(move);

        return this.containsCoords(row, col);
    }

    /**
     * Set a cell to a value.
     * Should call move() instead to play the game.
     */
    setCell(move: Move, value: null | PlayerIndex): void
    {
        const { row, col } = parseMove(move);

        this.hexes[row][col] = value;
    }

    /**
     * Get the cells forming one of the three sides of the triangle.
     *
     * @param sideIndex 0 = top (row 0), 1 = left (col 0), 2 = hypotenuse (row + col === size - 1)
     */
    getSideCells(sideIndex: 0 | 1 | 2): Coords[]
    {
        const z = this.size - 1;

        return Array(this.size)
            .fill(0)
            .map((_, i) => {
                switch (sideIndex) {
                    case 0: return { row: 0, col: i }; // top
                    case 1: return { row: i, col: 0 }; // left
                    case 2: return { row: i, col: z - i }; // hypotenuse
                }
            })
        ;
    }

    calculateWinner(): null | PlayerIndex
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
        return this.findWinningGroup(playerIndex) !== null;
    }

    /**
     * Find a connected group of the player's stones that touches all three
     * sides of the triangle (a Y win), or null if the player has none.
     *
     * Only components that touch side 0 (top) can win (a group touching all
     * three sides necessarily touches side 0), so we seed the search there.
     */
    private findWinningGroup(playerIndex: PlayerIndex): null | Coords[]
    {
        const hash = (cell: Coords): string => cell.row + '_' + cell.col;

        const visited: { [key: string]: true } = {};

        const seeds = this
            .getSideCells(0)
            .filter(cell => this.hexes[cell.row][cell.col] === playerIndex)
        ;

        for (const seed of seeds) {
            if (visited[hash(seed)]) {
                continue;
            }

            const group: Coords[] = [];
            const sidesTouched = [false, false, false];
            const frontier: Coords[] = [seed];
            visited[hash(seed)] = true;

            let current: undefined | Coords;

            while ((current = frontier.shift())) {
                group.push(current);

                for (const sideIndex of [0, 1, 2] as const) {
                    if (this.isCellOnSide(current, sideIndex)) {
                        sidesTouched[sideIndex] = true;
                    }
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

            if (sidesTouched[0] && sidesTouched[1] && sidesTouched[2]) {
                return group;
            }
        }

        return null;
    }

    /**
     * Get the cells of the shortest winning path: a minimal "Y" of the winner's
     * stones connecting all three sides through a single junction cell.
     * Can be null, even with a winner,
     * when winner has won on time or resignation by example.
     */
    getShortestWinningPath(): null | Coords[]
    {
        const groups = this.getShortestWinningPathGroups();

        return groups && groups.flat();
    }

    /**
     * Same as getShortestWinningPath(), but cells are grouped by their distance
     * from the junction cell: group 0 is the junction alone, group 1 is the
     * (up to 3) cells one step away on each leg, group 2 the cells two steps
     * away, etc. Cells within the same group are equidistant from the junction
     * and meant to be animated in parallel, fanning out toward the three sides.
     */
    getShortestWinningPathGroups(): null | Coords[][]
    {
        const winnerIndex = this.calculateWinner();

        if (winnerIndex === null) {
            return null;
        }

        return this.getWinningYPath(winnerIndex);
    }

    /**
     * Compute the shortest "Y" path of the player's stones connecting the three
     * sides through a junction cell (the cell minimizing the total distance to
     * the three sides). Returns the path grouped by distance from the junction
     * (see getShortestWinningPathGroups()), or null if the player has no
     * winning connection.
     */
    private getWinningYPath(playerIndex: PlayerIndex): null | Coords[][]
    {
        const hash = (cell: Coords): string => cell.row + '_' + cell.col;

        // Multi-source BFS from one side, staying on the player's stones.
        const bfsFromSide = (sideIndex: 0 | 1 | 2): {
            dist: { [key: string]: number };
            parent: { [key: string]: null | Coords };
        } => {
            const dist: { [key: string]: number } = {};
            const parent: { [key: string]: null | Coords } = {};
            const frontier: Coords[] = [];

            this.getSideCells(sideIndex).forEach(cell => {
                if (this.hexes[cell.row][cell.col] === playerIndex) {
                    const h = hash(cell);

                    if (!(h in dist)) {
                        dist[h] = 0;
                        parent[h] = null;
                        frontier.push(cell);
                    }
                }
            });

            let current: undefined | Coords;

            while ((current = frontier.shift())) {
                const ch = hash(current);

                this.getNeighboors(current, playerIndex).forEach(cell => {
                    const h = hash(cell);

                    if (!(h in dist)) {
                        dist[h] = dist[ch] + 1;
                        parent[h] = current as Coords;
                        frontier.push(cell);
                    }
                });
            }

            return { dist, parent };
        };

        const bfs = [bfsFromSide(0), bfsFromSide(1), bfsFromSide(2)];

        // Junction = cell reachable from all three sides with minimal total distance
        let junction: null | Coords = null;
        let bestCost = Infinity;

        for (let row = 0; row < this.size; ++row) {
            for (let col = 0; col < this.size; ++col) {
                if (this.hexes[row][col] !== playerIndex) {
                    continue;
                }

                const h = row + '_' + col;

                if (h in bfs[0].dist && h in bfs[1].dist && h in bfs[2].dist) {
                    const cost = bfs[0].dist[h] + bfs[1].dist[h] + bfs[2].dist[h];

                    if (cost < bestCost) {
                        bestCost = cost;
                        junction = { row, col };
                    }
                }
            }
        }

        if (junction === null) {
            return null;
        }

        // Reconstruct the three legs, each ordered from the junction outward to its side.
        const legs = bfs.map(({ parent }) => {
            const leg: Coords[] = [];
            let current: null | Coords = junction;

            while (current) {
                leg.push(current);
                current = parent[hash(current)] ?? null;
            }

            return leg; // junction -> side source
        });

        // Group legs by distance from the junction so the animation starts at
        // the junction (group 0) and fans out to the three sides simultaneously,
        // one group per distance step.
        const seen: { [key: string]: true } = {};
        const groups: Coords[][] = [];
        const maxLen = Math.max(...legs.map(leg => leg.length));

        for (let d = 0; d < maxLen; ++d) {
            const group: Coords[] = [];

            for (const leg of legs) {
                const cell = leg[d];

                if (!cell) {
                    continue;
                }

                const h = hash(cell);

                if (!seen[h]) {
                    seen[h] = true;
                    group.push(cell);
                }
            }

            if (group.length > 0) {
                groups.push(group);
            }
        }

        return groups;
    }

    /**
     * @param sideIndex 0 = top (row 0), 1 = left (col 0), 2 = hypotenuse (row + col === size - 1)
     */
    isCellOnSide(cell: Coords, sideIndex: 0 | 1 | 2): boolean
    {
        switch (sideIndex) {
            case 0: return cell.row === 0; // top
            case 1: return cell.col === 0; // left
            case 2: return cell.row + cell.col === this.size - 1; // hypotenuse
        }
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
            { row: cell.row, col: cell.col - 1 },
            { row: cell.row, col: cell.col + 1 },

            { row: cell.row - 1, col: cell.col },
            { row: cell.row - 1, col: cell.col + 1 },

            { row: cell.row + 1, col: cell.col },
            { row: cell.row + 1, col: cell.col - 1 },
        ]
            .filter(cell => this.containsCoords(cell.row, cell.col)
                && (
                    playerIndex === undefined
                    || playerIndex === this.hexes[cell.row][cell.col]
                ),
            )
        ;
    }
}
