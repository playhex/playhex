import { coordsToMove, parseMove, type Coords, type Move } from '@playhex/move-notation';
import { findHexTemplate, getTemplateVariants, type TemplateVariant } from './hex-templates.js';

export type TemplatePosition = {
    boardsize: number;

    /**
     * Stones of the player whose templates are searched.
     */
    own: Move[];

    opponent: Move[];

    /**
     * Cells nobody can play, cannot be in a carrier.
     */
    disabledCells?: Move[];

    /**
     * 0: red, connects top to bottom. 1: blue, connects left to right.
     */
    color: 0 | 1;

    /**
     * Templates to search, see HEX_TEMPLATES. Unknown ids are ignored.
     */
    templateIds: string[];

    /**
     * Own stones known to be connected to an edge, e.g through cells outside a partial board.
     * Edge index as in getEdgeFrame().
     */
    edgeConnections?: { move: Move, edge: 0 | 1 }[];
};

export type TemplateInstance = {
    templateId: string;

    /**
     * Own stones connected by this instance: two, or one for an edge template.
     */
    stones: Move[];

    /**
     * Index of the edge connected by an edge template, see getEdgeFrame().
     */
    edge?: 0 | 1;

    carrier: Move[];
};

/**
 * Maps board coords to a frame where `edge` of `color` is above row 0, and back:
 * each frame is a board symmetry and its own inverse.
 *
 * Edges: red 0 top, 1 bottom; blue 0 left, 1 right.
 */
export const getEdgeFrame = (boardsize: number, color: 0 | 1, edge: 0 | 1) => ({ row, col }: Coords): Coords => {
    const z = boardsize - 1;
    const frame = color === 0 ? { row, col } : { row: col, col: row };

    return edge === 0 ? frame : { row: z - frame.row, col: z - frame.col };
};

const getVariants = (templateIds: string[]): TemplateVariant[] => templateIds.flatMap(id => {
    const template = findHexTemplate(id);

    return template === null ? [] : getTemplateVariants(template);
});

/**
 * All instances of these templates for player `color`: own stones in place, carrier cells empty.
 * Carriers of instances can overlap.
 */
export const findTemplateInstances = ({ boardsize, own, opponent, disabledCells = [], color, templateIds }: TemplatePosition): TemplateInstance[] => {
    const ownSet = new Set<Move>(own);
    const unavailable = new Set<Move>([...own, ...opponent, ...disabledCells]);
    const inBoard = ({ row, col }: Coords): boolean => row >= 0 && col >= 0 && row < boardsize && col < boardsize;
    const isEmpty = (coords: Coords): boolean => inBoard(coords) && !unavailable.has(coordsToMove(coords));
    const add = (origin: Coords) => ({ row, col }: Coords): Coords => ({ row: origin.row + row, col: origin.col + col });

    const instances = new Map<string, TemplateInstance>();

    const keep = (instance: TemplateInstance): void => {
        const key = [instance.templateId, instance.edge ?? '', [...instance.stones].sort().join(','), [...instance.carrier].sort().join(',')].join('|');

        if (!instances.has(key)) {
            instances.set(key, instance);
        }
    };

    for (const variant of getVariants(templateIds)) {
        for (const stone of own) {
            const stoneCoords = parseMove(stone);

            if (variant.kind === 'stones') {
                const toBoard = add(stoneCoords);
                const stones = variant.stones.map(toBoard);
                const carrier = variant.carrier.map(toBoard);

                if (stones.every(coords => inBoard(coords) && ownSet.has(coordsToMove(coords))) && carrier.every(isEmpty)) {
                    keep({ templateId: variant.templateId, stones: stones.map(coordsToMove), carrier: carrier.map(coordsToMove) });
                }

                continue;
            }

            for (const edge of [0, 1] as const) {
                const frame = getEdgeFrame(boardsize, color, edge);
                const stoneInFrame = frame(stoneCoords);

                if (stoneInFrame.row !== variant.stoneRow) {
                    continue;
                }

                const carrier = variant.carrier.map(add(stoneInFrame)).map(frame);

                if (carrier.every(isEmpty)) {
                    keep({ templateId: variant.templateId, stones: [stone], edge, carrier: carrier.map(coordsToMove) });
                }
            }
        }
    }

    return [...instances.values()];
};

/**
 * Searches a connection of player `color` between its two edges,
 * made of own stones groups linked by templates with pairwise disjoint carriers:
 * connection holds even if opponent plays first.
 * Without templates, only a completed connection is found.
 *
 * Sound but not complete: some proven connections need more than a chain of known templates.
 *
 * @returns Templates used by the connection, empty if stones already connect, or null if no connection found.
 */
export const findTemplateConnection = (position: TemplatePosition): null | TemplateInstance[] => {
    const { boardsize, own, color } = position;

    // Groups of adjacent own stones, by union-find
    const parent = new Map<Move, Move>(own.map(move => [move, move]));
    const find = (move: Move): Move => {
        const p = parent.get(move)!;

        if (p === move) {
            return move;
        }

        const root = find(p);
        parent.set(move, root);

        return root;
    };

    const neighbours = ({ row, col }: Coords): Coords[] => [
        { row, col: col - 1 }, { row, col: col + 1 },
        { row: row - 1, col }, { row: row - 1, col: col + 1 },
        { row: row + 1, col }, { row: row + 1, col: col - 1 },
    ];

    for (const move of own) {
        for (const neighbour of neighbours(parseMove(move))) {
            const neighbourMove = coordsToMove(neighbour);

            if (parent.has(neighbourMove)) {
                parent.set(find(neighbourMove), find(move));
            }
        }
    }

    type Link = { to: string, instance: null | TemplateInstance };

    const START = 'edge:0';
    const END = 'edge:1';
    const links = new Map<string, Link[]>();

    const link = (a: string, b: string, instance: null | TemplateInstance): void => {
        if (a === b) {
            return;
        }

        links.set(a, [...links.get(a) ?? [], { to: b, instance }]);
        links.set(b, [...links.get(b) ?? [], { to: a, instance }]);
    };

    for (const edge of [0, 1] as const) {
        const frame = getEdgeFrame(boardsize, color, edge);

        for (const move of own) {
            if (frame(parseMove(move)).row === 0) {
                link(`edge:${edge}`, find(move), null);
            }
        }
    }

    for (const { move, edge } of position.edgeConnections ?? []) {
        if (parent.has(move)) {
            link(`edge:${edge}`, find(move), null);
        }
    }

    for (const instance of findTemplateInstances(position)) {
        const groups = instance.stones.map(find);

        if (instance.edge !== undefined) {
            link(`edge:${instance.edge}`, groups[0], instance);
        } else {
            link(groups[0], groups[1], instance);
        }
    }

    const visited = new Set<string>([START]);
    const usedCells = new Set<Move>();
    const path: TemplateInstance[] = [];

    const search = (node: string): boolean => {
        if (node === END) {
            return true;
        }

        for (const { to, instance } of links.get(node) ?? []) {
            if (visited.has(to) || instance?.carrier.some(cell => usedCells.has(cell))) {
                continue;
            }

            visited.add(to);
            instance?.carrier.forEach(cell => usedCells.add(cell));

            if (instance !== null) {
                path.push(instance);
            }

            if (search(to)) {
                return true;
            }

            if (instance !== null) {
                path.pop();
            }

            instance?.carrier.forEach(cell => usedCells.delete(cell));
            visited.delete(to);
        }

        return false;
    };

    return search(START) ? path : null;
};
