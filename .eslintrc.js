/* eslint-disable */
module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:vue/vue3-recommended',
    ],
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.vue'],
        project: true,
    },
    plugins: [
        '@typescript-eslint',
        'eslint-plugin-vue',
        'deprecation',
        'mocha',
    ],
    root: true,
    rules: {
        'no-empty': 'off',
        'object-curly-spacing': 'off',
        'comma-dangle': ['warn', 'always-multiline'],
        '@typescript-eslint/quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
        '@typescript-eslint/object-curly-spacing': ['warn', 'always'],
        '@typescript-eslint/explicit-member-accessibility': ['warn', { accessibility: 'no-public' }],
        '@typescript-eslint/no-empty-function': 'off',
        'no-unused-vars': 'off',
        'key-spacing': ['warn', {
            singleLine: { beforeColon: false, afterColon: true },
        }],
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
        'deprecation/deprecation': 'warn',
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
        'vue/component-name-in-template-casing': ['warn', 'PascalCase']
    },
    overrides: [
        {
            files: ['src/server/commands/*'],
            rules: {
                'no-console': 'off',
            },
        },
    ],
};
