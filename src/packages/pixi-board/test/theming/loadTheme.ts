import assert from 'assert';
import '../mockDom.js';
import { loadTheme } from '../../theming/loadTheme.js';
import { playhexTheme } from '../../themes/playhex/index.js';
import type { BoardTheme } from '../../theming/types.js';

describe('loadTheme', () => {
    it('does not reject when an asset fails to load, and still loads other assets', async () => {
        let stoneLoaded = false;

        const theme: BoardTheme = {
            ...playhexTheme.theme,
            board: Object.assign(playhexTheme.theme.board.bind(null), {
                load: () => Promise.reject(new Error('404')),
            }),
            stones: {
                ...playhexTheme.theme.stones,
                load: () => {
                    stoneLoaded = true;
                    return Promise.resolve();
                },
            },
        };

        /* eslint-disable no-console */
        const consoleError = console.error;
        console.error = () => {};

        let errors: Error[];

        try {
            errors = await loadTheme(theme);
        } finally {
            console.error = consoleError;
        }
        /* eslint-enable no-console */

        assert.strictEqual(stoneLoaded, true);
        assert.deepStrictEqual(errors.map(e => e.message), ['404']);
    });

    it('returns no errors when all assets loaded', async () => {
        const theme: BoardTheme = {
            ...playhexTheme.theme,
            stones: {
                ...playhexTheme.theme.stones,
                load: () => Promise.resolve(),
            },
        };

        assert.deepStrictEqual(await loadTheme(theme), []);
    });

    it('resolves when an asset never finishes loading, after timeout', async () => {
        const theme: BoardTheme = {
            ...playhexTheme.theme,
            stones: {
                ...playhexTheme.theme.stones,
                load: () => new Promise<void>(() => {}),
            },
        };

        /* eslint-disable no-console */
        const consoleError = console.error;
        console.error = () => {};

        let errors: Error[];

        try {
            errors = await loadTheme(theme, 10);
        } finally {
            console.error = consoleError;
        }
        /* eslint-enable no-console */

        assert.strictEqual(errors.length, 1);
        assert.match(errors[0].message, /still not loaded after 10ms/);
    });
});
