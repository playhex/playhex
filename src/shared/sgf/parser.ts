import { SGF } from './types.js';

type RawSGFNode = Record<string, string>;
type RawSGFTree = { nodes: RawSGFNode[], children: RawSGFTree[] };

/**
 * Properties whose value is always a plain number.
 */
const numericProperties = new Set(['FF', 'GM', 'TM', 'LC', 'LT', 'BL', 'WL', 'OB', 'OW']);

/**
 * Properties whose value can be either a number or a composed/string value (e.g `SZ[19:13]`).
 */
const numericOrStringProperties = new Set(['SZ', 'HA']);

class SGFParser
{
    private i = 0;

    constructor(private readonly input: string)
    {}

    parse(): RawSGFTree
    {
        return this.parseGameTree();
    }

    private skipWhitespace(): void
    {
        while (this.i < this.input.length && /\s/.test(this.input[this.i])) {
            this.i++;
        }
    }

    private parseGameTree(): RawSGFTree
    {
        this.skipWhitespace();

        if (this.input[this.i] !== '(') {
            throw new Error(`Invalid SGF: expected "(" at position ${this.i}`);
        }

        this.i++;

        const nodes = this.parseSequence();
        const children: RawSGFTree[] = [];

        this.skipWhitespace();

        while (this.input[this.i] === '(') {
            children.push(this.parseGameTree());
            this.skipWhitespace();
        }

        if (this.input[this.i] !== ')') {
            throw new Error(`Invalid SGF: expected ")" at position ${this.i}`);
        }

        this.i++;

        return { nodes, children };
    }

    private parseSequence(): RawSGFNode[]
    {
        const nodes: RawSGFNode[] = [];

        this.skipWhitespace();

        while (this.input[this.i] === ';') {
            nodes.push(this.parseNode());
            this.skipWhitespace();
        }

        return nodes;
    }

    private parseNode(): RawSGFNode
    {
        this.i++; // Skip ';'

        const props: RawSGFNode = {};

        this.skipWhitespace();

        while (/[A-Za-z]/.test(this.input[this.i] ?? '')) {
            const ident = this.parsePropIdent();
            const values = this.parsePropValues();

            props[ident] = values[0] ?? '';

            this.skipWhitespace();
        }

        return props;
    }

    private parsePropIdent(): string
    {
        let ident = '';

        while (/[A-Za-z]/.test(this.input[this.i] ?? '')) {
            ident += this.input[this.i];
            this.i++;
        }

        return ident;
    }

    private parsePropValues(): string[]
    {
        const values: string[] = [];

        this.skipWhitespace();

        while (this.input[this.i] === '[') {
            values.push(this.parsePropValue());
            this.skipWhitespace();
        }

        return values;
    }

    private parsePropValue(): string
    {
        this.i++; // Skip '['

        let value = '';

        while (this.i < this.input.length && this.input[this.i] !== ']') {
            if (this.input[this.i] === '\\') {
                this.i++;

                if (this.i < this.input.length) {
                    value += this.input[this.i];
                    this.i++;
                }
            } else {
                value += this.input[this.i];
                this.i++;
            }
        }

        this.i++; // Skip ']'

        return value;
    }
}

/**
 * Cast raw string property values to their expected type (number, or number|string).
 */
const castNodeProperties = (raw: RawSGFNode): Record<string, unknown> => {
    const node: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(raw)) {
        if (numericProperties.has(key)) {
            node[key] = Number(value);
        } else if (numericOrStringProperties.has(key) && /^\d+$/.test(value)) {
            node[key] = Number(value);
        } else {
            node[key] = value;
        }
    }

    return node;
};

/**
 * Flattens a raw SGF tree into a single main line of nodes,
 * attaching variations to the node from which they branch off.
 */
const flattenSGFTree = (tree: RawSGFTree): Record<string, unknown>[] => {
    const nodes = tree.nodes.map(castNodeProperties);

    if (tree.children.length === 0) {
        return nodes;
    }

    const mainContinuation = flattenSGFTree(tree.children[0]);

    if (tree.children.length > 1 && mainContinuation.length > 0) {
        mainContinuation[0].variations = tree.children.slice(1).map(flattenSGFTree);
    }

    return nodes.concat(mainContinuation);
};

export const sgfFromString = (string: string): SGF => {
    const tree = new SGFParser(string).parse();
    const [root, ...moves] = flattenSGFTree(tree);
    const sgf: SGF = { ...root };

    if (moves.length > 0) {
        sgf.moves = moves;
    }

    return sgf;
};
