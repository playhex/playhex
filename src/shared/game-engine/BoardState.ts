import { Board, Move, PlayerIndex } from '.';

/**
 * State of a game.
 * Provided as input to Player to make their move.
 */
export default class BoardState
{
    private hexes: null|(null|PlayerIndex)[][] = null;

    public constructor(
        private board: Board,
    ) {}

    public getSize(): number
    {
        return this.board.getSize();
    }

    public getHex(row: number, col: number): null|PlayerIndex
    {
        return this.board.getCell(row, col);
    }

    public getHexes(): (null|PlayerIndex)[][]
    {
        if (null === this.hexes) {
            this.hexes = this.board.getCellsClone();
        }

        return this.hexes;
    }

    public checkMove(move: Move): void
    {
        this.board.checkMove(move);
    }
}
