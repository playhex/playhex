import { Game, Move, PlayerIndex } from '.';

/**
 * State of a game.
 * Provided as input to Player to make their move.
 */
export default class PlayerGameInput
{
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

    getHex(row: number, col: number): null | PlayerIndex
    {
        return this.game.getBoard().getCell(row, col);
    }

    getHexes(): (null | PlayerIndex)[][]
    {
        return this.game.getBoard().getCellsClone();
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
    }

    resign(): void
    {
        this.game.resign(this.playerIndex);
    }
}
