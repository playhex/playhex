import { Coords } from './Types';
import { MoveData } from './normalization';

export type SpecialMoveType = 'swap-pieces' | 'pass';

export default class Move implements Coords
{
    /**
     * undefined for a normal move, like "a1", "d5", ...
     * or a type like "swap-pieces", "pass"
     */
    private specialMoveType?: SpecialMoveType;

    constructor(
        public row: number,
        public col: number,
        private playedAt: Date = new Date(),
    ) {}

    static special(specialMoveType: SpecialMoveType, playedAt: Date = new Date()): Move
    {
        const move = new Move(-1, -1, playedAt);

        move.specialMoveType = specialMoveType;

        return move;
    }

    static swapPieces(playedAt: Date = new Date()): Move
    {
        return Move.special('swap-pieces', playedAt);
    }

    static pass(playedAt: Date = new Date()): Move
    {
        return Move.special('pass', playedAt);
    }

    getSpecialMoveType(): undefined | SpecialMoveType
    {
        return this.specialMoveType;
    }

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
    static fromString(moveString: string | SpecialMoveType): Move
    {
        if ('swap-pieces' === moveString) {
            return Move.swapPieces();
        }

        if ('pass' === moveString) {
            return Move.pass();
        }

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

    toString(): string | SpecialMoveType
    {
        if (this.specialMoveType) {
            return this.specialMoveType;
        }

        return Move.colToLetter(this.col) + Move.rowToNumber(this.row);
    }

    sameAs(move: Move): boolean
    {
        if (this.specialMoveType !== move.specialMoveType) {
            return false;
        }

        if (undefined !== this.specialMoveType) {
            return this.specialMoveType === move.specialMoveType;
        }

        return this.row === move.row && this.col === move.col;
    }

    clone(): Move
    {
        if ('swap-pieces' === this.specialMoveType) {
            return Move.swapPieces(this.playedAt);
        }

        if ('pass' === this.specialMoveType) {
            return Move.pass(this.playedAt);
        }

        return new Move(this.row, this.col, this.playedAt);
    }

    cloneMirror(): Move
    {
        if ('swap-pieces' === this.specialMoveType) {
            return Move.swapPieces(this.playedAt);
        }

        if ('pass' === this.specialMoveType) {
            return Move.pass(this.playedAt);
        }

        return new Move(this.col, this.row, this.playedAt);
    }

    toData(): MoveData
    {
        return {
            row: this.row,
            col: this.col,
            specialMoveType: this.specialMoveType,
            playedAt: this.playedAt,
        };
    }

    static fromData(moveData: MoveData): Move
    {
        if (moveData.specialMoveType) {
            return Move.special(moveData.specialMoveType);
        }

        return new Move(
            moveData.row,
            moveData.col,
            moveData.playedAt,
        );
    }

    /**
     * Returns moves like "a1 swap-pieces b4 c5 pass c6 ..."
     */
    static movesAsString(moves: Move[]): string
    {
        return moves
            .map(move => move.toString())
            .join(' ')
        ;
    }
}
