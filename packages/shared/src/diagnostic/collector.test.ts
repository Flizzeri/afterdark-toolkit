// packages/shared/src/diagnostic/collector.test.ts

import { describe, it, expect } from 'vitest';

import { DiagnosticCollector } from './collector.js';
import { FatalDiagnostic } from './types.js';
import { filePath } from '../branded';
import { createSpan } from '../source';

describe('DiagnosticCollector', () => {
        const filePathResult = filePath('/test.ts');
        if (!filePathResult.ok) throw new Error('Failed to create test file path');

        const testSpan = createSpan(
                filePathResult.value,
                { line: 1, column: 1, offset: 0 },
                { line: 1, column: 10, offset: 9 },
        );

        const otherSpan = createSpan(
                filePathResult.value,
                { line: 5, column: 5, offset: 50 },
                { line: 5, column: 15, offset: 60 },
        );

        describe('addError', () => {
                it('adds simple error', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Test error', [
                                {
                                        span: testSpan,
                                        message: 'Test error',
                                },
                        ]);

                        expect(collector.hasErrors()).toBe(true);
                        expect(collector.count()).toBe(1);
                        expect(collector.getErrors()).toHaveLength(1);

                        const error = collector.getErrors()[0];
                        expect(error.code).toBe('ADTK-TEST-001');
                        expect(error.category).toBe('error');
                        expect(error.message.title).toBe('Test error');
                        expect(error.message.description).toBe('Test error');
                        expect(error.spans[0].span).toBe(testSpan);
                        expect(error.spans[0].message).toBe('Test error');
                });

                it('adds error with custom description', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError(
                                'ADTK-TEST-001',
                                'Short title',
                                [{ span: testSpan, message: 'Short message' }],
                                {
                                        description: 'Longer detailed description',
                                },
                        );

                        const error = collector.getErrors()[0];
                        expect(error.message.title).toBe('Short title');
                        expect(error.message.description).toBe('Longer detailed description');
                });

                it('adds error with notes', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError(
                                'ADTK-TEST-001',
                                'Error',
                                [{ span: testSpan, message: 'Error' }],
                                {
                                        notes: ['Note 1', 'Note 2', 'Note 3'],
                                },
                        );

                        const error = collector.getErrors()[0];
                        expect(error.message.notes).toEqual(['Note 1', 'Note 2', 'Note 3']);
                });

                it('adds error with code example', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError(
                                'ADTK-TEST-001',
                                'Error',
                                [{ span: testSpan, message: 'Error' }],
                                {
                                        codeExample: 'const x = 42;',
                                },
                        );

                        const error = collector.getErrors()[0];
                        expect(error.message.codeExample).toBe('const x = 42;');
                });

                it('adds error with custom span message', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error title', [
                                { span: testSpan, message: 'Custom span message' },
                        ]);

                        const error = collector.getErrors()[0];
                        expect(error.spans[0].message).toBe('Custom span message');
                });

                it('adds error with issue', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', [
                                { span: testSpan, message: 'Error', issue: 'This is the issue' },
                        ]);

                        const error = collector.getErrors()[0];
                        expect(error.spans[0].issue).toBe('This is the issue');
                });

                it('adds error with help', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', [
                                { span: testSpan, message: 'Error', help: 'Try this fix' },
                        ]);

                        const error = collector.getErrors()[0];
                        expect(error.spans[0].help).toBe('Try this fix');
                });

                it('adds error with related spans', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', [
                                { span: testSpan, message: 'Error' },
                                {
                                        span: otherSpan,
                                        message: 'Related location',
                                },
                        ]);

                        const error = collector.getErrors()[0];
                        expect(error.spans).toHaveLength(2);
                        expect(error.spans![1].span).toBe(otherSpan);
                        expect(error.spans![1].message).toBe('Related location');
                });

                it('adds error with all options', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError(
                                'ADTK-TEST-001',
                                'Complex error',
                                [
                                        {
                                                span: testSpan,
                                                message: 'span message',
                                                issue: 'issue here',
                                                help: 'help text',
                                        },
                                        {
                                                span: otherSpan,
                                                message: 'related',
                                        },
                                ],
                                {
                                        description: 'Detailed description',
                                        notes: ['Note 1', 'Note 2'],
                                        codeExample: 'example code',
                                },
                        );

                        const error = collector.getErrors()[0];
                        expect(error.message.description).toBe('Detailed description');
                        expect(error.message.notes).toEqual(['Note 1', 'Note 2']);
                        expect(error.message.codeExample).toBe('example code');
                        expect(error.spans[0].message).toBe('span message');
                        expect(error.spans[0].issue).toBe('issue here');
                        expect(error.spans[0].help).toBe('help text');
                        expect(error.spans).toHaveLength(2);
                });
        });

        describe('addWarning', () => {
                it('adds simple warning', () => {
                        const collector = new DiagnosticCollector();

                        collector.addWarning('ADTK-TEST-002', 'Test warning', []);

                        expect(collector.hasWarnings()).toBe(true);
                        expect(collector.hasErrors()).toBe(false);
                        expect(collector.count()).toBe(1);

                        const warning = collector.getWarnings()[0];
                        expect(warning.category).toBe('warning');
                });

                it('adds warning with all options', () => {
                        const collector = new DiagnosticCollector();

                        collector.addWarning(
                                'ADTK-TEST-002',
                                'Warning',
                                [{ span: testSpan, message: 'msg', issue: 'iss', help: 'hlp' }],
                                {
                                        description: 'Description',
                                        notes: ['Note'],
                                        codeExample: 'code',
                                },
                        );

                        const warning = collector.getWarnings()[0];
                        expect(warning.message.description).toBe('Description');
                        expect(warning.message.notes).toEqual(['Note']);
                        expect(warning.spans[0].message).toBe('msg');
                });
        });

        describe('addInfo', () => {
                it('adds simple info', () => {
                        const collector = new DiagnosticCollector();

                        collector.addInfo('ADTK-TEST-003', 'Test info', [
                                { span: testSpan, message: 'Info' },
                        ]);

                        expect(collector.count()).toBe(1);
                        expect(collector.getInfos()).toHaveLength(1);

                        const info = collector.getInfos()[0];
                        expect(info.category).toBe('info');
                        expect(info.message.title).toBe('Test info');
                });

                it('adds info with options', () => {
                        const collector = new DiagnosticCollector();

                        collector.addInfo(
                                'ADTK-TEST-003',
                                'Info',
                                [
                                        { span: testSpan, message: 'Custom message' },
                                        { span: otherSpan, message: 'rel' },
                                ],
                                {
                                        description: 'Description',
                                        notes: ['Note 1'],
                                },
                        );

                        const info = collector.getInfos()[0];
                        expect(info.message.description).toBe('Description');
                        expect(info.message.notes).toEqual(['Note 1']);
                        expect(info.spans[0].message).toBe('Custom message');
                        expect(info.spans).toHaveLength(2);
                });
        });

        describe('addHint', () => {
                it('adds simple hint', () => {
                        const collector = new DiagnosticCollector();

                        collector.addHint('ADTK-TEST-004', 'Test hint');

                        expect(collector.count()).toBe(1);
                        expect(collector.getHints()).toHaveLength(1);

                        const hint = collector.getHints()[0];
                        expect(hint.category).toBe('hint');
                        expect(hint.message.title).toBe('Test hint');
                });

                it('adds hint with options', () => {
                        const collector = new DiagnosticCollector();

                        collector.addHint(
                                'ADTK-TEST-004',
                                'Hint',
                                { span: testSpan, message: 'Msg', help: 'Help text' },
                                {
                                        description: 'Description',
                                },
                        );

                        const hint = collector.getHints()[0];
                        expect(hint.message.description).toBe('Description');
                        expect(hint.spans[0].help).toBe('Help text');
                        expect(hint.spans[0].message).toBe('Msg');
                });
        });

        describe('add', () => {
                it('adds diagnostic directly', () => {
                        const collector = new DiagnosticCollector();

                        collector.add({
                                code: 'ADTK-TEST-005',
                                category: 'error',
                                message: {
                                        title: 'Direct error',
                                        description: 'desc',
                                },
                                spans: [
                                        {
                                                span: testSpan,
                                                message: 'msg',
                                        },
                                ],
                        });

                        expect(collector.count()).toBe(1);
                        expect(collector.hasErrors()).toBe(true);
                });

                it('throws on fatal diagnostic', () => {
                        const collector = new DiagnosticCollector();

                        expect(() => {
                                collector.add({
                                        code: 'ADTK-TEST-999',
                                        category: 'fatal',
                                        message: {
                                                title: 'Fatal error',
                                                description: 'Cannot continue',
                                        },
                                        spans: [
                                                {
                                                        span: testSpan,
                                                        message: 'fatal here',
                                                },
                                        ],
                                });
                        }).toThrow(FatalDiagnostic);

                        expect(collector.count()).toBe(0);
                });

                it('fatal diagnostic contains correct diagnostic', () => {
                        const collector = new DiagnosticCollector();

                        try {
                                collector.add({
                                        code: 'ADTK-TEST-999',
                                        category: 'fatal',
                                        message: {
                                                title: 'Fatal',
                                                description: 'desc',
                                        },
                                        spans: [
                                                {
                                                        span: testSpan,
                                                        message: 'msg',
                                                },
                                        ],
                                });
                        } catch (error) {
                                expect(error).toBeInstanceOf(FatalDiagnostic);
                                if (error instanceof FatalDiagnostic) {
                                        expect(error.diagnostic.code).toBe('ADTK-TEST-999');
                                        expect(error.diagnostic.message.title).toBe('Fatal');
                                        expect(error.message).toBe('Fatal');
                                }
                        }
                });
        });

        describe('queries', () => {
                it('hasErrors returns false when no errors', () => {
                        const collector = new DiagnosticCollector();

                        collector.addWarning('ADTK-TEST-001', 'Warning', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addInfo('ADTK-TEST-002', 'Info', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addHint('ADTK-TEST-003', 'Hint', {
                                span: testSpan,
                                message: 'Message',
                        });

                        expect(collector.hasErrors()).toBe(false);
                });

                it('hasErrors returns true when errors exist', () => {
                        const collector = new DiagnosticCollector();

                        collector.addWarning('ADTK-TEST-001', 'Warning', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addError('ADTK-TEST-002', 'Error', [
                                { span: testSpan, message: 'Message' },
                        ]);

                        expect(collector.hasErrors()).toBe(true);
                });

                it('hasWarnings returns false when no warnings', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', [
                                { span: testSpan, message: 'Message' },
                        ]);

                        expect(collector.hasWarnings()).toBe(false);
                });

                it('hasWarnings returns true when warnings exist', () => {
                        const collector = new DiagnosticCollector();

                        collector.addWarning('ADTK-TEST-001', 'Warning', [
                                { span: testSpan, message: 'Message' },
                        ]);

                        expect(collector.hasWarnings()).toBe(true);
                });

                it('hasDiagnostics returns false when empty', () => {
                        const collector = new DiagnosticCollector();

                        expect(collector.hasDiagnostics()).toBe(false);
                });

                it('hasDiagnostics returns true when any diagnostic exists', () => {
                        const collector = new DiagnosticCollector();

                        collector.addHint('ADTK-TEST-001', 'Hint', {
                                span: testSpan,
                                message: 'Message',
                        });

                        expect(collector.hasDiagnostics()).toBe(true);
                });

                it('getErrors returns only errors', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error 1', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addWarning('ADTK-TEST-002', 'Warning', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addError('ADTK-TEST-003', 'Error 2', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addInfo('ADTK-TEST-004', 'Info', [
                                { span: testSpan, message: 'Message' },
                        ]);

                        const errors = collector.getErrors();
                        expect(errors).toHaveLength(2);
                        expect(errors.every((d) => d.category === 'error')).toBe(true);
                });

                it('getWarnings returns only warnings', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addWarning('ADTK-TEST-002', 'Warning 1', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addWarning('ADTK-TEST-003', 'Warning 2', [
                                { span: testSpan, message: 'Message' },
                        ]);

                        const warnings = collector.getWarnings();
                        expect(warnings).toHaveLength(2);
                        expect(warnings.every((d) => d.category === 'warning')).toBe(true);
                });

                it('getInfos returns only infos', () => {
                        const collector = new DiagnosticCollector();

                        collector.addInfo('ADTK-TEST-001', 'Info 1', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addError('ADTK-TEST-002', 'Error', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addInfo('ADTK-TEST-003', 'Info 2', [
                                { span: testSpan, message: 'Message' },
                        ]);

                        const infos = collector.getInfos();
                        expect(infos).toHaveLength(2);
                        expect(infos.every((d) => d.category === 'info')).toBe(true);
                });

                it('getHints returns only hints', () => {
                        const collector = new DiagnosticCollector();

                        collector.addHint('ADTK-TEST-001', 'Hint 1', {
                                span: testSpan,
                                message: 'Message',
                        });
                        collector.addHint('ADTK-TEST-002', 'Hint 2', {
                                span: testSpan,
                                message: 'Message',
                        });
                        collector.addWarning('ADTK-TEST-003', 'Warning', [
                                {
                                        span: testSpan,
                                        message: 'Message',
                                },
                        ]);

                        const hints = collector.getHints();
                        expect(hints).toHaveLength(2);
                        expect(hints.every((d) => d.category === 'hint')).toBe(true);
                });

                it('getAll returns all diagnostics', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addWarning('ADTK-TEST-002', 'Warning', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addInfo('ADTK-TEST-003', 'Info', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addHint('ADTK-TEST-004', 'Hint', {
                                span: testSpan,
                                message: 'Message',
                        });

                        const all = collector.getAll();
                        expect(all).toHaveLength(4);
                });

                it('count returns total number of diagnostics', () => {
                        const collector = new DiagnosticCollector();

                        expect(collector.count()).toBe(0);

                        collector.addError('ADTK-TEST-001', 'Error', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        expect(collector.count()).toBe(1);

                        collector.addWarning('ADTK-TEST-002', 'Warning', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        expect(collector.count()).toBe(2);
                });

                it('countByCategory returns count for specific category', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error 1', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addError('ADTK-TEST-002', 'Error 2', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addWarning('ADTK-TEST-003', 'Warning', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addInfo('ADTK-TEST-004', 'Info', [
                                { span: testSpan, message: 'Message' },
                        ]);

                        expect(collector.countByCategory('error')).toBe(2);
                        expect(collector.countByCategory('warning')).toBe(1);
                        expect(collector.countByCategory('info')).toBe(1);
                        expect(collector.countByCategory('hint')).toBe(0);
                });
        });

        describe('clear', () => {
                it('removes all diagnostics', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addWarning('ADTK-TEST-002', 'Warning', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        expect(collector.count()).toBe(2);

                        collector.clear();

                        expect(collector.count()).toBe(0);
                        expect(collector.hasErrors()).toBe(false);
                        expect(collector.hasWarnings()).toBe(false);
                        expect(collector.hasDiagnostics()).toBe(false);
                });

                it('can add diagnostics after clear', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.clear();
                        collector.addWarning('ADTK-TEST-002', 'Warning', [
                                { span: testSpan, message: 'Message' },
                        ]);

                        expect(collector.count()).toBe(1);
                        expect(collector.hasWarnings()).toBe(true);
                });
        });

        describe('accumulation', () => {
                it('accumulates multiple diagnostics of same category', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error 1', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addError('ADTK-TEST-002', 'Error 2', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addError('ADTK-TEST-003', 'Error 3', [
                                { span: testSpan, message: 'Message' },
                        ]);

                        expect(collector.count()).toBe(3);
                        expect(collector.getErrors()).toHaveLength(3);
                });

                it('accumulates mixed categories', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error 1', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addWarning('ADTK-TEST-002', 'Warning 1', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addError('ADTK-TEST-003', 'Error 2', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addInfo('ADTK-TEST-004', 'Info 1', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addHint('ADTK-TEST-005', 'Hint 1', {
                                span: testSpan,
                                message: 'Message',
                        });
                        collector.addWarning('ADTK-TEST-006', 'Warning 2', [
                                { span: testSpan, message: 'Message' },
                        ]);

                        expect(collector.count()).toBe(6);
                        expect(collector.countByCategory('error')).toBe(2);
                        expect(collector.countByCategory('warning')).toBe(2);
                        expect(collector.countByCategory('info')).toBe(1);
                        expect(collector.countByCategory('hint')).toBe(1);
                });

                it('maintains order of diagnostics', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'First', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addWarning('ADTK-TEST-002', 'Second', [
                                { span: testSpan, message: 'Message' },
                        ]);
                        collector.addInfo('ADTK-TEST-003', 'Third', [
                                { span: testSpan, message: 'Message' },
                        ]);

                        const all = collector.getAll();
                        expect(all[0].message.title).toBe('First');
                        expect(all[1].message.title).toBe('Second');
                        expect(all[2].message.title).toBe('Third');
                });
        });
});
