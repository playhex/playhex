import { Game, Move, PlayerIndex } from '.';

/**
 * State of a game.
 * Provided as input to Player to make their move.
 */
export default class GameInput
{
    private hexes: null|(null|PlayerIndex)[][] = null;

    constructor(
        private game: Game,
    ) {}

    getSize(): number
    {
        return this.game.getSize();
    }

    getHex(row: number, col: number): null|PlayerIndex
    {
        return this.game.getCell(row, col);
    }

    getHexes(): (null|PlayerIndex)[][]
    {
        if (null === this.hexes) {
            this.hexes = this.game.getCellsClone();
        }

        return this.hexes;
    }

    checkMove(move: Move): void
    {
        this.game.checkMove(move);
    }
}
