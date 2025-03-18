import tseslint from 'typescript-eslint';
import stylisticTs from '@stylistic/eslint-plugin-ts';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import tsParser from '@typescript-eslint/parser';
import mocha from 'eslint-plugin-mocha';

export default tseslint.config([
    ...tseslint.configs.recommended,
    {
        ignores: [
            'dist/',
            'cypress/',
        ],
    },
    {
        plugins: {
            '@stylistic/ts': stylisticTs,
            vue,
            mocha,
        },
        rules: {
            'no-empty': 'off',
            'object-curly-spacing': 'off',
            'comma-dangle': ['warn', 'always-multiline'],
            '@stylistic/ts/quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
            '@stylistic/ts/object-curly-spacing': ['warn', 'always'],
            '@typescript-eslint/explicit-member-accessibility': ['warn', { accessibility: 'no-public' }],
            '@typescript-eslint/no-empty-function': 'off',
            'no-unused-vars': 'off',
            'key-spacing': ['warn', {
                singleLine: { beforeColon: false, afterColon: true },
            }],
            '@typescript-eslint/no-unused-vars': ['warn', { caughtErrorsIgnorePattern: '^(_|e)$' }],
            '@typescript-eslint/ban-ts-comment': 'off',
            'space-infix-ops': 'off',
            '@stylistic/ts/space-infix-ops': 'warn',
            'semi': 'off',
            '@stylistic/ts/semi': 'warn',
            '@stylistic/ts/member-delimiter-style': ['warn', {
                'multiline': {
                    'delimiter': 'semi',
                    'requireLast': true,
                },
                'singleline': {
                    'delimiter': 'comma',
                    'requireLast': false,
                },
                'multilineDetection': 'last-member',
            }],
            'no-console': 'warn',
            'mocha/no-exclusive-tests': 'warn',
            'indent': ['warn', 4, { SwitchCase: 1, ignoredNodes: ['PropertyDefinition'] }],
            'vue/script-indent': ['warn', 4, { 'baseIndent': 0, 'switchCase': 1 }],
            'vue/html-indent': ['warn', 4, { 'baseIndent': 1 }],
            'vue/max-attributes-per-line': 'off',
            'vue/singleline-html-element-content-newline': 'off',
            'vue/attributes-order': 'off',
            'vue/html-self-closing': ['warn', { 'html': { 'component': 'always', 'void': 'any', 'normal': 'any' } }],
            'vue/multiline-html-element-content-newline': 'off',
            'vue/attribute-hyphenation': ['warn', 'never'],
            'vue/v-on-event-hyphenation': ['warn', 'never'],
            'vue/component-name-in-template-casing': ['warn', 'PascalCase'],
        },
    },
    {
        files: ['*.vue', '**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: {
                    ts: tsParser,
                },
            },
        },
    },
    {
        files: ['src/server/commands/*'],
        rules: {
            'no-console': 'off',
        },
    },
]);
