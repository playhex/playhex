import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import { defineConfig } from 'eslint/config';
import tsParser from '@typescript-eslint/parser';
import mocha from 'eslint-plugin-mocha';

export default tseslint.config([
    tseslint.configs.recommendedTypeChecked,
    {
        plugins: {
            '@stylistic': stylistic,
            vue,
            mocha,
        },
        rules: {
            'no-empty': 'off',
            'object-curly-spacing': 'off',
            'comma-dangle': ['warn', 'always-multiline'],
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-misused-promises': 'off',
            '@stylistic/quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: 'always' }],
            '@stylistic/object-curly-spacing': ['warn', 'always'],
            '@typescript-eslint/explicit-member-accessibility': ['warn', { accessibility: 'no-public' }],
            '@typescript-eslint/no-empty-function': 'off',
            'no-unused-vars': 'off',
            'key-spacing': ['warn', {
                singleLine: { beforeColon: false, afterColon: true },
            }],
            'yoda': 'warn',
            'no-cond-assign': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { caughtErrorsIgnorePattern: '^(_|e)$' }],
            '@typescript-eslint/ban-ts-comment': 'off',
            'space-infix-ops': 'off',
            '@stylistic/space-infix-ops': 'warn',
            'semi': 'off',
            '@stylistic/semi': 'warn',
            '@stylistic/member-delimiter-style': ['warn', {
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
            '@typescript-eslint/await-thenable': 'warn',
            'require-await': 'warn',
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
        files: [
            '**/*.ts',
            '**/*.vue',
        ],
    },
    {
        files: ['src/server/commands/*'],
        rules: {
            'no-console': 'off',
        },
    },
    {
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                extraFileExtensions: ['.vue'],
            },
        },
    },
    {
        ignores: [
            'dist/',
            'cypress/',
            'eslint.config.js',
            'assets/service-worker.js',
            'index.js',
            'register.js',
        ],
    },
]);
