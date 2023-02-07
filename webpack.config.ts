import path from 'path';
import { Configuration } from 'webpack';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';
import { VueLoaderPlugin } from 'vue-loader';

import { IS_DEV, WEBPACK_PORT } from './src/server/config';

const plugins = [
    new WebpackManifestPlugin({}),
    new VueLoaderPlugin(),
];

// import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
// plugins.push(new BundleAnalyzerPlugin());

const nodeModulesPath = path.resolve(__dirname, 'node_modules');
const targets = IS_DEV ? { chrome: '79', firefox: '72' } : '> 0.25%, not dead';

const config: Configuration = {
    mode: IS_DEV ? 'development' : 'production',
    devtool: IS_DEV ? 'inline-source-map' : false,
    entry: ['./src/client/client'],
    output: {
        path: path.join(__dirname, 'dist', 'statics'),
        filename: `[name]-[chunkhash]-bundle.js`,
        chunkFilename: '[name]-[chunkhash]-bundle.js',
        publicPath: '/statics/',
    },
    resolve: {
        extensions: ['.js', '.ts'],
        alias: {
            '@client': path.resolve(__dirname, 'src/client/'),
            '@server': path.resolve(__dirname, 'src/server/'),
            '@shared': path.resolve(__dirname, 'src/shared/'),
        },
    },
    optimization: {
        minimize: !IS_DEV,
        splitChunks: {
            cacheGroups: {
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                    priority: 10,
                },
                material: {
                    test: /[\\/]node_modules[\\/]@material-ui[\\/]/,
                    name: 'material-ui',
                    chunks: 'all',
                    priority: 20,
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
                exclude: [/node_modules/, nodeModulesPath],
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [['@babel/env', { modules: false, targets }], '@babel/typescript'],
                            plugins: [
                                '@babel/proposal-numeric-separator',
                                '@babel/plugin-transform-runtime',
                                ['@babel/plugin-proposal-decorators', { legacy: true }],
                                ['@babel/plugin-proposal-class-properties'],
                                '@babel/plugin-proposal-object-rest-spread',
                            ],
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
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false,
                },
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
                test: /.jpe?g$|.gif$|.png$|.svg$|.woff$|.woff2$|.ttf$|.eot$/,
                use: 'url-loader?limit=10000',
            },
        ],
    },
    devServer: {
        port: WEBPACK_PORT,
        open: `http://localhost:${process.env.PORT || 3000}`,
        allowedHosts: ['all'],
    },
    plugins,
};

export default config;
