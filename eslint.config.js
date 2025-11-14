// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import prettier from 'eslint-config-prettier';

export default [
        js.configs.recommended,

        // --- TypeScript rules ---
        {
                files: ['**/*.ts', '**/*.tsx'],
                languageOptions: {
                        parser: tseslint.parser,
                        parserOptions: {
                                project: ['./tsconfig.base.json'],
                                tsconfigRootDir: import.meta.dirname,
                                ecmaVersion: 'latest',
                                sourceType: 'module',
                        },
                        globals: {
                                console: 'readonly',
                                process: 'readonly',
                                module: 'readonly',
                                require: 'readonly',
                                __dirname: 'readonly',
                                __filename: 'readonly',
                                structuredClone: 'readonly',
                                Buffer: 'readonly',
                                btoa: 'readonly',
                        },
                },
                plugins: {
                        '@typescript-eslint': tseslint.plugin,
                        'import-x': importX,
                        jsdoc,
                },
                rules: {
                        // --- TypeScript strictness ---
                        '@typescript-eslint/explicit-function-return-type': 'error',
                        '@typescript-eslint/no-explicit-any': 'error',
                        '@typescript-eslint/consistent-type-imports': 'error',
                        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
                        '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
                        '@typescript-eslint/explicit-member-accessibility': [
                                'error',
                                { accessibility: 'explicit' },
                        ],

                        // --- Import hygiene ---
                        'import-x/no-default-export': 'error',
                        'import-x/order': [
                                'error',
                                {
                                        groups: [
                                                'builtin',
                                                'external',
                                                'internal',
                                                ['parent', 'sibling', 'index'],
                                        ],
                                        'newlines-between': 'always',
                                        alphabetize: { order: 'asc', caseInsensitive: true },
                                },
                        ],

                        // --- JSDoc / TSDoc ---
                        'jsdoc/check-alignment': 'error',
                        'jsdoc/check-indentation': 'warn',
                        'jsdoc/require-description': 'error',

                        // --- General hygiene ---
                        'no-console': ['warn', { allow: ['warn', 'error'] }],
                        'no-duplicate-imports': 'error',
                },
        },

        // --- ✅ Vitest / test files ---
        {
                files: ['**/tests/**/*.ts', '**/__tests__/**/*.ts', '**/*.spec.ts'],
                languageOptions: {
                        parser: tseslint.parser,
                        parserOptions: {
                                project: ['./tsconfig.test.json'],
                                tsconfigRootDir: import.meta.dirname,
                                ecmaVersion: 'latest',
                                sourceType: 'module',
                        },
                        globals: {
                                vi: 'readonly',
                                describe: 'readonly',
                                it: 'readonly',
                                test: 'readonly',
                                expect: 'readonly',
                                beforeAll: 'readonly',
                                afterAll: 'readonly',
                                beforeEach: 'readonly',
                                afterEach: 'readonly',
                        },
                },
                rules: {
                        // Relax rules that are too strict for test files
                        '@typescript-eslint/explicit-function-return-type': 'off',
                        'no-console': 'off',
                },
        },

        // --- JS files ---
        {
                files: ['**/*.js', '**/*.mjs'],
                ...js.configs.recommended,
                rules: {
                        'no-var': 'error',
                        'prefer-const': 'error',
                },
        },

        // --- Prettier last ---
        prettier,

        {
                ignores: ['**/dist', 'node_modules', '.afterdark/cache', '**/fixtures'],
        },
];
