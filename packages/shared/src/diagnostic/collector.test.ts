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

                        collector.addError('ADTK-TEST-001', 'Test error', testSpan);

                        expect(collector.hasErrors()).toBe(true);
                        expect(collector.count()).toBe(1);
                        expect(collector.getErrors()).toHaveLength(1);

                        const error = collector.getErrors()[0];
                        expect(error.code).toBe('ADTK-TEST-001');
                        expect(error.category).toBe('error');
                        expect(error.message.title).toBe('Test error');
                        expect(error.message.description).toBe('Test error');
                        expect(error.span.span).toBe(testSpan);
                        expect(error.span.message).toBe('Test error');
                });

                it('adds error with custom description', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Short title', testSpan, {
                                description: 'Longer detailed description',
                        });

                        const error = collector.getErrors()[0];
                        expect(error.message.title).toBe('Short title');
                        expect(error.message.description).toBe('Longer detailed description');
                });

                it('adds error with notes', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', testSpan, {
                                notes: ['Note 1', 'Note 2', 'Note 3'],
                        });

                        const error = collector.getErrors()[0];
                        expect(error.message.notes).toEqual(['Note 1', 'Note 2', 'Note 3']);
                });

                it('adds error with code example', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', testSpan, {
                                codeExample: 'const x = 42;',
                        });

                        const error = collector.getErrors()[0];
                        expect(error.message.codeExample).toBe('const x = 42;');
                });

                it('adds error with custom span message', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error title', testSpan, {
                                message: 'Custom span message',
                        });

                        const error = collector.getErrors()[0];
                        expect(error.span.message).toBe('Custom span message');
                });

                it('adds error with issue', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', testSpan, {
                                issue: 'This is the issue',
                        });

                        const error = collector.getErrors()[0];
                        expect(error.span.issue).toBe('This is the issue');
                });

                it('adds error with help', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', testSpan, {
                                help: 'Try this fix',
                        });

                        const error = collector.getErrors()[0];
                        expect(error.span.help).toBe('Try this fix');
                });

                it('adds error with related spans', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', testSpan, {
                                relatedSpans: [
                                        {
                                                span: otherSpan,
                                                message: 'Related location',
                                        },
                                ],
                        });

                        const error = collector.getErrors()[0];
                        expect(error.relatedSpans).toHaveLength(1);
                        expect(error.relatedSpans![0].span).toBe(otherSpan);
                        expect(error.relatedSpans![0].message).toBe('Related location');
                });

                it('adds error with all options', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Complex error', testSpan, {
                                description: 'Detailed description',
                                notes: ['Note 1', 'Note 2'],
                                codeExample: 'example code',
                                message: 'span message',
                                issue: 'issue here',
                                help: 'help text',
                                relatedSpans: [
                                        {
                                                span: otherSpan,
                                                message: 'related',
                                        },
                                ],
                        });

                        const error = collector.getErrors()[0];
                        expect(error.message.description).toBe('Detailed description');
                        expect(error.message.notes).toEqual(['Note 1', 'Note 2']);
                        expect(error.message.codeExample).toBe('example code');
                        expect(error.span.message).toBe('span message');
                        expect(error.span.issue).toBe('issue here');
                        expect(error.span.help).toBe('help text');
                        expect(error.relatedSpans).toHaveLength(1);
                });
        });

        describe('addWarning', () => {
                it('adds simple warning', () => {
                        const collector = new DiagnosticCollector();

                        collector.addWarning('ADTK-TEST-002', 'Test warning', testSpan);

                        expect(collector.hasWarnings()).toBe(true);
                        expect(collector.hasErrors()).toBe(false);
                        expect(collector.count()).toBe(1);

                        const warning = collector.getWarnings()[0];
                        expect(warning.category).toBe('warning');
                });

                it('adds warning with all options', () => {
                        const collector = new DiagnosticCollector();

                        collector.addWarning('ADTK-TEST-002', 'Warning', testSpan, {
                                description: 'Description',
                                notes: ['Note'],
                                codeExample: 'code',
                                message: 'msg',
                                issue: 'iss',
                                help: 'hlp',
                        });

                        const warning = collector.getWarnings()[0];
                        expect(warning.message.description).toBe('Description');
                        expect(warning.message.notes).toEqual(['Note']);
                        expect(warning.span.message).toBe('msg');
                });
        });

        describe('addInfo', () => {
                it('adds simple info', () => {
                        const collector = new DiagnosticCollector();

                        collector.addInfo('ADTK-TEST-003', 'Test info', testSpan);

                        expect(collector.count()).toBe(1);
                        expect(collector.getInfos()).toHaveLength(1);

                        const info = collector.getInfos()[0];
                        expect(info.category).toBe('info');
                        expect(info.message.title).toBe('Test info');
                });

                it('adds info with options', () => {
                        const collector = new DiagnosticCollector();

                        collector.addInfo('ADTK-TEST-003', 'Info', testSpan, {
                                description: 'Description',
                                notes: ['Note 1'],
                                message: 'Custom message',
                                relatedSpans: [{ span: otherSpan, message: 'rel' }],
                        });

                        const info = collector.getInfos()[0];
                        expect(info.message.description).toBe('Description');
                        expect(info.message.notes).toEqual(['Note 1']);
                        expect(info.span.message).toBe('Custom message');
                        expect(info.relatedSpans).toHaveLength(1);
                });
        });

        describe('addHint', () => {
                it('adds simple hint', () => {
                        const collector = new DiagnosticCollector();

                        collector.addHint('ADTK-TEST-004', 'Test hint', testSpan);

                        expect(collector.count()).toBe(1);
                        expect(collector.getHints()).toHaveLength(1);

                        const hint = collector.getHints()[0];
                        expect(hint.category).toBe('hint');
                        expect(hint.message.title).toBe('Test hint');
                });

                it('adds hint with options', () => {
                        const collector = new DiagnosticCollector();

                        collector.addHint('ADTK-TEST-004', 'Hint', testSpan, {
                                description: 'Description',
                                help: 'Help text',
                                message: 'Msg',
                        });

                        const hint = collector.getHints()[0];
                        expect(hint.message.description).toBe('Description');
                        expect(hint.span.help).toBe('Help text');
                        expect(hint.span.message).toBe('Msg');
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
                                span: {
                                        span: testSpan,
                                        message: 'msg',
                                },
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
                                        span: {
                                                span: testSpan,
                                                message: 'fatal here',
                                        },
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
                                        span: {
                                                span: testSpan,
                                                message: 'msg',
                                        },
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

                        collector.addWarning('ADTK-TEST-001', 'Warning', testSpan);
                        collector.addInfo('ADTK-TEST-002', 'Info', testSpan);
                        collector.addHint('ADTK-TEST-003', 'Hint', testSpan);

                        expect(collector.hasErrors()).toBe(false);
                });

                it('hasErrors returns true when errors exist', () => {
                        const collector = new DiagnosticCollector();

                        collector.addWarning('ADTK-TEST-001', 'Warning', testSpan);
                        collector.addError('ADTK-TEST-002', 'Error', testSpan);

                        expect(collector.hasErrors()).toBe(true);
                });

                it('hasWarnings returns false when no warnings', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', testSpan);

                        expect(collector.hasWarnings()).toBe(false);
                });

                it('hasWarnings returns true when warnings exist', () => {
                        const collector = new DiagnosticCollector();

                        collector.addWarning('ADTK-TEST-001', 'Warning', testSpan);

                        expect(collector.hasWarnings()).toBe(true);
                });

                it('hasDiagnostics returns false when empty', () => {
                        const collector = new DiagnosticCollector();

                        expect(collector.hasDiagnostics()).toBe(false);
                });

                it('hasDiagnostics returns true when any diagnostic exists', () => {
                        const collector = new DiagnosticCollector();

                        collector.addHint('ADTK-TEST-001', 'Hint', testSpan);

                        expect(collector.hasDiagnostics()).toBe(true);
                });

                it('getErrors returns only errors', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error 1', testSpan);
                        collector.addWarning('ADTK-TEST-002', 'Warning', testSpan);
                        collector.addError('ADTK-TEST-003', 'Error 2', testSpan);
                        collector.addInfo('ADTK-TEST-004', 'Info', testSpan);

                        const errors = collector.getErrors();
                        expect(errors).toHaveLength(2);
                        expect(errors.every((d) => d.category === 'error')).toBe(true);
                });

                it('getWarnings returns only warnings', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', testSpan);
                        collector.addWarning('ADTK-TEST-002', 'Warning 1', testSpan);
                        collector.addWarning('ADTK-TEST-003', 'Warning 2', testSpan);

                        const warnings = collector.getWarnings();
                        expect(warnings).toHaveLength(2);
                        expect(warnings.every((d) => d.category === 'warning')).toBe(true);
                });

                it('getInfos returns only infos', () => {
                        const collector = new DiagnosticCollector();

                        collector.addInfo('ADTK-TEST-001', 'Info 1', testSpan);
                        collector.addError('ADTK-TEST-002', 'Error', testSpan);
                        collector.addInfo('ADTK-TEST-003', 'Info 2', testSpan);

                        const infos = collector.getInfos();
                        expect(infos).toHaveLength(2);
                        expect(infos.every((d) => d.category === 'info')).toBe(true);
                });

                it('getHints returns only hints', () => {
                        const collector = new DiagnosticCollector();

                        collector.addHint('ADTK-TEST-001', 'Hint 1', testSpan);
                        collector.addHint('ADTK-TEST-002', 'Hint 2', testSpan);
                        collector.addWarning('ADTK-TEST-003', 'Warning', testSpan);

                        const hints = collector.getHints();
                        expect(hints).toHaveLength(2);
                        expect(hints.every((d) => d.category === 'hint')).toBe(true);
                });

                it('getAll returns all diagnostics', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', testSpan);
                        collector.addWarning('ADTK-TEST-002', 'Warning', testSpan);
                        collector.addInfo('ADTK-TEST-003', 'Info', testSpan);
                        collector.addHint('ADTK-TEST-004', 'Hint', testSpan);

                        const all = collector.getAll();
                        expect(all).toHaveLength(4);
                });

                it('count returns total number of diagnostics', () => {
                        const collector = new DiagnosticCollector();

                        expect(collector.count()).toBe(0);

                        collector.addError('ADTK-TEST-001', 'Error', testSpan);
                        expect(collector.count()).toBe(1);

                        collector.addWarning('ADTK-TEST-002', 'Warning', testSpan);
                        expect(collector.count()).toBe(2);
                });

                it('countByCategory returns count for specific category', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error 1', testSpan);
                        collector.addError('ADTK-TEST-002', 'Error 2', testSpan);
                        collector.addWarning('ADTK-TEST-003', 'Warning', testSpan);
                        collector.addInfo('ADTK-TEST-004', 'Info', testSpan);

                        expect(collector.countByCategory('error')).toBe(2);
                        expect(collector.countByCategory('warning')).toBe(1);
                        expect(collector.countByCategory('info')).toBe(1);
                        expect(collector.countByCategory('hint')).toBe(0);
                });
        });

        describe('clear', () => {
                it('removes all diagnostics', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', testSpan);
                        collector.addWarning('ADTK-TEST-002', 'Warning', testSpan);
                        expect(collector.count()).toBe(2);

                        collector.clear();

                        expect(collector.count()).toBe(0);
                        expect(collector.hasErrors()).toBe(false);
                        expect(collector.hasWarnings()).toBe(false);
                        expect(collector.hasDiagnostics()).toBe(false);
                });

                it('can add diagnostics after clear', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error', testSpan);
                        collector.clear();
                        collector.addWarning('ADTK-TEST-002', 'Warning', testSpan);

                        expect(collector.count()).toBe(1);
                        expect(collector.hasWarnings()).toBe(true);
                });
        });

        describe('accumulation', () => {
                it('accumulates multiple diagnostics of same category', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error 1', testSpan);
                        collector.addError('ADTK-TEST-002', 'Error 2', testSpan);
                        collector.addError('ADTK-TEST-003', 'Error 3', testSpan);

                        expect(collector.count()).toBe(3);
                        expect(collector.getErrors()).toHaveLength(3);
                });

                it('accumulates mixed categories', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'Error 1', testSpan);
                        collector.addWarning('ADTK-TEST-002', 'Warning 1', testSpan);
                        collector.addError('ADTK-TEST-003', 'Error 2', testSpan);
                        collector.addInfo('ADTK-TEST-004', 'Info 1', testSpan);
                        collector.addHint('ADTK-TEST-005', 'Hint 1', testSpan);
                        collector.addWarning('ADTK-TEST-006', 'Warning 2', testSpan);

                        expect(collector.count()).toBe(6);
                        expect(collector.countByCategory('error')).toBe(2);
                        expect(collector.countByCategory('warning')).toBe(2);
                        expect(collector.countByCategory('info')).toBe(1);
                        expect(collector.countByCategory('hint')).toBe(1);
                });

                it('maintains order of diagnostics', () => {
                        const collector = new DiagnosticCollector();

                        collector.addError('ADTK-TEST-001', 'First', testSpan);
                        collector.addWarning('ADTK-TEST-002', 'Second', testSpan);
                        collector.addInfo('ADTK-TEST-003', 'Third', testSpan);

                        const all = collector.getAll();
                        expect(all[0].message.title).toBe('First');
                        expect(all[1].message.title).toBe('Second');
                        expect(all[2].message.title).toBe('Third');
                });
        });
});
