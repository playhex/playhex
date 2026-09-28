import assert from 'assert';
import '../mockDom.js';
import { createThemeFromJson, JsonThemeError } from '../../theming/json/createThemeFromJson.js';
import { resolveTheme } from '../../theming/resolveTheme.js';
import { themeNeedsLoading } from '../../theming/loadTheme.js';
import type { JsonTheme } from '../../theming/json/JsonTheme.js';

const validTheme = (): JsonTheme => ({
    metadata: {
        id: 'test',
        name: 'Test',
    },
    base: {
        colors: { player1: '#000000', player2: '#ffffff', text: 'red' },
        board: { type: 'hex', cellColor: '#888888', strokeColor: '#333333' },
        stones: { type: 'circle', size: 0.8 },
    },
});

describe('createThemeFromJson', () => {
    it('creates a single theme, same in light and dark mode', () => {
        const definition = createThemeFromJson(validTheme());

        assert.deepStrictEqual(definition.metadata, { id: 'test', name: 'Test' });
        assert.deepStrictEqual(definition.theme.colors, { player1: 0x000000, player2: 0xffffff, text: 0xff0000 });
        assert.strictEqual(definition.theme.stone.orientation, 'free');
        assert.strictEqual(definition.theme.background, undefined);
        assert.strictEqual(definition.light, undefined);
        assert.strictEqual(definition.dark, undefined);
    });

    it('creates a background when set', () => {
        const json = validTheme();
        json.base.background = { type: 'color', color: '#123456' };

        assert.strictEqual(typeof createThemeFromJson(json).theme.background, 'function');
    });

    it('creates image background and board image, with assets to load', () => {
        const json = validTheme();
        assert.strictEqual(themeNeedsLoading(createThemeFromJson(json).theme), false);

        json.base.background = { type: 'image', url: 'background.jpg', color: '#123456' };
        const { background } = createThemeFromJson(json).theme;
        assert.strictEqual(typeof background?.load, 'function');

        json.base.background = undefined;
        json.base.board = { type: 'go', lineColor: '#3d2b12', boardColor: '#e2c9a8', boardImage: 'wood.jpg' };
        const theme = createThemeFromJson(json).theme;
        assert.strictEqual(typeof theme.board.load, 'function');
        assert.strictEqual(themeNeedsLoading(theme), true);
    });

    it('deep merges light and dark variants into base', () => {
        const json: JsonTheme = {
            ...validTheme(),
            base: {
                board: { type: 'hex', strokeColor: '#333333' },
                stones: { type: 'circle' },
            },
            light: {
                colors: { player1: '#000000', player2: '#ffffff', text: '#111111' },
                board: { cellColor: '#eeeeee' },
            },
            dark: {
                colors: { player1: '#000000', player2: '#ffffff', text: '#eeeeee' },
                board: { cellColor: '#111111' },
                stones: { type: 'hex', size: 0.6 },
            },
        };

        const definition = createThemeFromJson(json);
        const light = resolveTheme(definition, 'light');
        const dark = resolveTheme(definition, 'dark');

        assert.strictEqual(light.colors.text, 0x111111);
        assert.strictEqual(light.stone.orientation, 'free');
        assert.strictEqual(dark.colors.text, 0xeeeeee);
        assert.strictEqual(dark.stone.orientation, 'flatTop');
    });

    it('creates a go-like board with outlined circle stones', () => {
        const json = validTheme();
        json.base.board = { type: 'go', lineColor: '#3d2b12', boardColor: '#dcb35c', lineWidth: 0.08 };
        json.base.stones = { type: 'circle', size: 0.8, strokeColor: '#000000' };

        const { theme } = createThemeFromJson(json);
        const boardView = theme.board({ boardsize: 5, colors: theme.colors });

        assert.strictEqual(boardView.sides?.length, 2);
        assert.strictEqual(typeof boardView.setCellShading, 'function');
        assert.strictEqual(theme.stone.orientation, 'free');
    });

    it('creates a hex board with sides in a rounded frame', () => {
        const json = validTheme();
        json.base.board = { type: 'hex', cellColor: '#d8b478', strokeColor: '#000000', frame: true, frameStrokeColor: '#000000' };

        const { theme } = createThemeFromJson(json);

        assert.strictEqual(theme.board({ boardsize: 5, colors: theme.colors }).sides?.length, 2);

        json.base.board = { type: 'hex', cellColor: '#d8b478', strokeColor: '#000000', frame: 'yes' } as never;
        assert.throws(() => createThemeFromJson(json), /^Error: base.board.frame: expected true or false/);
    });

    it('creates last move mark, square anchors and coords colors', () => {
        const json = validTheme();
        json.base.colors = { ...json.base.colors, coordsLetters: '#000000', coordsNumbers: '#ffffff' };
        json.base.anchor44 = { shape: 'square' };
        json.base.lastMove = { type: 'square', colors: ['#ffffff', '#000000'], size: 0.2 };
        json.base.sidesAlpha = { faded: 1 };
        json.base.coords = { type: 'text', fontWeight: 'bold' };

        const { theme } = createThemeFromJson(json);

        assert.strictEqual(theme.colors.coordsLetters, 0x000000);
        assert.strictEqual(theme.colors.coordsNumbers, 0xffffff);
        assert.strictEqual(theme.anchor44?.shape, 'square');
        assert.strictEqual(theme.lastMove?.orientation, 'upright');
        assert.deepStrictEqual(theme.sidesAlpha, { faded: 1 });
        assert.strictEqual(typeof theme.coords, 'function');

        json.base.sidesAlpha = { faded: 2 };
        assert.throws(() => createThemeFromJson(json), /^Error: base.sidesAlpha.faded: expected a number between 0 and 1/);
        json.base.sidesAlpha = undefined;

        json.base.coords = { type: 'text', fontWeight: 'heavy' } as never;
        assert.throws(() => createThemeFromJson(json), /^Error: base.coords.fontWeight: expected one of: normal, bold/);
        json.base.coords = undefined;

        json.base.lastMove = { type: 'star' } as never;
        assert.throws(() => createThemeFromJson(json), /^Error: base.lastMove.type: unknown type "star", expected one of: hexagon, circle, square/);

        json.base.lastMove = undefined;
        json.base.anchor44 = { shape: 'star' } as never;
        assert.throws(() => createThemeFromJson(json), /^Error: base.anchor44.shape: expected one of: circle, square/);
    });

    it('creates swappable and swapped marks', () => {
        const json = validTheme();
        json.base.swappable = { type: 'arrows', size: 0.7 };
        json.base.swapped = { type: 'text', text: 'X', colors: ['#ffffff', '#000000'] };

        const { theme } = createThemeFromJson(json);

        assert.strictEqual(theme.swappable?.orientation, 'flatTop');
        assert.strictEqual(theme.swapped?.orientation, 'upright');

        json.base.swappable = { type: 'arrows', size: 'small' } as never;
        assert.throws(() => createThemeFromJson(json), /^Error: base.swappable.size: expected a number/);

        json.base.swappable = undefined;
        json.base.swapped = { type: 'image' } as never;
        assert.throws(() => createThemeFromJson(json), /^Error: base.swapped.type: unknown type "image", expected one of: text/);
    });

    it('creates 4-4 anchors style, merged in variants', () => {
        const json = validTheme();
        json.base.anchor44 = { color: '#3d2b12', alpha: 1, size: 0.15 };
        json.dark = { anchor44: { color: '#ffffff' } };

        const definition = createThemeFromJson(json);

        assert.deepStrictEqual(resolveTheme(definition, 'light').anchor44, { color: 0x3d2b12, alpha: 1, size: 0.15 });
        assert.deepStrictEqual(resolveTheme(definition, 'dark').anchor44, { color: 0xffffff, alpha: 1, size: 0.15 });

        json.base.anchor44 = { color: '#3d2b12', radius: 0.15 } as never;
        assert.throws(() => createThemeFromJson(json), /^Error: base.anchor44.radius: unknown key/);
    });

    it('uses base for the mode without variant', () => {
        const json = validTheme();
        json.dark = { colors: { text: '#eeeeee' } };

        const definition = createThemeFromJson(json);

        assert.strictEqual(resolveTheme(definition, 'light').colors.text, 0xff0000);
        assert.strictEqual(resolveTheme(definition, 'dark').colors.text, 0xeeeeee);
    });

    it('replaces instead of merging when type changes', () => {
        const json = validTheme();
        json.base.stones = { type: 'circle', size: 0.8, colors: ['#000000', '#ffffff'] };
        json.dark = { stones: { type: 'image', player1Url: 'black.png', player2Url: 'white.png' } };

        // would throw "unknown param for type image" if circle params were merged
        const definition = createThemeFromJson(json);

        assert.strictEqual(resolveTheme(definition, 'dark').stone.orientation, 'upright');
    });

    it('throws when a mode is incomplete', () => {
        const json = validTheme();
        delete json.base.colors;
        json.light = { colors: { player1: '#000000', player2: '#ffffff', text: '#111111' } };

        assert.throws(() => createThemeFromJson(json), /^Error: base.colors: expected an object$/);
    });

    it('accepts optional metadata, date or datetime as release date', () => {
        const json = validTheme();

        json.metadata = { ...json.metadata, author: 'Someone', releaseDate: '2026-09-28' };
        assert.strictEqual(createThemeFromJson(json).metadata.releaseDate, '2026-09-28');

        json.metadata.releaseDate = '2026-09-28T14:30:00Z';
        assert.strictEqual(createThemeFromJson(json).metadata.releaseDate, '2026-09-28T14:30:00Z');

        json.metadata.releaseDate = '28/09/2026';
        assert.throws(() => createThemeFromJson(json), /metadata.releaseDate: expected an ISO 8601 date/);
    });

    it('throws explicit errors on invalid themes', () => {
        const expectError = (update: (json: JsonTheme) => void, message: RegExp): void => {
            const json = validTheme();
            update(json);
            assert.throws(() => createThemeFromJson(json), (e: Error) => e instanceof JsonThemeError && message.test(e.message));
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsafe = (value: unknown): any => value;

        expectError(json => Object.assign(json, { format: 1 }), /^format: unknown key/);
        expectError(json => json.metadata = unsafe({ ...json.metadata, version: '1.0.0' }), /^metadata.version: unknown key/);
        expectError(json => json.metadata = unsafe({ name: 'Test' }), /^metadata.id: required/);
        expectError(json => json.base.stones = unsafe({ type: 'star' }), /^base.stones.type: unknown type "star", expected one of: hex, circle, image/);
        expectError(json => json.base.stones = unsafe({ type: 'circle', sise: 0.8 }), /^base.stones.sise: unknown param for type "circle"/);
        expectError(json => json.base.stones = unsafe({ type: 'image', player1Url: 'a.png' }), /^base.stones.player2Url: required for type "image"/);
        expectError(json => json.base.background = unsafe({ type: 'image', color: '#fff' }), /^base.background.url: required for type "image"/);
        expectError(json => json.base.board = unsafe({ type: 'go', lineColor: '#000', boardImage: '' }), /^base.board.boardImage: expected a non-empty string/);
        expectError(json => json.base.board = unsafe({ type: 'hex', cellColor: 'notacolor', strokeColor: '#000' }), /^base.board.cellColor: invalid color "notacolor"/);
        expectError(json => json.base.board = unsafe({ type: 'hex', cellColor: '#fff', strokeColor: '#000', sidesColors: ['#fff'] }), /^base.board.sidesColors: expected an array of 2 colors/);
        expectError(json => json.base.colors = unsafe({ player1: '#000', player2: '#fff' }), /^base.colors.text: expected a color string/);
        expectError(json => json.base = unsafe({ ...json.base, stone: {} }), /^base.stone: unknown key/);
    });
});
