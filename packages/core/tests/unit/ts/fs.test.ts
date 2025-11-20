// packages/core/tests/unit/ts/fs.test.ts

import type { FilePath } from '@afterdarktk/shared';
import { describe, it, expect } from 'vitest';

import { normalizePath, readFile, fileExists, stat } from '../../../src/ts/fs.js';

describe('fs', () => {
        describe('normalizePath', () => {
                it('should normalize relative paths to absolute POSIX format', () => {
                        const result = normalizePath('./foo/bar.ts', '/base/path');
                        expect(result).toMatch(/^\/.*\/foo\/bar\.ts$/);
                        expect(result).not.toContain('\\'); // No backslashes
                });

                it('should normalize absolute paths to POSIX format', () => {
                        const result = normalizePath('/absolute/path/file.ts');
                        expect(result).toBe('/absolute/path/file.ts');
                });

                it('should be deterministic across calls with same input', () => {
                        const path1 = normalizePath('./test.ts', '/base');
                        const path2 = normalizePath('./test.ts', '/base');
                        expect(path1).toBe(path2);
                });

                it('should normalize paths to POSIX separators', () => {
                        // Test that path separators are converted to forward slashes
                        const result1 = normalizePath('./foo/bar.ts', '/base');
                        const result2 = normalizePath('./foo/bar.ts', '/base');

                        // Deterministic and uses forward slashes
                        expect(result1).toBe(result2);
                        expect(result1.split('/').length).toBeGreaterThan(1);
                });
        });

        describe('readFile', () => {
                it('should read existing file successfully', async () => {
                        const fixturePath = normalizePath('./tests/fixtures/ts/basic.ts');
                        const result = await readFile(fixturePath);

                        expect(result.ok).toBe(true);
                        if (result.ok) {
                                expect(result.value).toContain('export interface User');
                        }
                });

                it('should return error for non-existent file', async () => {
                        const result = await readFile('/nonexistent/file.ts' as FilePath);
                        expect(result.ok).toBe(false);
                        if (!result.ok) {
                                expect(result.diagnostics).toHaveLength(1);
                                expect(result.diagnostics[0]?.code).toContain('ADTK');
                        }
                });
        });

        describe('fileExists', () => {
                it('should return true for existing file', async () => {
                        const fixturePath = normalizePath('./tests/fixtures/ts/basic.ts');
                        const exists = await fileExists(fixturePath);
                        expect(exists).toBe(true);
                });

                it('should return false for non-existent file', async () => {
                        const exists = await fileExists('/nonexistent/file.ts' as FilePath);
                        expect(exists).toBe(false);
                });
        });

        describe('stat', () => {
                it('should return file stats for existing file', async () => {
                        const fixturePath = normalizePath('./tests/fixtures/ts/basic.ts');
                        const result = await stat(fixturePath);

                        expect(result.ok).toBe(true);
                        if (result.ok) {
                                expect(result.value.size).toBeGreaterThan(0);
                                expect(result.value.mtimeMs).toBeGreaterThan(0);
                        }
                });

                it('should return error for non-existent file', async () => {
                        const result = await stat('/nonexistent/file.ts' as FilePath);
                        expect(result.ok).toBe(false);
                });
        });
});
