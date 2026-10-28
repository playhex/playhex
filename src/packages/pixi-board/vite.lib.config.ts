import { defineConfig, Plugin } from 'vite';
import { readFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Library mode always inlines assets as base64,
 * so all users would load images of themes they never use.
 *
 * Instead, emit images as separate files in dist/assets/,
 * and keep `new URL('./assets/image.jpg', import.meta.url)` in output,
 * so that bundlers of the app using this package (vite, webpack) resolve it,
 * and image is loaded only when the theme is used.
 */
const externalImageAssets = (): Plugin => {
    const newUrlRE = /new URL\(\s*'(\.[^']+\.(?:jpe?g|png|webp|svg))'\s*,\s*import\.meta\.url\s*\)/g;
    const fileNames: string[] = [];

    return {
        name: 'pixi-board:external-image-assets',
        enforce: 'pre',

        transform(code, id) {
            if (!code.includes('import.meta.url')) {
                return null;
            }

            let changed = false;

            const transformed = code.replace(newUrlRE, (_match, relativePath: string) => {
                const fileName = `assets/${basename(relativePath)}`;

                this.emitFile({
                    type: 'asset',
                    fileName,
                    source: readFileSync(resolve(dirname(id), relativePath)),
                });

                changed = true;

                if (!fileNames.includes(fileName)) {
                    fileNames.push(fileName);
                }

                // Hide from vite own asset plugin, restored in renderChunk
                return `new URL(__PIXI_BOARD_ASSET_${fileNames.indexOf(fileName)}__, import.meta.url)`;
            });

            return changed ? { code: transformed, map: null } : null;
        },

        renderChunk(code) {
            return code.replace(/__PIXI_BOARD_ASSET_(\d+)__/g, (_match, index: string) => `'./${fileNames[Number(index)]}'`);
        },
    };
};

export default defineConfig({
    plugins: [externalImageAssets()],
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, 'index.ts'),
                'conditional-moves': resolve(__dirname, 'conditional-moves.ts'),
                'shading-patterns': resolve(__dirname, 'shading-patterns.ts'),
            },
            formats: ['es'],
            fileName: (_format, entryName) => `${entryName}.js`,
        },
        rollupOptions: {
            external: ['pixi.js', 'tiny-typed-emitter', '@playhex/move-notation', '@playhex/conditional-moves', '@playhex/shading-patterns'],
        },
        outDir: 'dist',
        emptyOutDir: true,
    },
});
