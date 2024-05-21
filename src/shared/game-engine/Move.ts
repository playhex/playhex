import { Coords } from './Types';
import { MoveData } from './normalization';

export default class Move implements Coords
{
    constructor(
        public row: number,
        public col: number,
        private playedAt: Date = new Date(),
    ) {}

    getPlayedAt(): Date
    {
        return this.playedAt;
    }

    static rowToNumber(row: number): string
    {
        return String(row + 1);
    }

    static colToLetter(col: number): string
    {
        /** letter(4) => "e" */
        const letter = (n: number): string => String.fromCharCode(97 + n);

        return col < 26
            ? letter(col)
            : letter(Math.floor(col / 26) - 1) + letter(col % 26)
        ;
    }

    /**
     * @throws Error if move is not like "f6", or like "swap-pieces"
     */
    static fromString(moveString: string): Move
    {
        const match = moveString.match(/^"?([a-z]{1,2})(\d{1,2})"?$/);

        if (null === match) {
            throw new Error(`Invalid move coords: "${moveString}", expected a move like "c2"`);
        }

        const [, letter, number] = match;
        const letterCol = 1 === letter.length
            ? letter.charCodeAt(0) - 97
            : letter.charCodeAt(1) - 97 + 26 * (letter.charCodeAt(0) - 97 + 1)
        ;

        return new Move(
            parseInt(number, 10) - 1, // "1" is 0
            letterCol, // "a" is 0
        );
    }

    toString(): string
    {
        return Move.colToLetter(this.col) + Move.rowToNumber(this.row);
    }

    hasSameCoordsAs(move: Move): boolean
    {
        return this.row === move.row && this.col === move.col;
    }

    clone(): Move
    {
        return new Move(this.row, this.col);
    }

    cloneMirror(): Move
    {
        return new Move(this.col, this.row);
    }

    toData(): MoveData
    {
        return {
            row: this.row,
            col: this.col,
            playedAt: this.playedAt,
        };
    }

    static fromData(moveData: MoveData): Move
    {
        return new Move(
            moveData.row,
            moveData.col,
            moveData.playedAt,
        );
    }

    /**
     * Returns moves like "a1 swap-pieces b4 c5 ..."
     */
    static movesAsString(moves: Move[]): string
    {
        const moveStrings = moves.map(move => move.toString());

        if (moveStrings.length >= 2 && moveStrings[0] === moveStrings[1]) {
            moveStrings[1] = 'swap-pieces';
        }

        return moveStrings.join(' ');
    }
}
