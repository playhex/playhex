/* eslint-disable */
module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.vue'],
    },
    plugins: ['@typescript-eslint'],
    root: true,
    rules: {
        '@typescript-eslint/explicit-member-accessibility': ['warn', { accessibility: 'no-public' }],
        '@typescript-eslint/no-empty-function': 'off',
    },
};
