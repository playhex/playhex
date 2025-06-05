import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import { Configuration as DevServerConfiguration } from 'webpack-dev-server';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';
import { VueLoaderPlugin } from 'vue-loader';
import { commitRef } from './src/server/lastCommitInfo.js';
import { sentryWebpackPlugin } from '@sentry/webpack-plugin';

import { IS_DEV, WEBPACK_PORT } from './src/server/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const plugins = [
    new WebpackManifestPlugin({}),
    new VueLoaderPlugin(),
    new webpack.DefinePlugin({
        BASE_URL: JSON.stringify(process.env.BASE_URL),
        SITE_TITLE_SUFFIX: JSON.stringify(process.env.SITE_TITLE_SUFFIX),
        PUSH_VAPID_PUBLIC_KEY: JSON.stringify(process.env.PUSH_VAPID_PUBLIC_KEY),
        ALLOW_RANKED_BOT_GAMES: JSON.stringify(process.env.ALLOW_RANKED_BOT_GAMES),
        MATOMO_WEBSITE_ID: JSON.stringify(process.env.MATOMO_WEBSITE_ID),
        MATOMO_SRC: JSON.stringify(process.env.MATOMO_SRC),
        LAST_COMMIT_DATE: JSON.stringify(commitRef.date),
        VERSION: JSON.stringify(commitRef.version),
        __VUE_OPTIONS_API__: false,
        __VUE_PROD_DEVTOOLS__: false,
    }),
];

/**
 * Push release with map.js files to sentry.
 */
const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env;

if (SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT) {
    // Put the Sentry Webpack plugin after all other plugins
    plugins.push(sentryWebpackPlugin({
        authToken: SENTRY_AUTH_TOKEN,
        org: SENTRY_ORG,
        project: SENTRY_PROJECT,
    }));
}

// https://babeljs.io/docs/babel-preset-env#modules
const babelOptions = {
    modules: false,
    targets: IS_DEV
        ? { chrome: '79', firefox: '72' }
        : '> 0.25%, not dead'
    ,
};

const devServer: DevServerConfiguration = {
    port: WEBPACK_PORT,
    open: `http://localhost:${process.env.PORT || 3000}`,
    allowedHosts: ['all'],
};

const config: webpack.Configuration = {
    mode: process.env.NODE_ENV as 'development' | 'production',
    devtool: IS_DEV ? 'inline-source-map' : 'source-map',
    entry: ['./src/client/client'],
    output: {
        path: path.join(__dirname, 'dist', 'statics'),
        filename: `[name]-[chunkhash]-bundle.js`,
        chunkFilename: '[name]-[chunkhash]-bundle.js',
        publicPath: '/statics/',
    },
    resolve: {
        extensions: ['.js', '.ts'],
        extensionAlias: {
            '.js': ['.ts', '.js'], // Makes webpack can resolve import 'x.js' to 'x.ts'
        },
        alias: {
            'typeorm': path.resolve(__dirname, 'node_modules/typeorm/typeorm-model-shim'), // To prevent typeorm decorators "not found" error on frontside
        },
    },
    optimization: {
        minimize: !IS_DEV,
        splitChunks: {
            cacheGroups: {
                pixi: {
                    test: /node_modules.+pixi/,
                    name: 'pixi',
                    chunks: 'all',
                    priority: 12,
                },
                vendors: {
                    test: /[\\/]node_modules[\\/]|bootstrap/,
                    name: 'vendors',
                    chunks: 'all',
                    priority: 10,
                },
            },
        },
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader',
            },
            {
                test: /\.ts$/,
                exclude: [/node_modules/, path.resolve(__dirname, 'node_modules')],
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [['@babel/env', babelOptions], '@babel/typescript'],
                            sourceType: 'unambiguous',
                        },
                    },
                    {
                        loader: 'ts-loader',
                        options: {
                            appendTsSuffixTo: [/\.vue$/],
                            transpileOnly: true,
                        },
                    },
                ],
            },
            {
                test: /\.styl(us)?$/,
                use: [
                    'vue-style-loader',
                    'css-loader',
                    'stylus-loader',
                ],
            },
            {
                test: /\.s[ac]ss$/i,
                oneOf: [
                    {
                        exclude: /node_modules/,
                        use: [
                            // Creates `style` nodes from JS strings
                            'style-loader',
                            // Translates CSS into CommonJS
                            'css-loader',
                            // Compiles Sass to CSS
                            'sass-loader',
                        ],
                    },
                    // Duplicate config, to silence deprecations from node modules:
                    {
                        include: /node_modules/,
                        use: [
                            // Creates `style` nodes from JS strings
                            'style-loader',
                            // Translates CSS into CommonJS
                            'css-loader',
                            // Compiles Sass to CSS
                            {
                                loader: 'sass-loader',
                                options: {
                                    sassOptions: {
                                        silenceDeprecations: ['color-functions', 'global-builtin', 'import'],
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: 'style-loader',
                    },
                    {
                        loader: 'css-loader',
                    },
                ],
            },
            {
                test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                type: 'asset/inline',
            },
        ],
    },
    stats: {
        errorDetails: true,
    },
    devServer,
    plugins,
};

export default config;
