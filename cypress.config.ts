import { defineConfig } from 'cypress';
import path from 'path';
import fs from 'fs';
import esbuild from 'esbuild';

const projectRoot = path.resolve('.');

// Resolve .js imports to .ts files (project uses .js extensions in ESM import paths)
const resolveJsToTs: esbuild.Plugin = {
    name: 'resolve-js-to-ts',
    setup(build) {
        build.onResolve({ filter: /\.js$/ }, (args) => {
            if (!args.path.startsWith('.')) return undefined;
            const tsPath = path.resolve(path.dirname(args.importer), args.path.replace(/\.js$/, '.ts'));
            if (fs.existsSync(tsPath)) return { path: tsPath };
            return undefined;
        });
    },
};

type CypressFile = { filePath: string, outputPath: string, on: (event: 'close', fn: () => void) => void };

const buildContexts = new Map<string, esbuild.BuildContext>();

async function esbuildPreprocessor(file: CypressFile): Promise<string> {
    let ctx = buildContexts.get(file.filePath);

    if (!ctx) {
        ctx = await esbuild.context({
            entryPoints: [file.filePath],
            bundle: true,
            format: 'iife',
            outfile: file.outputPath,
            platform: 'browser',
            target: 'chrome115',
            sourcemap: 'inline',
            tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
            alias: {
                typeorm: path.join(projectRoot, 'node_modules/typeorm/typeorm-model-shim.js'),
            },
            plugins: [resolveJsToTs],
            logLevel: 'error',
        });

        buildContexts.set(file.filePath, ctx);

        file.on('close', () => {
            void ctx!.dispose();
            buildContexts.delete(file.filePath);
        });
    }

    await ctx.rebuild();

    return file.outputPath;
}

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        experimentalRunAllSpecs: true,
        watchForFileChanges: false,
        allowCypressEnv: false,
        setupNodeEvents(on) {
            on('file:preprocessor', esbuildPreprocessor);
        },
    },
});
