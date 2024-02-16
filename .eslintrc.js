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
        'no-empty': 'off',
        'object-curly-spacing': 'off',
        '@typescript-eslint/quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
        '@typescript-eslint/object-curly-spacing': ['warn', 'always'],
        '@typescript-eslint/explicit-member-accessibility': ['warn', { accessibility: 'no-public' }],
        '@typescript-eslint/no-empty-function': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/ban-ts-comment': 'off',
        'space-infix-ops': 'off',
        '@typescript-eslint/space-infix-ops': 'warn',
        'semi': 'off',
        '@typescript-eslint/semi': 'warn',
        '@typescript-eslint/member-delimiter-style': ['warn', {
            'multiline': {
                'delimiter': 'semi',
                'requireLast': true
            },
            'singleline': {
                'delimiter': 'comma',
                'requireLast': false
            },
            'multilineDetection': 'last-member',
        }],
        'no-console': 'warn',
    },
};
