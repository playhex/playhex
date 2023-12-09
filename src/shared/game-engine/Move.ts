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

    toString(): string
    {
        return String.fromCharCode('a'.charCodeAt(0) + this.col) + (this.row + 1);
    }

    clone(): Move
    {
        return new Move(this.row, this.col);
    }
}
