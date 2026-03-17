// packages/program/src/diagnostics/converter.test.ts

import { DiagnosticCollector } from '@adtk/shared';
import * as ts from 'typescript';
import { describe, it, expect } from 'vitest';

import { convertDiagnostics, toAdtkDiagnosticCode } from './converter';

describe('diagnostics/converter', () => {
        describe('toAdtkDiagnosticCode', () => {
                it('converts single digit codes', () => {
                        expect(toAdtkDiagnosticCode(1)).toBe('ADTK-TS-0001');
                        expect(toAdtkDiagnosticCode(5)).toBe('ADTK-TS-0005');
                        expect(toAdtkDiagnosticCode(9)).toBe('ADTK-TS-0009');
                });

                it('converts double digit codes', () => {
                        expect(toAdtkDiagnosticCode(10)).toBe('ADTK-TS-0010');
                        expect(toAdtkDiagnosticCode(42)).toBe('ADTK-TS-0042');
                        expect(toAdtkDiagnosticCode(99)).toBe('ADTK-TS-0099');
                });

                it('converts triple digit codes', () => {
                        expect(toAdtkDiagnosticCode(100)).toBe('ADTK-TS-0100');
                        expect(toAdtkDiagnosticCode(500)).toBe('ADTK-TS-0500');
                        expect(toAdtkDiagnosticCode(999)).toBe('ADTK-TS-0999');
                });

                it('converts four digit codes', () => {
                        expect(toAdtkDiagnosticCode(1000)).toBe('ADTK-TS-1000');
                        expect(toAdtkDiagnosticCode(2322)).toBe('ADTK-TS-2322');
                        expect(toAdtkDiagnosticCode(2339)).toBe('ADTK-TS-2339');
                        expect(toAdtkDiagnosticCode(9999)).toBe('ADTK-TS-9999');
                });

                it('converts five digit codes', () => {
                        expect(toAdtkDiagnosticCode(10000)).toBe('ADTK-TS-10000');
                        expect(toAdtkDiagnosticCode(12345)).toBe('ADTK-TS-12345');
                        expect(toAdtkDiagnosticCode(99999)).toBe('ADTK-TS-99999');
                });

                it('handles common TypeScript error codes', () => {
                        // Type mismatch
                        expect(toAdtkDiagnosticCode(2322)).toBe('ADTK-TS-2322');

                        // Property does not exist
                        expect(toAdtkDiagnosticCode(2339)).toBe('ADTK-TS-2339');

                        // Cannot find name
                        expect(toAdtkDiagnosticCode(2304)).toBe('ADTK-TS-2304');

                        // Expected N arguments but got M
                        expect(toAdtkDiagnosticCode(2554)).toBe('ADTK-TS-2554');

                        // Duplicate identifier
                        expect(toAdtkDiagnosticCode(2300)).toBe('ADTK-TS-2300');
                });

                it('pads with leading zeros correctly', () => {
                        const code1 = toAdtkDiagnosticCode(1);
                        const code10 = toAdtkDiagnosticCode(10);
                        const code100 = toAdtkDiagnosticCode(100);
                        const code1000 = toAdtkDiagnosticCode(1000);

                        expect(code1.split('-')[2]).toBe('0001');
                        expect(code10.split('-')[2]).toBe('0010');
                        expect(code100.split('-')[2]).toBe('0100');
                        expect(code1000.split('-')[2]).toBe('1000');
                });
        });

        describe('convertDiagnostics', () => {
                function createMockSourceFile(fileName: string, text: string): ts.SourceFile {
                        return ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2022, true);
                }

                it('converts error diagnostic', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile(
                                'test.ts',
                                'const x: number = "hello";',
                        );

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Type "string" is not assignable to type "number"',
                                file: sourceFile,
                                start: 18,
                                length: 7,
                        };

                        convertDiagnostics([diagnostic], collector);

                        expect(collector.hasErrors()).toBe(true);
                        expect(collector.count()).toBe(1);

                        const errors = collector.getErrors();
                        expect(errors[0].code).toBe('ADTK-TS-2322');
                        expect(errors[0].category).toBe('error');
                        expect(errors[0].message.title).toContain('string');
                        expect(errors[0].message.title).toContain('number');
                });

                it('converts warning diagnostic', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile('test.ts', 'var x = 1;');

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Warning,
                                code: 6133,
                                messageText: "'x' is declared but its value is never read",
                                file: sourceFile,
                                start: 4,
                                length: 1,
                        };

                        convertDiagnostics([diagnostic], collector);

                        expect(collector.hasWarnings()).toBe(true);
                        expect(collector.count()).toBe(1);

                        const warnings = collector.getWarnings();
                        expect(warnings[0].code).toBe('ADTK-TS-6133');
                        expect(warnings[0].category).toBe('warning');
                });

                it('converts suggestion diagnostic as info', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile('test.ts', 'const x = 1;');

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Suggestion,
                                code: 80005,
                                messageText: 'This may be converted to an async function',
                                file: sourceFile,
                                start: 0,
                                length: 10,
                        };

                        convertDiagnostics([diagnostic], collector);

                        expect(collector.hasErrors()).toBe(false);
                        expect(collector.count()).toBe(1);

                        const infos = collector.getInfos();
                        expect(infos.length).toBe(1);
                        expect(infos[0].category).toBe('info');
                });

                it('converts message diagnostic as info', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile('test.ts', 'const x = 1;');

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Message,
                                code: 6194,
                                messageText: 'Found 1 error',
                                file: sourceFile,
                                start: 0,
                                length: 10,
                        };

                        convertDiagnostics([diagnostic], collector);

                        const infos = collector.getInfos();
                        expect(infos.length).toBe(1);
                        expect(infos[0].category).toBe('info');
                });

                it('handles diagnostic without file', () => {
                        const collector = new DiagnosticCollector();

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 6053,
                                messageText: 'File not found',
                                file: undefined,
                                start: undefined,
                                length: undefined,
                        };

                        convertDiagnostics([diagnostic], collector);

                        expect(collector.hasErrors()).toBe(true);
                        const errors = collector.getErrors();

                        expect(errors[0].code).toBe('ADTK-TS-6053');
                        expect(errors[0].spans.length).toBe(0); // No spans without file
                        expect(errors[0].message.title).toBe('File not found');
                });

                it('handles diagnostic without start position', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile('test.ts', 'const x = 1;');

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 1005,
                                messageText: 'Expected semicolon',
                                file: sourceFile,
                                start: undefined,
                                length: undefined,
                        };

                        convertDiagnostics([diagnostic], collector);

                        expect(collector.hasErrors()).toBe(true);
                        const errors = collector.getErrors();

                        expect(errors[0].spans.length).toBe(0); // No spans without position
                });

                it('creates accurate source spans', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile(
                                'test.ts',
                                'const x: number = "hello";',
                        );

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Type error',
                                file: sourceFile,
                                start: 18,
                                length: 7,
                        };

                        convertDiagnostics([diagnostic], collector);

                        const errors = collector.getErrors();
                        const span = errors[0].spans[0].span;

                        expect(span.file).toContain('test.ts');
                        expect(span.file.endsWith('test.ts')).toBe(true);
                        expect(span.start.line).toBe(1);
                        expect(span.start.column).toBe(19); // 1-indexed
                        expect(span.start.offset).toBe(18); // 0-indexed
                        expect(span.end.offset).toBe(25); // start + length
                });

                it('uses 1-indexed line and column numbers', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile('test.ts', 'const x = 1;');

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 1234,
                                messageText: 'Error',
                                file: sourceFile,
                                start: 0, // First character
                                length: 5,
                        };

                        convertDiagnostics([diagnostic], collector);

                        const errors = collector.getErrors();
                        const span = errors[0].spans[0].span;

                        // Lines and columns should be 1-indexed (LSP standard)
                        expect(span.start.line).toBe(1);
                        expect(span.start.column).toBe(1);
                });

                it('handles multi-line spans', () => {
                        const collector = new DiagnosticCollector();
                        const code = `const x = {
  value: "test"
};`;
                        const sourceFile = createMockSourceFile('test.ts', code);

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Type error',
                                file: sourceFile,
                                start: 10, // Start of object
                                length: 20, // Spans multiple lines
                        };

                        convertDiagnostics([diagnostic], collector);

                        const errors = collector.getErrors();
                        const span = errors[0].spans[0].span;

                        expect(span.end.line).toBeGreaterThan(span.start.line);
                        expect(span.end.offset).toBe(span.start.offset + 20);
                });

                it('handles simple message text string', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile('test.ts', 'const x = 1;');

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Simple error message',
                                file: sourceFile,
                                start: 0,
                                length: 5,
                        };

                        convertDiagnostics([diagnostic], collector);

                        const errors = collector.getErrors();
                        expect(errors[0].message.title).toBe('Simple error message');
                        expect(errors[0].message.description).toBe('Simple error message');
                });

                it('handles message chain', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile('test.ts', 'const x = 1;');

                        const messageChain: ts.DiagnosticMessageChain = {
                                messageText: 'Primary message',
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                next: [
                                        {
                                                messageText: 'Secondary message',
                                                category: ts.DiagnosticCategory.Error,
                                                code: 2322,
                                                next: undefined,
                                        },
                                ],
                        };

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: messageChain,
                                file: sourceFile,
                                start: 0,
                                length: 5,
                        };

                        convertDiagnostics([diagnostic], collector);

                        const errors = collector.getErrors();
                        const message = errors[0].message.title;

                        expect(message).toContain('Primary message');
                        expect(message).toContain('Secondary message');
                });

                it('handles nested message chains', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile('test.ts', 'const x = 1;');

                        const messageChain: ts.DiagnosticMessageChain = {
                                messageText: 'Level 1',
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                next: [
                                        {
                                                messageText: 'Level 2',
                                                category: ts.DiagnosticCategory.Error,
                                                code: 2322,
                                                next: [
                                                        {
                                                                messageText: 'Level 3',
                                                                category: ts.DiagnosticCategory
                                                                        .Error,
                                                                code: 2322,
                                                                next: undefined,
                                                        },
                                                ],
                                        },
                                ],
                        };

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: messageChain,
                                file: sourceFile,
                                start: 0,
                                length: 5,
                        };

                        convertDiagnostics([diagnostic], collector);

                        const errors = collector.getErrors();
                        const message = errors[0].message.title;

                        expect(message).toContain('Level 1');
                        expect(message).toContain('Level 2');
                        expect(message).toContain('Level 3');

                        // Messages should be separated by newlines
                        const lines = message.split('\n');
                        expect(lines.length).toBeGreaterThanOrEqual(3);
                });

                it('handles related information', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile(
                                'test.ts',
                                'const x = 1; const y = 2;',
                        );

                        const relatedInfo: ts.DiagnosticRelatedInformation = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Related information here',
                                file: sourceFile,
                                start: 13,
                                length: 5,
                        };

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Main error',
                                file: sourceFile,
                                start: 6,
                                length: 1,
                                relatedInformation: [relatedInfo],
                        };

                        convertDiagnostics([diagnostic], collector);

                        const errors = collector.getErrors();
                        expect(errors[0].spans.length).toBe(2); // Primary + related

                        const primarySpan = errors[0].spans[0];
                        const relatedSpan = errors[0].spans[1];

                        expect(primarySpan.message).toBe('Main error');
                        expect(relatedSpan.message).toBe('Related information here');
                        expect(relatedSpan.span.start.offset).toBe(13);
                });

                it('handles multiple related information items', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile('test.ts', 'const x = 1;');

                        const relatedInfo1: ts.DiagnosticRelatedInformation = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Related 1',
                                file: sourceFile,
                                start: 0,
                                length: 5,
                        };

                        const relatedInfo2: ts.DiagnosticRelatedInformation = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Related 2',
                                file: sourceFile,
                                start: 6,
                                length: 5,
                        };

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Main error',
                                file: sourceFile,
                                start: 0,
                                length: 1,
                                relatedInformation: [relatedInfo1, relatedInfo2],
                        };

                        convertDiagnostics([diagnostic], collector);

                        const errors = collector.getErrors();
                        expect(errors[0].spans.length).toBe(3); // Primary + 2 related
                });

                it('filters out related info without file', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile('test.ts', 'const x = 1;');

                        const relatedInfo: ts.DiagnosticRelatedInformation = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Related without file',
                                file: undefined,
                                start: undefined,
                                length: undefined,
                        };

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Main error',
                                file: sourceFile,
                                start: 0,
                                length: 1,
                                relatedInformation: [relatedInfo],
                        };

                        convertDiagnostics([diagnostic], collector);

                        const errors = collector.getErrors();
                        // Should only have primary span, related info filtered out
                        expect(errors[0].spans.length).toBe(1);
                });

                it('converts multiple diagnostics', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile('test.ts', 'const x = 1;');

                        const diagnostics: ts.Diagnostic[] = [
                                {
                                        category: ts.DiagnosticCategory.Error,
                                        code: 2322,
                                        messageText: 'Error 1',
                                        file: sourceFile,
                                        start: 0,
                                        length: 5,
                                },
                                {
                                        category: ts.DiagnosticCategory.Warning,
                                        code: 6133,
                                        messageText: 'Warning 1',
                                        file: sourceFile,
                                        start: 6,
                                        length: 5,
                                },
                                {
                                        category: ts.DiagnosticCategory.Error,
                                        code: 2304,
                                        messageText: 'Error 2',
                                        file: sourceFile,
                                        start: 10,
                                        length: 2,
                                },
                        ];

                        convertDiagnostics(diagnostics, collector);

                        expect(collector.count()).toBe(3);
                        expect(collector.countByCategory('error')).toBe(2);
                        expect(collector.countByCategory('warning')).toBe(1);
                });

                it('handles empty diagnostics array', () => {
                        const collector = new DiagnosticCollector();

                        convertDiagnostics([], collector);

                        expect(collector.count()).toBe(0);
                        expect(collector.hasErrors()).toBe(false);
                });

                it('preserves all diagnostic information', () => {
                        const collector = new DiagnosticCollector();
                        const sourceFile = createMockSourceFile(
                                'test.ts',
                                'const x: number = "hello";',
                        );

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Type "string" is not assignable to type "number"',
                                file: sourceFile,
                                start: 18,
                                length: 7,
                        };

                        convertDiagnostics([diagnostic], collector);

                        const errors = collector.getErrors();
                        const error = errors[0];

                        // Code preserved
                        expect(error.code).toBe('ADTK-TS-2322');

                        // Category preserved
                        expect(error.category).toBe('error');

                        // Message preserved
                        expect(error.message.title).toBeDefined();
                        expect(error.message.description).toBeDefined();

                        // Span preserved
                        expect(error.spans.length).toBeGreaterThan(0);

                        expect(error.spans[0].span.file).toContain('test.ts');
                        expect(error.spans[0].span.file.endsWith('test.ts')).toBe(true);
                        expect(error.spans[0].span.start.offset).toBe(18);
                        expect(error.spans[0].span.end.offset).toBe(25);
                });

                it('handles invalid file paths gracefully', () => {
                        const collector = new DiagnosticCollector();

                        // Create a source file with invalid characters in name
                        const sourceFile = createMockSourceFile('', 'const x = 1;');

                        const diagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 2322,
                                messageText: 'Error',
                                file: sourceFile,
                                start: 0,
                                length: 5,
                        };

                        convertDiagnostics([diagnostic], collector);

                        // Should still convert, but might not have spans
                        expect(collector.count()).toBe(1);
                });
        });
});
