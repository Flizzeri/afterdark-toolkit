// eslint.config.js

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import headerPathRule from './eslint-rules/header-path-rule.js';

const headerPlugin = {
        rules: { 'require-header': headerPathRule },
};

const baseTypescriptRules = {
        'no-unused-vars': 'off',
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-unused-vars': [
                'error',
                {
                        varsIgnorePattern: '^_',
                        argsIgnorePattern: '^_',
                },
        ],
        '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
        '@typescript-eslint/explicit-member-accessibility': [
                'error',
                { accessibility: 'explicit' },
        ],
        'import-x/no-default-export': 'error',
        'import-x/order': [
                'error',
                {
                        groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
                        'newlines-between': 'always',
                        alphabetize: { order: 'asc', caseInsensitive: true },
                },
        ],
        'header-check/require-header': 'error',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
};

export default [
        js.configs.recommended,

        // Source TypeScript
        {
                files: ['packages/*/src/**/*.ts'],
                languageOptions: {
                        parser: tseslint.parser,
                        parserOptions: {
                                project: ['./tsconfig.base.json'],
                                tsconfigRootDir: import.meta.dirname,
                                ecmaVersion: 'latest',
                                sourceType: 'module',
                        },
                        globals: globals.node,
                },
                plugins: {
                        '@typescript-eslint': tseslint.plugin,
                        'import-x': importX,
                        jsdoc,
                        'header-check': headerPlugin,
                },
                rules: {
                        ...baseTypescriptRules,
                        'jsdoc/check-alignment': 'error',
                        'jsdoc/require-description': 'error',
                },
        },

        // Test TypeScript
        {
                files: ['packages/*/tests/**/*.ts'],
                languageOptions: {
                        parser: tseslint.parser,
                        parserOptions: {
                                project: ['./tsconfig.test.json'],
                                tsconfigRootDir: import.meta.dirname,
                                ecmaVersion: 'latest',
                                sourceType: 'module',
                        },
                        globals: {
                                ...globals.node,
                                ...globals.browser,
                        },
                },
                plugins: {
                        '@typescript-eslint': tseslint.plugin,
                        'import-x': importX,
                        'header-check': headerPlugin,
                },
                rules: {
                        ...baseTypescriptRules,
                        '@typescript-eslint/explicit-function-return-type': 'off',
                        'no-console': 'off',
                        'header-check/require-header': 'off',
                },
        },

        // Test support files (fixtures, tsconfigs, etc...)
        {
                files: ['packages/*/tests/**/*.ts'],
                ignores: ['**/*.test.ts', '**/tests/utils/**'],
                languageOptions: {
                        parser: tseslint.parser,
                        parserOptions: {
                                project: ['./tsconfig.test.json'],
                                tsconfigRootDir: import.meta.dirname,
                                ecmaVersion: 'latest',
                                sourceType: 'module',
                        },
                        globals: globals.node,
                },
                plugins: {
                        '@typescript-eslint': tseslint.plugin,
                        'header-check': headerPlugin,
                },
                rules: {
                        'no-unused-vars': 'off',
                        '@typescript-eslint/no-unused-vars': 'off',
                        '@typescript-eslint/no-explicit-any': 'off',
                        '@typescript-eslint/explicit-function-return-type': 'off',
                        '@typescript-eslint/explicit-member-accessibility': 'off',
                        '@typescript-eslint/consistent-type-imports': 'warn',
                        'no-console': 'off',
                        'header-check/require-header': 'error',
                },
        },

        // JS config files
        {
                files: ['**/*.js', '**/*.mjs'],
                languageOptions: { globals: globals.node },
                rules: {
                        'no-var': 'error',
                        'prefer-const': 'error',
                },
                plugins: { 'header-check': headerPlugin },
        },

        // Prettier
        prettier,

        {
                ignores: [
                        '**/dist/**',
                        '**/node_modules/**',
                        '.afterdark/cache/**',
                        '**/tmp/**',
                        '**/tsup.config.ts',
                        './eslint-rules/**',
                        '**/vitest.config.ts',
                        './packages/program/tests/fixtures/compiler-errors/**',
                ],
        },
];
