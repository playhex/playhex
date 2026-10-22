import assert from 'assert';
import { describe, it } from 'mocha';
import { getTemplateVariants, HEX_TEMPLATES, type HexTemplateShape, type TemplateCell } from '../hex-templates.js';

const key = ({ row, col }: TemplateCell): string => `${row},${col}`;

const areAdjacent = (a: TemplateCell, b: TemplateCell): boolean => {
    const dr = b.row - a.row;
    const dc = b.col - a.col;

    return (dr === 0 && Math.abs(dc) === 1)
        || (dr === -1 && (dc === 0 || dc === 1))
        || (dr === 1 && (dc === 0 || dc === -1))
    ;
};

/**
 * Whether stones of the shape connect (to each other, or to edge) with these own cells.
 */
const isConnected = (shape: HexTemplateShape, own: TemplateCell[]): boolean => {
    const cells = [...shape.stones, ...own];
    const reached = new Set<string>([key(shape.stones[0])]);
    const frontier = [shape.stones[0]];

    while (frontier.length > 0) {
        const current = frontier.pop()!;

        if (shape.kind === 'edge' && current.row === 0) {
            return true;
        }

        for (const cell of cells) {
            if (!reached.has(key(cell)) && areAdjacent(current, cell)) {
                reached.add(key(cell));
                frontier.push(cell);
            }
        }
    }

    return shape.kind === 'stones' && reached.has(key(shape.stones[1]));
};

/**
 * Whether player connects on the carrier, opponent playing first, by trying all moves.
 */
const holdsAgainstIntrusion = (shape: HexTemplateShape, carrier: TemplateCell[]): boolean => {
    const opponentTurn = (free: TemplateCell[], own: TemplateCell[]): boolean =>
        free.every((intrusion, index) => playerTurn(free.filter((_, i) => i !== index), own));

    const playerTurn = (free: TemplateCell[], own: TemplateCell[]): boolean =>
        isConnected(shape, [...own, ...free]) && (
            isConnected(shape, own)
            || free.some((move, index) => opponentTurn(free.filter((_, i) => i !== index), [...own, move]))
        );

    return opponentTurn(carrier, []);
};

describe('hex-templates', () => {
    for (const template of HEX_TEMPLATES) {
        for (const [index, shape] of template.shapes.entries()) {
            it(`${template.id} shape ${index} holds against any intrusion`, () => {
                assert.ok(holdsAgainstIntrusion(shape, shape.carrier));
            });

            it(`${template.id} shape ${index} carrier is minimal`, () => {
                for (const removed of shape.carrier) {
                    assert.ok(
                        !holdsAgainstIntrusion(shape, shape.carrier.filter(cell => cell !== removed)),
                        `still holds without ${key(removed)}`,
                    );
                }
            });
        }
    }

    it('generates all orientations', () => {
        const bridge = getTemplateVariants(HEX_TEMPLATES.find(t => t.id === 'bridge')!);

        // 6 directions for stones shape, edge bridge is symmetric
        assert.strictEqual(bridge.filter(v => v.kind === 'stones').length, 6);
        assert.strictEqual(bridge.filter(v => v.kind === 'edge').length, 1);

        const ziggurat = getTemplateVariants(HEX_TEMPLATES.find(t => t.id === 'ziggurat')!);

        assert.strictEqual(ziggurat.length, 2);
    });
});
