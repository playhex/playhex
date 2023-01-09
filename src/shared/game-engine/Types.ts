export type PlayerIndex = 0 | 1;

export type Coords = {
    row: number,
    col: number,
};

export type PathItem = {
    parent: null | PathItem,
    cell: Coords,
};
