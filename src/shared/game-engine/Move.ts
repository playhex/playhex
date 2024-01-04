import { Coords } from './Types';

export default class Move implements Coords
{
    constructor(
        public row: number,
        public col: number,
        private playedAt: Date = new Date(),
    ) {}

    getRow(): number
    {
        return this.row;
    }

    getCol(): number
    {
        return this.col;
    }

    getPlayedAt(): Date
    {
        return this.playedAt;
    }

    /**
     * @throws Error if move is not like "f6", or like "swap-pieces"
     */
    static fromString(moveString: string): Move
    {
        const match = moveString.match(/^"?([a-z])(\d+)"?$/);

        if (null === match) {
            throw new Error(`Invalid move coords: "${moveString}", expected a move like "c2"`);
        }

        const [, letter, number] = match;

        return new Move(
            parseInt(number, 10) - 1, // "1" is 0
            letter.charCodeAt(0) - 97, // "a" is 0
        );
    }

    toString(): string
    {
        return String.fromCharCode('a'.charCodeAt(0) + this.col) + (this.row + 1);
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
}
