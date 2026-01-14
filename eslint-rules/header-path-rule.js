// eslint-rules/header-path-rule.js

/**
 * Custom ESLint rule that checks:
 * - If file begins with a shebang ("#!"), skip it.
 * - Then the next line must be a comment containing the file's path relative to the repo root.
 * - The line after that must be empty.
 */

export default {
        meta: {
                type: 'problem',
                docs: {
                        description:
                                'Require header containing repo-relative path (ignore shebang).',
                },
                schema: [], // no options
        },

        create(context) {
                const filename = context.getFilename();

                return {
                        Program(node) {
                                const source = context.sourceCode.getText();
                                const lines = source.split(/\r?\n/);

                                let index = 0;

                                // ---- 1. Handle shebang ----
                                const first = lines[0] ?? '';
                                const hasShebang = first.startsWith('#!');

                                if (hasShebang) {
                                        index = 1; // skip shebang
                                }

                                const headerLine = lines[index] ?? '';
                                const blankLine = lines[index + 1] ?? '';

                                // ---- 2. Compute expected path ----
                                const repoRoot = process.cwd().replace(/\\/g, '/');
                                const relativePath = filename
                                        .replace(/\\/g, '/')
                                        .replace(repoRoot + '/', '');

                                const expectedHeader = `// ${relativePath}`;

                                // ---- 3. Validate header comment ----
                                if (!headerLine.startsWith('// ')) {
                                        context.report({
                                                node,
                                                message: hasShebang
                                                        ? `Expected comment header on line ${index + 1} after shebang: "${expectedHeader}".`
                                                        : `Expected comment header on line 1: "${expectedHeader}".`,
                                        });
                                        return;
                                }

                                if (headerLine !== expectedHeader) {
                                        context.report({
                                                node,
                                                message: `Header must be exactly: "${expectedHeader}". Found: "${headerLine}".`,
                                        });
                                }

                                // ---- 4. Validate blank line ----
                                if (blankLine.trim() !== '') {
                                        context.report({
                                                node,
                                                message: `Line ${index + 2} must be empty.`,
                                        });
                                }
                        },
                };
        },
};
