// tests/unit/ts/program.test.ts

import { describe, it, expect } from 'vitest';

import type { FilePath } from '../../../src/shared/primitives.js';
import { normalizePath } from '../../../src/ts/fs.js';
import { createProgram, addSourceFile, getSourceFiles } from '../../../src/ts/program.js';

describe('program', () => {
        describe('createProgram', () => {
                it('should create a program from valid tsconfig.json', async () => {
                        const tsconfigPath = normalizePath('./tests/fixtures/ts/tsconfig.json');
                        const result = await createProgram({ tsconfigPath });

                        expect(result.ok).toBe(true);
                        if (result.ok) {
                                expect(result.value.project).toBeDefined();
                                expect(result.value.tsconfigPath).toBe(tsconfigPath);
                                expect(result.value.basePath).toContain('tests/fixtures/ts');
                        }
                });

                it('should return error for non-existent tsconfig', async () => {
                        const result = await createProgram({
                                tsconfigPath: '/nonexistent/tsconfig.json' as FilePath,
                        });

                        expect(result.ok).toBe(false);
                        if (!result.ok) {
                                expect(result.diagnostics).toHaveLength(1);
                                expect(result.diagnostics[0]?.message).toContain('not found');
                        }
                });

                it('should load source files from tsconfig', async () => {
                        const tsconfigPath = normalizePath('./tests/fixtures/ts/tsconfig.json');
                        const result = await createProgram({ tsconfigPath });

                        expect(result.ok).toBe(true);
                        if (result.ok) {
                                const files = getSourceFiles(result.value);
                                expect(files.length).toBeGreaterThan(0);
                                expect(files.some((f) => f.includes('basic.ts'))).toBe(true);
                        }
                });
        });

        describe('addSourceFile', () => {
                it('should add source file with content', async () => {
                        const tsconfigPath = normalizePath('./tests/fixtures/ts/tsconfig.json');
                        const programResult = await createProgram({ tsconfigPath });

                        expect(programResult.ok).toBe(true);
                        if (programResult.ok) {
                                const content = 'export interface TestType { id: string; }';
                                const result = addSourceFile(
                                        programResult.value,
                                        'test.ts',
                                        content,
                                );

                                expect(result.ok).toBe(true);
                                if (result.ok) {
                                        expect(result.value).toContain('test.ts');
                                }
                        }
                });

                it('should add existing source file from disk', async () => {
                        const tsconfigPath = normalizePath('./tests/fixtures/ts/tsconfig.json');
                        const programResult = await createProgram({ tsconfigPath });

                        expect(programResult.ok).toBe(true);
                        if (programResult.ok) {
                                const filePath = normalizePath('./tests/fixtures/ts/basic.ts');
                                const result = addSourceFile(programResult.value, filePath);

                                expect(result.ok).toBe(true);
                        }
                });
        });

        describe('getSourceFiles', () => {
                it('should return only project source files', async () => {
                        const tsconfigPath = normalizePath('./tests/fixtures/ts/tsconfig.json');
                        const result = await createProgram({ tsconfigPath });

                        expect(result.ok).toBe(true);
                        if (result.ok) {
                                const files = getSourceFiles(result.value);

                                // Should not include declaration files or node_modules
                                expect(files.every((f) => !f.includes('node_modules'))).toBe(true);
                                expect(files.every((f) => !f.endsWith('.d.ts'))).toBe(true);
                        }
                });

                it('should return normalized file paths', async () => {
                        const tsconfigPath = normalizePath('./tests/fixtures/ts/tsconfig.json');
                        const result = await createProgram({ tsconfigPath });

                        expect(result.ok).toBe(true);
                        if (result.ok) {
                                const files = getSourceFiles(result.value);

                                // All paths should be POSIX-normalized (no backslashes)
                                expect(files.every((f) => !f.includes('\\'))).toBe(true);
                        }
                });
        });
});
