import { Game, Move, PlayerIndex } from '.';

/**
 * State of a game.
 * Provided as input to Player to make their move.
 */
export default class PlayerGameInput
{
    private hexes: null|(null|PlayerIndex)[][] = null;

    constructor(
        private game: Game,
        private playerIndex: PlayerIndex,
    ) {}

    getSize(): number
    {
        return this.game.getSize();
    }

    getPlayerIndex(): PlayerIndex
    {
        return this.playerIndex;
    }

    getHex(row: number, col: number): null|PlayerIndex
    {
        return this.game.getBoard().getCell(row, col);
    }

    getHexes(): (null|PlayerIndex)[][]
    {
        if (null === this.hexes) {
            this.hexes = this.game.getBoard().getCellsClone();
        }

        return this.hexes;
    }

    getMovesHistory(): Move[]
    {
        return this.game.getMovesHistory().map(move => move.clone());
    }

    getLastMove(): null | Move
    {
        return this.game.getLastMove()?.clone() ?? null;
    }

    /**
     * @throws IllegalMove on invalid move.
     */
    move(move: Move): void
    {
        this.game.move(move, this.playerIndex);

        this.hexes = null;
    }
}
