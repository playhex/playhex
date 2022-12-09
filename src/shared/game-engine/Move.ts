export default class Move
{
    public constructor(
        private row: number,
        private col: number,
    ) {}

    public getRow(): number
    {
        return this.row;
    }

    public getCol(): number
    {
        return this.col;
    }

    public toString(): string
    {
        return String.fromCharCode(65 + this.row) + (this.col + 1);
    }
}
