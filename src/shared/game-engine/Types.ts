export type PlayerIndex = 0 | 1;

/**
 * Row is number
 * Col is letter
 */
export type Coords = {
    row: number;
    col: number;
};

export type PathItem = {
    parent: null | PathItem;
    cell: Coords;
};
