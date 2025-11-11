export default {
        root: true,
        parser: '@typescript-eslint/parser',
        plugins: ['@typescript-eslint'],
        extends: [
                'eslint:recommended',
                'plugin:@typescript-eslint/recommended',
                'plugin:@typescript-eslint/stylistic',
                'prettier',
        ],
        parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.base.json',
        },
        rules: {
                '@typescript-eslint/explicit-function-return-type': 'error',
                '@typescript-eslint/no-explicit-any': 'error',
                '@typescript-eslint/consistent-type-imports': 'warn',
                '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
                'no-console': 'warn',
        },
        ignorePatterns: ['dist', 'node_modules'],
};
