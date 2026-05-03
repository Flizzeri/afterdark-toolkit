// commitlint.config.js

export default {
        extends: ['@commitlint/config-conventional'],
        rules: {
                'scope-enum': [
                        2,
                        'always',
                        [
                                'shared',
                                'program',
                                'core',
                                'cache',
                                'compiler',
                                'cli',
                                'tests',
                                'deps',
                                'ci',
                                'repo',
                        ],
                ],
                'type-enum': [
                        2,
                        'always',
                        [
                                'feat', // New feature
                                'fix', // Bug fix
                                'docs', // Documentation only
                                'style', // Code style (formatting, no logic change)
                                'refactor', // Code restructuring
                                'perf', // Performance improvement
                                'test', // Adding/updating tests
                                'chore', // Tooling, dependencies
                                'ci', // CI/CD changes
                                'revert', // Revert a commit
                        ],
                ],
                'subject-case': [2, 'never', ['upper-case']],
                'subject-empty': [2, 'never'],
                'subject-full-stop': [2, 'never', '.'],
                'header-max-length': [2, 'always', 100],
        },
};
