import { Game, Move, PlayerIndex } from '.';

/**
 * State of a game.
 * Provided as input to Player to make their move.
 */
export default class GameInput
{
    private hexes: null|(null|PlayerIndex)[][] = null;

    public constructor(
        private game: Game,
    ) {}

    public getSize(): number
    {
        return this.game.getSize();
    }

    public getHex(row: number, col: number): null|PlayerIndex
    {
        return this.game.getCell(row, col);
    }

    public getHexes(): (null|PlayerIndex)[][]
    {
        if (null === this.hexes) {
            this.hexes = this.game.getCellsClone();
        }

        return this.hexes;
    }

    public checkMove(move: Move): void
    {
        this.game.checkMove(move);
    }
}
