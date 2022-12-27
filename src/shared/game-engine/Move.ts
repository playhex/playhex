export default class Move
{
    constructor(
        private row: number,
        private col: number,
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
