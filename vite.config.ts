import path from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Icons from 'unplugin-icons/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { commitRef } from './src/server/lastCommitInfo.js';
import { IS_DEV } from './src/server/config.js';

const __dirname = import.meta.dirname;
const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env;

export default defineConfig(({ command }) => ({
    base: command === 'build' ? '/statics/' : '/',
    build: {
        outDir: path.join(__dirname, 'dist', 'statics'),
        emptyOutDir: true,
        manifest: 'manifest.json',
        sourcemap: IS_DEV ? 'inline' : true,
        assetsInlineLimit: 100_000, // inline fonts as data URIs
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'src/client/client.ts'),
            },
            output: {
                entryFileNames: '[name]-[hash]-bundle.js',
                chunkFileNames: '[name]-[hash]-bundle.js',
                assetFileNames: '[name]-[hash][extname]',
            },
        },
    },
    resolve: {
        extensionAlias: {
            '.js': ['.ts', '.js'],
        },
        alias: {
            // Polyfill Node.js built-ins that browser-targeted packages (e.g. tiny-typed-emitter) depend on
            'events': path.resolve(__dirname, 'node_modules/events/events.js'),
            'typeorm': path.resolve(__dirname, 'node_modules/typeorm/typeorm-model-shim.js'),
            'vue': path.resolve(__dirname, 'node_modules/vue/dist/vue.runtime.esm-bundler.js'),
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                // Silence Bootstrap SCSS deprecations (safe to ignore until Bootstrap upgrades Sass syntax)
                silenceDeprecations: ['color-functions', 'global-builtin', 'import', 'if-function'],
            },
        },
    },
    // Also add typings for these constants in src/client/types.d.ts
    define: {
        BASE_URL: JSON.stringify(process.env.BASE_URL),
        SITE_TITLE_SUFFIX: JSON.stringify(process.env.SITE_TITLE_SUFFIX),
        PUSH_VAPID_PUBLIC_KEY: JSON.stringify(process.env.PUSH_VAPID_PUBLIC_KEY),
        ALLOW_RANKED_BOT_GAMES: JSON.stringify(process.env.ALLOW_RANKED_BOT_GAMES),
        MATOMO_WEBSITE_ID: JSON.stringify(process.env.MATOMO_WEBSITE_ID),
        MATOMO_SRC: JSON.stringify(process.env.MATOMO_SRC),
        LAST_COMMIT_DATE: JSON.stringify(commitRef.date),
        VERSION: JSON.stringify(commitRef.version),
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false,
    },
    plugins: [
        // transformAssetUrls: false — images are served by Express at /images/*, not bundled by Vite.
        // Without this, the Vue compiler converts <img src="/images/..."> into ES module imports
        // that Vite can't resolve, blocking the app from mounting.
        vue({ template: { transformAssetUrls: false } }),
        Icons({ compiler: 'vue3', scale: 1 }),
        ...(SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT
            ? [sentryVitePlugin({ authToken: SENTRY_AUTH_TOKEN, org: SENTRY_ORG, project: SENTRY_PROJECT })]
            : []),
    ],
}));
