// packages/shared/src/diagnostic/utils.test.ts

import { describe, it, expect } from 'vitest';

import { FatalDiagnostic } from './types';
import { createDiagnostic, isFatal, isError, isWarning, isInfo, isHint, throwFatal } from './utils';
import { filePath } from '../branded';
import { createSpan } from '../source';

describe('diagnostic utils', () => {
        const filePathResult = filePath('/test.ts');
        if (!filePathResult.ok) throw new Error('Failed to create test file path');

        const testSpan = createSpan(
                filePathResult.value,
                { line: 1, column: 1, offset: 0 },
                { line: 1, column: 10, offset: 9 },
        );

        describe('createDiagnostic', () => {
                it('creates diagnostic with required fields', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'error',
                                {
                                        title: 'Test error',
                                        description: 'Description',
                                },
                                {
                                        span: testSpan,
                                        message: 'Span message',
                                },
                        );

                        expect(diagnostic.code).toBe('ADTK-TEST-001');
                        expect(diagnostic.category).toBe('error');
                        expect(diagnostic.message.title).toBe('Test error');
                        expect(diagnostic.message.description).toBe('Description');
                        expect(diagnostic.span.span).toBe(testSpan);
                        expect(diagnostic.span.message).toBe('Span message');
                        expect(diagnostic.relatedSpans).toBeUndefined();
                });

                it('creates diagnostic with optional notes', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'error',
                                {
                                        title: 'Test',
                                        description: 'Desc',
                                        notes: ['Note 1', 'Note 2'],
                                },
                                {
                                        span: testSpan,
                                        message: 'Msg',
                                },
                        );

                        expect(diagnostic.message.notes).toEqual(['Note 1', 'Note 2']);
                });

                it('creates diagnostic with code example', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'error',
                                {
                                        title: 'Test',
                                        description: 'Desc',
                                        codeExample: 'const x = 42;',
                                },
                                {
                                        span: testSpan,
                                        message: 'Msg',
                                },
                        );

                        expect(diagnostic.message.codeExample).toBe('const x = 42;');
                });

                it('creates diagnostic with issue and help', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'error',
                                {
                                        title: 'Test',
                                        description: 'Desc',
                                },
                                {
                                        span: testSpan,
                                        message: 'Msg',
                                        issue: 'The issue',
                                        help: 'The help',
                                },
                        );

                        expect(diagnostic.span.issue).toBe('The issue');
                        expect(diagnostic.span.help).toBe('The help');
                });

                it('creates diagnostic with related spans', () => {
                        const otherSpan = createSpan(
                                filePathResult.value,
                                { line: 5, column: 5, offset: 50 },
                                { line: 5, column: 10, offset: 55 },
                        );

                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'error',
                                {
                                        title: 'Test',
                                        description: 'Desc',
                                },
                                {
                                        span: testSpan,
                                        message: 'Msg',
                                },
                                [
                                        {
                                                span: otherSpan,
                                                message: 'Related location',
                                        },
                                ],
                        );

                        expect(diagnostic.relatedSpans).toHaveLength(1);
                        expect(diagnostic.relatedSpans![0].span).toBe(otherSpan);
                        expect(diagnostic.relatedSpans![0].message).toBe('Related location');
                });

                it('creates fatal diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-999',
                                'fatal',
                                {
                                        title: 'Fatal',
                                        description: 'Cannot continue',
                                },
                                {
                                        span: testSpan,
                                        message: 'Fatal here',
                                },
                        );

                        expect(diagnostic.category).toBe('fatal');
                });

                it('creates warning diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'warning',
                                {
                                        title: 'Warning',
                                        description: 'Desc',
                                },
                                {
                                        span: testSpan,
                                        message: 'Msg',
                                },
                        );

                        expect(diagnostic.category).toBe('warning');
                });

                it('creates info diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'info',
                                {
                                        title: 'Info',
                                        description: 'Desc',
                                },
                                {
                                        span: testSpan,
                                        message: 'Msg',
                                },
                        );

                        expect(diagnostic.category).toBe('info');
                });

                it('creates hint diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'hint',
                                {
                                        title: 'Hint',
                                        description: 'Desc',
                                },
                                {
                                        span: testSpan,
                                        message: 'Msg',
                                },
                        );

                        expect(diagnostic.category).toBe('hint');
                });
        });

        describe('isFatal', () => {
                it('returns true for fatal diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-999',
                                'fatal',
                                { title: 'Fatal', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        expect(isFatal(diagnostic)).toBe(true);
                });

                it('returns false for non-fatal diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'error',
                                { title: 'Error', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        expect(isFatal(diagnostic)).toBe(false);
                });
        });

        describe('isError', () => {
                it('returns true for error diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'error',
                                { title: 'Error', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        expect(isError(diagnostic)).toBe(true);
                });

                it('returns false for non-error diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'warning',
                                { title: 'Warning', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        expect(isError(diagnostic)).toBe(false);
                });
        });

        describe('isWarning', () => {
                it('returns true for warning diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'warning',
                                { title: 'Warning', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        expect(isWarning(diagnostic)).toBe(true);
                });

                it('returns false for non-warning diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'error',
                                { title: 'Error', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        expect(isWarning(diagnostic)).toBe(false);
                });
        });

        describe('isInfo', () => {
                it('returns true for info diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'info',
                                { title: 'Info', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        expect(isInfo(diagnostic)).toBe(true);
                });

                it('returns false for non-info diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'error',
                                { title: 'Error', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        expect(isInfo(diagnostic)).toBe(false);
                });
        });

        describe('isHint', () => {
                it('returns true for hint diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'hint',
                                { title: 'Hint', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        expect(isHint(diagnostic)).toBe(true);
                });

                it('returns false for non-hint diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-001',
                                'error',
                                { title: 'Error', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        expect(isHint(diagnostic)).toBe(false);
                });
        });

        describe('throwFatal', () => {
                it('throws FatalDiagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-999',
                                'fatal',
                                { title: 'Fatal', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        expect(() => throwFatal(diagnostic)).toThrow(FatalDiagnostic);
                });

                it('thrown error contains diagnostic', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-999',
                                'fatal',
                                { title: 'Fatal', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        try {
                                throwFatal(diagnostic);
                        } catch (error) {
                                expect(error).toBeInstanceOf(FatalDiagnostic);
                                if (error instanceof FatalDiagnostic) {
                                        expect(error.diagnostic).toBe(diagnostic);
                                        expect(error.message).toBe('Fatal');
                                }
                        }
                });

                it('thrown error has correct name', () => {
                        const diagnostic = createDiagnostic(
                                'ADTK-TEST-999',
                                'fatal',
                                { title: 'Fatal', description: 'Desc' },
                                { span: testSpan, message: 'Msg' },
                        );

                        try {
                                throwFatal(diagnostic);
                        } catch (error) {
                                if (error instanceof Error) {
                                        expect(error.name).toBe('FatalDiagnostic');
                                }
                        }
                });
        });
});
