import { defineConfig } from 'cypress';
import webpackPreprocessor from '@cypress/webpack-preprocessor';
import webpackOptions from './webpack.config';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        experimentalRunAllSpecs: true,
        watchForFileChanges: false,
        setupNodeEvents(on) {
            on('file:preprocessor', webpackPreprocessor({
                webpackOptions,
                watchOptions: {},
            }));
        },
    },
});
