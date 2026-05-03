// eslint-rules/header-path-rule.js

import { execSync } from 'child_process';
import path from 'path';

/**
 * Custom ESLint rule that checks:
 * - If file begins with a shebang ("#!"), skip it.
 * - Then the next line must be a comment containing the file's path relative to the git repo root.
 * - The line after that must be empty.
 */

// Gets the git repository root and caches the result to avoid running git command repeatedly.
let gitRootCache = null;
function getGitRoot() {
        if (gitRootCache !== null) {
                return gitRootCache;
        }

        try {
                const result = execSync('git rev-parse --show-toplevel', {
                        encoding: 'utf8',
                        stdio: ['pipe', 'pipe', 'ignore'], // Suppress stderr
                }).trim();

                gitRootCache = result.replace(/\\/g, '/');
                return gitRootCache;
        } catch (error) {
                // If not in a git repo or git not available fall back to process.cwd()
                gitRootCache = process.cwd().replace(/\\/g, '/');
                return gitRootCache;
        }
}

export default {
        meta: {
                type: 'problem',
                docs: {
                        description:
                                'Require header containing repo-relative path (ignore shebang).',
                },
                fixable: 'code', // Allow auto-fix
                schema: [], // no options
        },

        create(context) {
                const filename = context.getFilename();

                return {
                        Program(node) {
                                const source = context.sourceCode.getText();
                                const lines = source.split(/\r?\n/);

                                let index = 0;

                                // 1. Handle shebang
                                const first = lines[0] ?? '';
                                const hasShebang = first.startsWith('#!');

                                if (hasShebang) {
                                        index = 1;
                                }

                                const headerLine = lines[index] ?? '';
                                const blankLine = lines[index + 1] ?? '';

                                // 2. Compute expected path (relative to git root)
                                const gitRoot = getGitRoot();
                                const absolutePath = path.resolve(filename).replace(/\\/g, '/');

                                const relativePath = absolutePath.startsWith(gitRoot)
                                        ? absolutePath.slice(gitRoot.length + 1)
                                        : filename.replace(/\\/g, '/');

                                const expectedHeader = `// ${relativePath}`;

                                // 3. Validate header comment
                                if (!headerLine.startsWith('// ')) {
                                        context.report({
                                                node,
                                                message: hasShebang
                                                        ? `Expected comment header on line ${index + 1} after shebang: "${expectedHeader}".`
                                                        : `Expected comment header on line 1: "${expectedHeader}".`,
                                                fix(fixer) {
                                                        // Auto-fix: insert the expected header
                                                        const insertPos = hasShebang
                                                                ? lines[0].length + 1
                                                                : 0; // After shebang or at start
                                                        return fixer.insertTextBeforeRange(
                                                                [insertPos, insertPos],
                                                                hasShebang
                                                                        ? `\n${expectedHeader}\n\n`
                                                                        : `${expectedHeader}\n\n`,
                                                        );
                                                },
                                        });
                                        return;
                                }

                                if (headerLine !== expectedHeader) {
                                        context.report({
                                                node,
                                                message: `Header must be exactly: "${expectedHeader}". Found: "${headerLine}".`,
                                                fix(fixer) {
                                                        // Auto-fix: replace incorrect header
                                                        const lineStart = hasShebang
                                                                ? lines[0].length + 1
                                                                : 0;
                                                        const lineEnd =
                                                                lineStart + headerLine.length;
                                                        return fixer.replaceTextRange(
                                                                [lineStart, lineEnd],
                                                                expectedHeader,
                                                        );
                                                },
                                        });
                                }

                                // 4. Validate blank line
                                if (blankLine.trim() !== '') {
                                        context.report({
                                                node,
                                                message: `Line ${index + 2} must be empty.`,
                                                fix(fixer) {
                                                        // Auto-fix: ensure blank line exists
                                                        const lineEnd =
                                                                lines.slice(0, index + 1).join('\n')
                                                                        .length + headerLine.length;
                                                        if (blankLine === undefined) {
                                                                // No line exists, add one
                                                                return fixer.insertTextAfterRange(
                                                                        [lineEnd, lineEnd],
                                                                        '\n',
                                                                );
                                                        } else {
                                                                // Line exists but isn't empty, replace it
                                                                return fixer.replaceTextRange(
                                                                        [
                                                                                lineEnd + 1,
                                                                                lineEnd +
                                                                                        1 +
                                                                                        blankLine.length,
                                                                        ],
                                                                        '',
                                                                );
                                                        }
                                                },
                                        });
                                }
                        },
                };
        },
};
