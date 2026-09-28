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

        try {
            await loadTheme(theme);
        } finally {
            console.error = consoleError;
        }
        /* eslint-enable no-console */

        assert.strictEqual(stoneLoaded, true);
    });
});
