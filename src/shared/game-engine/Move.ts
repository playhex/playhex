import { Coords } from './Types';

export default class Move implements Coords
{
    constructor(
        public row: number,
        public col: number,
    ) {}

    getRow(): number
    {
        return this.row;
    }

    getCol(): number
    {
        return this.col;
    }

    toString(): string
    {
        return String.fromCharCode('a'.charCodeAt(0) + this.row) + (this.col + 1);
    }

    clone(): Move
    {
        return new Move(this.row, this.col);
    }
}
