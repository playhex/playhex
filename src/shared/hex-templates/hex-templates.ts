/**
 * Hex templates: patterns where a player stone is connected, to another stone or to its edge,
 * even if opponent plays first, as long as the carrier cells are empty.
 *
 * Coordinates follow Board neighbours: (row, col) is adjacent to
 * (row, col ± 1), (row - 1, col), (row - 1, col + 1), (row + 1, col), (row + 1, col - 1).
 */

export type TemplateCell = {
    row: number;
    col: number;
};

export type HexTemplateShape = {
    /**
     * stones: connects two own stones, anywhere on board.
     * edge: connects one own stone to its edge.
     *       Rows are counted from the edge: row 0 is the line next to the edge.
     */
    kind: 'stones' | 'edge';

    /**
     * Own stones of the template: two for "stones", one for "edge".
     */
    stones: TemplateCell[];

    /**
     * Cells that must be empty.
     */
    carrier: TemplateCell[];
};

export type HexTemplate = {
    id: string;
    name: string;

    /**
     * Shapes of this template, in one orientation: rotations and mirrors are generated.
     */
    shapes: HexTemplateShape[];
};

export const HEX_TEMPLATES: HexTemplate[] = [
    {
        id: 'bridge',
        name: 'Bridge',
        shapes: [
            {
                kind: 'stones',
                stones: [{ row: 0, col: 0 }, { row: 1, col: 1 }],
                carrier: [{ row: 0, col: 1 }, { row: 1, col: 0 }],
            },
            {
                // Template II, bridge to edge
                kind: 'edge',
                stones: [{ row: 1, col: 0 }],
                carrier: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
            },
        ],
    },
    {
        id: 'ziggurat',
        name: 'Ziggurat',
        shapes: [
            {
                // Template IIIa
                kind: 'edge',
                stones: [{ row: 2, col: 0 }],
                carrier: [
                    { row: 2, col: 1 },
                    { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
                    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
                ],
            },
        ],
    },
];

export const findHexTemplate = (id: string): null | HexTemplate =>
    HEX_TEMPLATES.find(template => template.id === id) ?? null;

/**
 * A shape in one orientation, cells relative to its first stone.
 * For edge shapes, `row` of relative cells is still a row offset, and `stoneRow` is the first stone distance to edge.
 */
export type TemplateVariant = {
    templateId: string;
    kind: HexTemplateShape['kind'];
    stoneRow: number;
    stones: TemplateCell[];
    carrier: TemplateCell[];
};

type Transform = (cell: TemplateCell) => TemplateCell;

/**
 * Rotation by 60°, in axial coordinates (col, row).
 */
const rotate: Transform = ({ row, col }) => ({ row: col + row, col: -row });

/**
 * Mirror keeping rows, so an edge shape stays at same distance from edge.
 */
const mirror: Transform = ({ row, col }) => ({ row, col: -col - row });

const relativeTo = (origin: TemplateCell): Transform => ({ row, col }) => ({ row: row - origin.row, col: col - origin.col });

const variantKey = ({ stones, carrier }: Pick<TemplateVariant, 'stones' | 'carrier'>): string =>
    [stones, carrier]
        .map(cells => cells.map(({ row, col }) => `${row},${col}`).sort().join(' '))
        .join('|')
;

/**
 * All orientations of template shapes, cells relative to first stone.
 * Stones shapes: 6 rotations and their mirrors. Edge shapes: shape and its mirror,
 * placing them on an actual edge is done by caller.
 */
export const getTemplateVariants = (template: HexTemplate): TemplateVariant[] => {
    const variants = new Map<string, TemplateVariant>();

    for (const shape of template.shapes) {
        const toRelative = relativeTo(shape.stones[0]);
        const base: TemplateVariant = {
            templateId: template.id,
            kind: shape.kind,
            stoneRow: shape.stones[0].row,
            stones: shape.stones.map(toRelative),
            carrier: shape.carrier.map(toRelative),
        };

        const rotations: Transform[] = [cell => cell];

        if (shape.kind === 'stones') {
            for (let i = 1; i < 6; ++i) {
                const previous = rotations[i - 1];
                rotations.push(cell => rotate(previous(cell)));
            }
        }

        const transforms: Transform[] = [...rotations, ...rotations.map(rotation => (cell: TemplateCell) => mirror(rotation(cell)))];

        for (const transform of transforms) {
            const variant = {
                ...base,
                stones: base.stones.map(transform),
                carrier: base.carrier.map(transform),
            };

            const key = variantKey(variant);

            if (!variants.has(key)) {
                variants.set(key, variant);
            }
        }
    }

    return [...variants.values()];
};
