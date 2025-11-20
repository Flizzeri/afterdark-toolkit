// packages/shared/tests/unit/reporter.test.ts

import { describe, it, expect } from 'vitest';

import { formatDiagnostics, CATEGORY_ORDER } from '../../src/diagnostics/reporter.js';
import type { Diagnostic } from '../../src/diagnostics/types.js';
import type { FilePath } from '../../src/primitives/types.js';

describe('Diagnostics Reporter', () => {
        describe('formatDiagnostics', () => {
                it('formats empty diagnostics array', () => {
                        const result = formatDiagnostics([], { mode: 'pretty' });
                        expect(result).toBe('');
                });

                it('formats single error in pretty mode', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-1001',
                                category: 'error',
                                message: 'Unsupported type',
                                helpUrl: 'https://afterdark.dev/errors/ADTK-IR-1001',
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'pretty' });

                        expect(result).toContain('error');
                        expect(result).toContain('ADTK-IR-1001');
                        expect(result).toContain('Unsupported type');
                        expect(result).toContain('https://afterdark.dev/errors/ADTK-IR-1001');
                });

                it('formats diagnostic with location', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-1001',
                                category: 'error',
                                message: 'Type error',
                                location: {
                                        filePath: '/src/test.ts' as FilePath,
                                        line: 42,
                                        column: 10,
                                },
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'pretty' });

                        expect(result).toContain('/src/test.ts:42:10');
                });

                it('formats diagnostic with context', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-1001',
                                category: 'error',
                                message: 'Invalid field',
                                context: {
                                        entity: 'User',
                                        field: 'email',
                                        hint: 'Check type annotation',
                                },
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'pretty' });

                        expect(result).toContain('entity: User');
                        expect(result).toContain('field: email');
                        expect(result).toContain('Check type annotation');
                });

                it('formats diagnostic with location and context', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-3005',
                                category: 'error',
                                message: 'Tag cannot be applied to type',
                                location: {
                                        filePath: '/src/entities/user.ts' as FilePath,
                                        line: 15,
                                        column: 5,
                                },
                                context: {
                                        entity: 'User',
                                        field: 'profile',
                                },
                                helpUrl: 'https://afterdark.dev/errors/ADTK-IR-3005',
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'pretty' });

                        expect(result).toContain('/src/entities/user.ts:15:5');
                        expect(result).toContain('entity: User');
                        expect(result).toContain('field: profile');
                });

                it('formats multiple diagnostics in pretty mode', () => {
                        const diagnostics: Diagnostic[] = [
                                {
                                        code: 'ADTK-IR-1001',
                                        category: 'error',
                                        message: 'First error',
                                },
                                {
                                        code: 'ADTK-IR-2001',
                                        category: 'warning',
                                        message: 'First warning',
                                },
                        ];

                        const result = formatDiagnostics(diagnostics, { mode: 'pretty' });

                        expect(result).toContain('First error');
                        expect(result).toContain('First warning');
                        expect(result.split('\n\n')).toHaveLength(2);
                });

                it('formats diagnostics in JSON mode', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-1001',
                                category: 'error',
                                message: 'Test error',
                                helpUrl: 'https://afterdark.dev/errors/ADTK-IR-1001',
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'json' });
                        const parsed = JSON.parse(result);

                        expect(Array.isArray(parsed)).toBe(true);
                        expect(parsed[0].code).toBe('ADTK-IR-1001');
                        expect(parsed[0].category).toBe('error');
                        expect(parsed[0].message).toBe('Test error');
                });

                it('formats empty array in JSON mode', () => {
                        const result = formatDiagnostics([], { mode: 'json' });
                        const parsed = JSON.parse(result);

                        expect(Array.isArray(parsed)).toBe(true);
                        expect(parsed).toHaveLength(0);
                });
        });

        describe('Sorting', () => {
                it('sorts diagnostics by category (errors first)', () => {
                        const diagnostics: Diagnostic[] = [
                                {
                                        code: 'ADTK-IR-3001',
                                        category: 'info',
                                        message: 'Info message',
                                },
                                {
                                        code: 'ADTK-IR-2001',
                                        category: 'warning',
                                        message: 'Warning message',
                                },
                                {
                                        code: 'ADTK-IR-1001',
                                        category: 'error',
                                        message: 'Error message',
                                },
                        ];

                        const result = formatDiagnostics(diagnostics, { mode: 'json' });
                        const parsed = JSON.parse(result);

                        expect(parsed[0].category).toBe('error');
                        expect(parsed[1].category).toBe('warning');
                        expect(parsed[2].category).toBe('info');
                });

                it('sorts diagnostics by code within same category', () => {
                        const diagnostics: Diagnostic[] = [
                                {
                                        code: 'ADTK-IR-3005',
                                        category: 'error',
                                        message: 'Error 3',
                                },
                                {
                                        code: 'ADTK-IR-1001',
                                        category: 'error',
                                        message: 'Error 1',
                                },
                                {
                                        code: 'ADTK-IR-2001',
                                        category: 'error',
                                        message: 'Error 2',
                                },
                        ];

                        const result = formatDiagnostics(diagnostics, { mode: 'json' });
                        const parsed = JSON.parse(result);

                        expect(parsed[0].code).toBe('ADTK-IR-1001');
                        expect(parsed[1].code).toBe('ADTK-IR-2001');
                        expect(parsed[2].code).toBe('ADTK-IR-3005');
                });

                it('sorts diagnostics by message within same code', () => {
                        const diagnostics: Diagnostic[] = [
                                {
                                        code: 'ADTK-IR-1001',
                                        category: 'error',
                                        message: 'Z message',
                                },
                                {
                                        code: 'ADTK-IR-1001',
                                        category: 'error',
                                        message: 'A message',
                                },
                                {
                                        code: 'ADTK-IR-1001',
                                        category: 'error',
                                        message: 'M message',
                                },
                        ];

                        const result = formatDiagnostics(diagnostics, { mode: 'json' });
                        const parsed = JSON.parse(result);

                        expect(parsed[0].message).toBe('A message');
                        expect(parsed[1].message).toBe('M message');
                        expect(parsed[2].message).toBe('Z message');
                });

                it('maintains stable sort order', () => {
                        const diagnostics: Diagnostic[] = [
                                {
                                        code: 'ADTK-IR-2001',
                                        category: 'warning',
                                        message: 'Warning 1',
                                },
                                {
                                        code: 'ADTK-IR-1001',
                                        category: 'error',
                                        message: 'Error 1',
                                },
                                {
                                        code: 'ADTK-IR-3001',
                                        category: 'info',
                                        message: 'Info 1',
                                },
                        ];

                        const result1 = formatDiagnostics(diagnostics, { mode: 'json' });
                        const result2 = formatDiagnostics(diagnostics, { mode: 'json' });

                        expect(result1).toBe(result2);
                });
        });

        describe('CATEGORY_ORDER', () => {
                it('defines order for all categories', () => {
                        expect(CATEGORY_ORDER.error).toBe(0);
                        expect(CATEGORY_ORDER.warning).toBe(1);
                        expect(CATEGORY_ORDER.info).toBe(2);
                });

                it('orders errors before warnings', () => {
                        expect(CATEGORY_ORDER.error).toBeLessThan(CATEGORY_ORDER.warning);
                });

                it('orders warnings before info', () => {
                        expect(CATEGORY_ORDER.warning).toBeLessThan(CATEGORY_ORDER.info);
                });
        });

        describe('Pretty formatting details', () => {
                it('includes help URL when present', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-1001',
                                category: 'error',
                                message: 'Error',
                                helpUrl: 'https://afterdark.dev/errors/ADTK-IR-1001',
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'pretty' });
                        expect(result).toContain('help: https://afterdark.dev/errors/ADTK-IR-1001');
                });

                it('omits help URL when not present', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-1001',
                                category: 'error',
                                message: 'Error',
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'pretty' });
                        expect(result).not.toContain('help:');
                });

                it('formats location without line/column', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-1001',
                                category: 'error',
                                message: 'Error',
                                location: {
                                        filePath: '/src/test.ts' as FilePath,
                                },
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'pretty' });
                        expect(result).toContain('/src/test.ts');
                        expect(result).not.toContain('::');
                });

                it('formats location with line but no column', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-1001',
                                category: 'error',
                                message: 'Error',
                                location: {
                                        filePath: '/src/test.ts' as FilePath,
                                        line: 42,
                                },
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'pretty' });
                        expect(result).toContain('/src/test.ts:42');
                });

                it('formats context fields individually', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-1001',
                                category: 'error',
                                message: 'Error',
                                context: {
                                        entity: 'User',
                                },
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'pretty' });
                        expect(result).toContain('entity: User');
                        expect(result).not.toContain('field:');
                });

                it('separates multiple diagnostics with double newline', () => {
                        const diagnostics: Diagnostic[] = [
                                {
                                        code: 'ADTK-IR-1001',
                                        category: 'error',
                                        message: 'First',
                                },
                                {
                                        code: 'ADTK-IR-2001',
                                        category: 'error',
                                        message: 'Second',
                                },
                        ];

                        const result = formatDiagnostics(diagnostics, { mode: 'pretty' });
                        expect(result).toContain('\n\n');
                });
        });

        describe('JSON formatting details', () => {
                it('preserves all diagnostic fields', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-1001',
                                category: 'error',
                                message: 'Error',
                                helpUrl: 'https://afterdark.dev/errors/ADTK-IR-1001',
                                location: {
                                        filePath: '/src/test.ts' as FilePath,
                                        line: 42,
                                        column: 10,
                                        symbol: 'TestSymbol',
                                },
                                context: {
                                        entity: 'User',
                                        field: 'email',
                                        hint: 'Check annotation',
                                },
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'json' });
                        const parsed = JSON.parse(result);

                        expect(parsed[0]).toEqual(diagnostic);
                });

                it('produces valid JSON for empty array', () => {
                        const result = formatDiagnostics([], { mode: 'json' });
                        expect(() => JSON.parse(result)).not.toThrow();
                });

                it('produces formatted JSON with indentation', () => {
                        const diagnostic: Diagnostic = {
                                code: 'ADTK-IR-1001',
                                category: 'error',
                                message: 'Error',
                        };

                        const result = formatDiagnostics([diagnostic], { mode: 'json' });
                        expect(result).toContain('  ');
                        expect(result).toContain('\n');
                });
        });

        describe('Complex scenarios', () => {
                it('handles mixed categories and codes', () => {
                        const diagnostics: Diagnostic[] = [
                                {
                                        code: 'ADTK-IR-3007',
                                        category: 'error',
                                        message: 'Duplicate tag',
                                },
                                {
                                        code: 'ADTK-IR-3001',
                                        category: 'warning',
                                        message: 'Unknown tag',
                                },
                                {
                                        code: 'ADTK-IR-1001',
                                        category: 'error',
                                        message: 'Unsupported type',
                                },
                                {
                                        code: 'ADTK-IR-2001',
                                        category: 'error',
                                        message: 'Union issue',
                                },
                        ];

                        const result = formatDiagnostics(diagnostics, { mode: 'json' });
                        const parsed = JSON.parse(result);

                        expect(parsed[0].code).toBe('ADTK-IR-1001');
                        expect(parsed[1].code).toBe('ADTK-IR-2001');
                        expect(parsed[2].code).toBe('ADTK-IR-3007');
                        expect(parsed[3].code).toBe('ADTK-IR-3001');
                        expect(parsed[3].category).toBe('warning');
                });

                it('handles diagnostics with partial information', () => {
                        const diagnostics: Diagnostic[] = [
                                {
                                        code: 'ADTK-IR-1001',
                                        category: 'error',
                                        message: 'Minimal error',
                                },
                                {
                                        code: 'ADTK-IR-2001',
                                        category: 'warning',
                                        message: 'Warning with context',
                                        context: { hint: 'Some hint' },
                                },
                        ];

                        const prettyResult = formatDiagnostics(diagnostics, { mode: 'pretty' });
                        expect(prettyResult).toContain('Minimal error');
                        expect(prettyResult).toContain('Some hint');

                        const jsonResult = formatDiagnostics(diagnostics, { mode: 'json' });
                        const parsed = JSON.parse(jsonResult);
                        expect(parsed).toHaveLength(2);
                });
        });
});
