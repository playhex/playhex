import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'index.ts'),
            formats: ['es'],
            fileName: 'index',
        },
        rollupOptions: {
            external: ['pixi.js', 'tiny-typed-emitter', '@playhex/move-notation', '@playhex/conditional-moves', '@playhex/shading-patterns'],
        },
        outDir: 'dist',
        emptyOutDir: true,
    },
});
