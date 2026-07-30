export type Coords = {
    /**
     * Row is number (minus 1)
     */
    row: number;

    /**
     * Col is letter (minus 1)
     */
    col: number;
};

/**
 * 'a2', 'd4'
 */
export type Move = `${Lowercase<string>}${number}` | `${Lowercase<string>}${Lowercase<string>}${number}`;

/**
 * Whether move is a normal move like "d4", "e12", ...
 */
export const validateMove = (move: string): move is Move => {
    return move.match(/^"?([a-z]{1,2})(\d{1,2})"?$/) !== null;
};

/**
 * Parse a move like "a2" to { row: 0, col: 1 }
 *
 * Ex: `const { row, col } = moveToCoords(move);`
 *
 * @throws {Error} If providing a special move, or invalid normal move
 */
export const parseMove = (move: Move): Coords => {
    const match = move.match(/^"?([a-z]{1,2})(\d{1,2})"?$/);

    if (match === null) {
        throw new Error(`Invalid move coords: "${move}", expected a move like "c2"`);
    }

    const [, letter, number] = match;
    const letterCol = letter.length === 1
        ? letter.charCodeAt(0) - 97
        : letter.charCodeAt(1) - 97 + 26 * (letter.charCodeAt(0) - 97 + 1)
    ;

    return {
        row: parseInt(number, 10) - 1, // "1" is 0
        col: letterCol, // "a" is 0
    };
};

export const areCoordsSame = (a: Coords, b: Coords): boolean => {
    return a.row === b.row && a.col === b.col;
};

export const cloneCoords = (coords: Coords): Coords => ({
    row: coords.row,
    col: coords.col,
});

export const mirrorCoords = (coords: Coords): Coords => ({
    row: coords.col,
    col: coords.row,
});

const memoizedMirror: { [move: Move]: Move } = {};

/**
 * Mirror a move (for swap), "a2" => "b1"
 *
 * through the long diagonal
 */
export const mirrorMove = (move: Move): Move => {
    if (!memoizedMirror[move]) {
        memoizedMirror[move] = coordsToMove(mirrorCoords(parseMove(move)));
    }

    return memoizedMirror[move];
};

const memoizedMirrorShort: { [boardsize: number]: { [move: Move]: Move } } = {};

export const mirrorShortDiagonal = (move: Move, boardsize: number): Move => {
    if (!memoizedMirrorShort[boardsize]) {
        memoizedMirrorShort[boardsize] = {};
    }

    if (!memoizedMirrorShort[boardsize][move]) {
        const { row, col } = parseMove(move);

        return coordsToMove({
            row: boardsize - col - 1,
            col: boardsize - row - 1,
        });
    }

    return memoizedMirrorShort[boardsize][move];
};

const memoizedMirrorCenter: { [boardsize: number]: { [move: Move]: Move } } = {};

export const mirrorCenter = (move: Move, boardsize: number): Move => {
    if (!memoizedMirrorCenter[boardsize]) {
        memoizedMirrorCenter[boardsize] = {};
    }

    if (!memoizedMirrorCenter[boardsize][move]) {
        const { row, col } = parseMove(move);

        return coordsToMove({
            row: boardsize - row - 1,
            col: boardsize - col - 1,
        });
    }

    return memoizedMirrorCenter[boardsize][move];
};

/**
 * Transform coords { row: 0, col: 1 } to "b1"
 */
export const coordsToMove = (coords: Coords): Move => {
    return colToLetter(coords.col) + rowToNumber(coords.row) as Move;
};


export const rowToNumber = (row: number): string => {
    return String(row + 1);
};

export const colToLetter = (col: number): string => {
    /** letter(4) => "e" */
    const letter = (n: number): string => String.fromCharCode(97 + n);

    return col < 26
        ? letter(col)
        : letter(Math.floor(col / 26) - 1) + letter(col % 26)
    ;
};
