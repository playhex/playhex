import { BoardEntity, CircleMark, CrossMark, GameView, SelectMark, SquareMark, TextMark, TriangleMark } from '@playhex/pixi-board';
import { Move } from '../../../shared/move-notation/move-notation.js';

export type MarkType = 'cross' | 'triangle' | 'square' | 'circle' | 'select' | 'label';

/**
 * Mark types drawn as a single shape/text mark on a cell, at most one per cell.
 * `select` (highlight) is handled separately, as it can be layered on top of any of these.
 */
export type ShapeMarkType = Exclude<MarkType, 'select'>;

export type MarkPlacement = { move: Move, type: MarkType, text?: string };

const MARKS_GROUP = '_hexplorer_marks';
const SELECTS_GROUP = '_hexplorer_selects';

const createMarkEntity = (type: ShapeMarkType, text?: string): BoardEntity => {
    switch (type) {
        case 'cross': return new CrossMark();
        case 'triangle': return new TriangleMark();
        case 'square': return new SquareMark();
        case 'circle': return new CircleMark();
        case 'label': return new TextMark(text ?? '');
    }
};

/**
 * Manages user-placed analysis marks (cross/triangle/square/circle/label) and the
 * select highlight on the board. At most one shape/text mark per cell, but the select
 * highlight is independent and can be layered on top of any shape mark, or on its own.
 * Marks here are visual-only; they get persisted into the tree as part of a setup node
 * when setup mode is validated (see useHexplorer.ts).
 */
export class BoardMarksLayer
{
    private marks = new Map<Move, { entity: BoardEntity, type: ShapeMarkType, text?: string }>();
    private selects = new Map<Move, BoardEntity>();

    constructor(
        private gameView: GameView,
    ) {}

    getMarkType(move: Move): ShapeMarkType | null
    {
        return this.marks.get(move)?.type ?? null;
    }

    getMarkText(move: Move): string | undefined
    {
        return this.marks.get(move)?.text;
    }

    isSelected(move: Move): boolean
    {
        return this.selects.has(move);
    }

    setMark(move: Move, type: ShapeMarkType | null, text?: string): void
    {
        const existing = this.marks.get(move);

        if (existing) {
            this.gameView.removeEntity(existing.entity);
            this.marks.delete(move);
        }

        if (type === null) {
            return;
        }

        const entity = createMarkEntity(type, text).setCoords(move);

        this.gameView.addEntity(entity, MARKS_GROUP);
        this.marks.set(move, { entity, type, text });
    }

    setSelected(move: Move, selected: boolean): void
    {
        const existing = this.selects.get(move);

        if (existing) {
            this.gameView.removeEntity(existing);
            this.selects.delete(move);
        }

        if (!selected) {
            return;
        }

        const entity = new SelectMark().setCoords(move);

        this.gameView.addEntity(entity, SELECTS_GROUP);
        this.selects.set(move, entity);
    }

    clear(): void
    {
        this.gameView.removeEntitiesGroup(MARKS_GROUP);
        this.gameView.removeEntitiesGroup(SELECTS_GROUP);
        this.marks.clear();
        this.selects.clear();
    }

    getAll(): MarkPlacement[]
    {
        const placements: MarkPlacement[] = [...this.marks.entries()]
            .map(([move, { type, text }]) => ({ move, type, text }));

        for (const move of this.selects.keys()) {
            placements.push({ move, type: 'select' });
        }

        return placements;
    }
}
