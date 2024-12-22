import { Expression, Parser } from 'expr-eval';

export abstract class AbstractShadingPattern
{
    constructor(
        protected size: number,
        protected options?: unknown,
    ) {}

    /**
     * @returns {Number} between 0 (not shaded) and 1 (shaded).
     *                   0.5 means half-shaded, useful for tri color shading patterns.
     */
    abstract calc(row: number, col: number): number;

    /**
     * Distance to nearest side, useful to draw i.e rings.
     */
    protected distToSide(row: number, col: number): number
    {
        return Math.min(row, col, this.size - row - 1, this.size - col - 1);
    }
}

export class NoShadingPattern extends AbstractShadingPattern
{
    calc(): number
    {
        return 0;
    }
}

/**
 * Same as Hexdb theme: http://www.mseymour.ca/hexdb.html
 */
export class TriColorCheckerboard extends AbstractShadingPattern
{
    calc(row: number, col: number): number
    {
        return ((this.size + row - col + 1) % 3) / 2;
    }
}

/**
 * Same as Hexworld theme: https://hexworld.org/board/
 */
export class ConcentricalRings extends AbstractShadingPattern
{
    calc(row: number, col: number): number
    {
        return this.distToSide(row, col) % 2;
    }
}

export class Height5Lines extends AbstractShadingPattern
{
    calc(row: number, col: number): number
    {
        if (this.size < 9) {
            return 0;
        }

        const oppositeRow = this.size - row - 1;
        const oppositeCol = this.size - col - 1;

        if (4 === row || 4 === col || 4 === oppositeRow || 4 === oppositeCol) {
            return 1;
        }

        return 0;
    }
}

export class SingleRing extends AbstractShadingPattern
{
    calc(row: number, col: number): number
    {
        const height = Math.floor((this.size - 2) / 3);

        return this.distToSide(row, col) === height ? 1 : 0;
    }
}

/**
 * Allow players create their own pattern by entering a math expression
 * like: "((size + row - col) % 3) / 2"
 */
export class CustomShadingPattern extends AbstractShadingPattern
{
    private expr: null | Expression = null;

    private warnCooldown: null | ReturnType<typeof setTimeout> = null;

    constructor(
        protected override size: number,
        protected override options?: unknown,
    ) {
        super(size, options);

        if ('string' !== typeof this.options) {
            return;
        }

        try {
            const parser = new Parser();

            this.expr = parser.parse(this.options);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`Expression syntax error: "${e.message}"`);
        }
    }

    calc(row: number, col: number): number
    {
        if (null === this.expr) {
            return 0;
        }

        const distToSide = this.distToSide(row, col);
        const { size } = this;

        try {
            const result = this.expr.evaluate({
                row,
                col,
                size,
                distToSide,

                // Shortcuts
                r: row,
                c: col,
                s: size,
            });

            // Do not forget case when result is "NaN"
            if (result >= 0 && result <= 1) {
                return result;
            }

            if (result > 1) {
                return 1;
            }

            return 0;
        } catch (e) {
            this.warnThrottled(`Expression runtime error: "${e.message}" for row = ${row} and col = ${col}`);
            return 0;
        }
    }

    /**
     * Prevents showing bunch of warnings when calling calc() for each cell of the hex board
     */
    private warnThrottled(...args: unknown[]): void
    {
        if (null !== this.warnCooldown) {
            return;
        }

        this.warnCooldown = setTimeout(() => this.warnCooldown = null, 500);

        // eslint-disable-next-line no-console
        console.warn(...args);
    }
}

export const allShadingPatterns = [
    null,
    'tricolor_checkerboard',
    'concentrical_rings',
    'height_5_lines',
    'single_ring',
    'custom',
] as const;

export type ShadingPatternType = typeof allShadingPatterns[number];

export const createShadingPattern = (name: ShadingPatternType, size: number, option?: unknown): AbstractShadingPattern => {
    if (!allShadingPatterns.includes(name)) {
        return new NoShadingPattern(size, option);
    }

    switch (name) {
        case 'tricolor_checkerboard': return new TriColorCheckerboard(size, option);
        case 'concentrical_rings': return new ConcentricalRings(size, option);
        case 'height_5_lines': return new Height5Lines(size, option);
        case 'single_ring': return new SingleRing(size, option);
        case 'custom': return new CustomShadingPattern(size, option);
        case null: return new NoShadingPattern(size, option);
    }
};
