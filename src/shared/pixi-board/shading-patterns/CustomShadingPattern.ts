import { Expression, Parser } from 'expr-eval';
import { ShadingPatternInterface } from './ShadingPatternInterface.js';
import { distToSide } from './utils.js';

/**
 * Allow players create their own pattern by entering a math expression
 * like: "((size + row - col) % 3) / 2"
 */
export class CustomShadingPattern implements ShadingPatternInterface
{
    private expr: null | Expression = null;

    private warnCooldown: null | ReturnType<typeof setTimeout> = null;

    constructor(
        expression: string,
    ) {
        try {
            const parser = new Parser();

            this.expr = parser.parse(expression);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`Expression syntax error: "${e.message}"`);
        }
    }

    calc(row: number, col: number, size: number): number
    {
        if (this.expr === null) {
            return 0;
        }

        try {
            const result = this.expr.evaluate({
                row,
                col,
                size,
                distToSide: distToSide(row, col, size),

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
        if (this.warnCooldown !== null) {
            return;
        }

        this.warnCooldown = setTimeout(() => this.warnCooldown = null, 500);

        // eslint-disable-next-line no-console
        console.warn(...args);
    }
}
