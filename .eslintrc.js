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
        'object-curly-spacing': 'off',
        '@typescript-eslint/quotes': ['warn', 'single', {avoidEscape: true, allowTemplateLiterals: true}],
        '@typescript-eslint/object-curly-spacing': ['warn', 'always'],
        '@typescript-eslint/explicit-member-accessibility': ['warn', { accessibility: 'no-public' }],
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
    },
};
