import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: 'dist/visual-test',
        emptyOutDir: true,
        rollupOptions: {
            input: './test/visual/visual-test-page.ts',
            output: {
                entryFileNames: 'bundle.js',
                format: 'iife',
            },
        },
    },
});
