import assert from 'assert';
import '../mockDom.js';
import { resolveTheme } from '../../theming/resolveTheme.js';
import { playhexTheme } from '../../themes/playhex/index.js';
import { hexBoard } from '../../theming/renderers/hexBoard.js';
import { hexStone } from '../../theming/renderers/hexStone.js';
import { circleStone } from '../../theming/renderers/circleStone.js';
import type { ThemeDefinition } from '../../theming/types.js';

const board = hexBoard({ cellColor: 0x888888, strokeColor: 0x000000, shadingColor: 0x444444 });
const stone = hexStone();

const baseDefinition: ThemeDefinition = {
    metadata: { id: 'test', name: 'Test' },
    theme: {
        colors: { player1: 0x000000, player2: 0xffffff, text: 0x111111 },
        board,
        stone,
    },
};

describe('resolveTheme', () => {
    it('returns same theme in light and dark mode when no override', () => {
        assert.strictEqual(resolveTheme(baseDefinition, 'light'), baseDefinition.theme);
        assert.strictEqual(resolveTheme(baseDefinition, 'dark'), baseDefinition.theme);
    });

    it('overrides only one mode, and merges partial colors', () => {
        const circle = circleStone();
        const definition: ThemeDefinition = {
            ...baseDefinition,
            dark: {
                colors: { text: 0xeeeeee },
                stone: circle,
            },
        };

        assert.strictEqual(resolveTheme(definition, 'light'), baseDefinition.theme);

        const dark = resolveTheme(definition, 'dark');

        assert.deepStrictEqual(dark.colors, { player1: 0x000000, player2: 0xffffff, text: 0xeeeeee });
        assert.strictEqual(dark.stone, circle);
        assert.strictEqual(dark.board, board);
    });

    it('merges partial 4-4 anchors style', () => {
        const definition: ThemeDefinition = {
            ...baseDefinition,
            theme: { ...baseDefinition.theme, anchor44: { color: 0x000000, size: 0.15 } },
            dark: { anchor44: { color: 0xffffff } },
        };

        assert.deepStrictEqual(resolveTheme(definition, 'dark').anchor44, { color: 0xffffff, size: 0.15 });
    });

    it('resolves playhex theme with current PlayHex colors', () => {
        assert.deepStrictEqual(resolveTheme(playhexTheme, 'dark').colors, { player1: 0xdc3545, player2: 0x0d6efd, text: 0xdee2e6 });
        assert.deepStrictEqual(resolveTheme(playhexTheme, 'light').colors, { player1: 0xdc3545, player2: 0x0d6efd, text: 0x212529 });
        assert.notStrictEqual(resolveTheme(playhexTheme, 'light').board, resolveTheme(playhexTheme, 'dark').board);
        assert.strictEqual(resolveTheme(playhexTheme, 'light').stone, resolveTheme(playhexTheme, 'dark').stone);
    });
});
