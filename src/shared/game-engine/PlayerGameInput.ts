import { Game, IllegalMove, Move, PlayerIndex } from '.';

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

    getAllowSwap(): boolean
    {
        return this.game.getAllowSwap();
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

    getMovesHistoryLength(): number
    {
        return this.game.getMovesHistory().length;
    }

    getFirstMove(): null | Move
    {
        return this.game.getFirstMove()?.clone() ?? null;
    }

    getSecondMove(): null | Move
    {
        return this.game.getSecondMove()?.clone() ?? null;
    }

    getLastMove(): null | Move
    {
        return this.game.getLastMove()?.clone() ?? null;
    }

    hasSwapMove(): boolean
    {
        return this.game.hasSwapMove();
    }

    checkMove(move: Move): true | string
    {
        try {
            this.game.checkMove(move, this.playerIndex);
            return true;
        } catch (e) {
            if (e instanceof IllegalMove) {
                return e.message;
            }

            throw e;
        }
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
