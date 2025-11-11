export default {
        root: true,
        parser: '@typescript-eslint/parser',
        plugins: ['@typescript-eslint', 'import'],
        extends: [
                'eslint:recommended',
                'plugin:@typescript-eslint/recommended',
                'plugin:@typescript-eslint/stylistic',
                'plugin:import/errors',
                'plugin:import/warnings',
                'plugin:import/typescript',
                'prettier',
        ],
        parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.base.json',
        },
        rules: {
                // Safety & clarity
                '@typescript-eslint/explicit-function-return-type': ['error'],
                '@typescript-eslint/no-explicit-any': ['error'],
                '@typescript-eslint/consistent-type-imports': ['error'],
                '@typescript-eslint/no-inferrable-types': ['error'],
                '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
                '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
                '@typescript-eslint/explicit-member-accessibility': [
                        'error',
                        { accessibility: 'explicit' },
                ],
                '@typescript-eslint/member-ordering': 'error',
                'no-console': ['warn', { allow: ['error', 'warn'] }],
                'import/no-default-export': 'error',
                'import/order': [
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
        },
        ignorePatterns: ['dist', 'node_modules'],
};
