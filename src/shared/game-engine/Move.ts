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
        return String.fromCharCode(65 + this.row) + (this.col + 1);
    }
}
