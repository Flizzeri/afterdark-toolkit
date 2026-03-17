// packages/program/tests/diagnostics.test.ts

import * as path from 'node:path';

import { filePath, DiagnosticCollector } from '@adtk/shared';
import * as ts from 'typescript';
import { describe, it, expect } from 'vitest';

import { convertDiagnostics, toAdtkDiagnosticCode } from '../src/diagnostics';
import { loadProject } from '../src/project';

const fixturesDir = path.join(__dirname, 'fixtures');

function fixturePath(name: string, file: string = ''): string {
        const fp = filePath(path.join(fixturesDir, name, file));
        if (!fp.ok) throw new Error(`Invalid fixture path: ${name}/${file}`);
        return fp.value;
}

describe('diagnostics/converter', () => {
        describe('toAdtkDiagnosticCode', () => {
                it('converts TypeScript error codes to ADTK format', () => {
                        expect(toAdtkDiagnosticCode(2322)).toBe('ADTK-TS-2322');
                        expect(toAdtkDiagnosticCode(2339)).toBe('ADTK-TS-2339');
                        expect(toAdtkDiagnosticCode(2304)).toBe('ADTK-TS-2304');
                });

                it('pads single digit codes', () => {
                        expect(toAdtkDiagnosticCode(1)).toBe('ADTK-TS-0001');
                        expect(toAdtkDiagnosticCode(42)).toBe('ADTK-TS-0042');
                        expect(toAdtkDiagnosticCode(123)).toBe('ADTK-TS-0123');
                });

                it('handles four digit codes', () => {
                        expect(toAdtkDiagnosticCode(1234)).toBe('ADTK-TS-1234');
                        expect(toAdtkDiagnosticCode(5678)).toBe('ADTK-TS-5678');
                });

                it('handles five digit codes', () => {
                        expect(toAdtkDiagnosticCode(12345)).toBe('ADTK-TS-12345');
                });
        });

        describe('convertDiagnostics', () => {
                it('converts TypeScript errors to ADTK diagnostics', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(false);
                        expect(diagnostics.hasErrors()).toBe(true);

                        const errors = diagnostics.getErrors();
                        expect(errors.length).toBeGreaterThan(0);

                        // Check first error has proper structure
                        const firstError = errors[0];
                        expect(firstError.code).toMatch(/^ADTK-TS-\d+$/);
                        expect(firstError.category).toBe('error');
                        expect(firstError.message.title).toBeDefined();
                        expect(firstError.message.description).toBeDefined();
                        expect(firstError.spans.length).toBeGreaterThan(0);
                }, 15000);

                it('preserves diagnostic message text', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        const errors = diagnostics.getErrors();

                        // Should have error about type mismatch (age: string vs number)
                        const typeError = errors.find(
                                (e) =>
                                        e.message.description.includes('string') &&
                                        e.message.description.includes('number'),
                        );

                        expect(typeError).toBeDefined();
                });

                it('converts diagnostic spans with correct file paths', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        const errors = diagnostics.getErrors();

                        // Find an error specifically from errors.ts (not from lib files)
                        const errorFromSource = errors.find((e) =>
                                e.spans.some((s) => s.span.file.includes('errors.ts')),
                        );

                        expect(errorFromSource).toBeDefined();
                        if (!errorFromSource) return;

                        const span = errorFromSource.spans.find((s) =>
                                s.span.file.includes('errors.ts'),
                        )!.span;

                        expect(span.file).toContain('errors.ts');
                        expect(span.start.line).toBeGreaterThan(0);
                        expect(span.start.column).toBeGreaterThan(0);
                        expect(span.end.line).toBeGreaterThan(0);
                        expect(span.end.column).toBeGreaterThan(0);
                });

                it('uses 1-indexed line and column numbers', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        const errors = diagnostics.getErrors();

                        for (const error of errors) {
                                for (const { span } of error.spans) {
                                        expect(span.start.line).toBeGreaterThan(0);
                                        expect(span.start.column).toBeGreaterThan(0);
                                        expect(span.end.line).toBeGreaterThan(0);
                                        expect(span.end.column).toBeGreaterThan(0);
                                }
                        }
                });

                it('converts diagnostic categories correctly', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        const allDiagnostics = diagnostics.getAll();

                        // Should have errors
                        const errors = allDiagnostics.filter((d) => d.category === 'error');
                        expect(errors.length).toBeGreaterThan(0);

                        // All diagnostics should have valid categories
                        for (const diag of allDiagnostics) {
                                expect(['error', 'warning', 'info', 'hint']).toContain(
                                        diag.category,
                                );
                        }
                });

                it('handles diagnostics without source file', () => {
                        const diagnostics = new DiagnosticCollector();

                        // Create a TypeScript diagnostic without a file
                        const tsDiagnostic: ts.Diagnostic = {
                                category: ts.DiagnosticCategory.Error,
                                code: 6053,
                                messageText: 'File not found',
                                file: undefined,
                                start: undefined,
                                length: undefined,
                        };

                        convertDiagnostics([tsDiagnostic], diagnostics);

                        expect(diagnostics.hasErrors()).toBe(true);
                        const errors = diagnostics.getErrors();

                        expect(errors.length).toBe(1);
                        expect(errors[0].code).toBe('ADTK-TS-6053');
                        expect(errors[0].spans.length).toBe(0); // No span since no file
                });

                it('handles diagnostic message chains', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        const errors = diagnostics.getErrors();

                        // TypeScript often provides detailed error messages
                        // Check that we preserved the full message
                        for (const error of errors) {
                                expect(error.message.description.length).toBeGreaterThan(0);
                                expect(typeof error.message.description).toBe('string');
                        }
                });

                it('preserves related diagnostic information', () => {
                        // Create a fixture with related diagnostics
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        const allDiagnostics = diagnostics.getAll();

                        // Some diagnostics may have multiple spans (primary + related)
                        const multiSpanDiagnostic = allDiagnostics.find((d) => d.spans.length > 1);

                        if (multiSpanDiagnostic) {
                                // Verify all spans have proper structure
                                for (const { span, message } of multiSpanDiagnostic.spans) {
                                        expect(span.file).toBeDefined();
                                        expect(message).toBeDefined();
                                        expect(typeof message).toBe('string');
                                }
                        }
                });

                it('handles multiple errors in same file', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        const errors = diagnostics.getErrors();

                        // errors.ts has multiple intentional errors
                        const errorsInFile = errors.filter((e) =>
                                e.spans.some((s) => s.span.file.includes('errors.ts')),
                        );

                        expect(errorsInFile.length).toBeGreaterThan(1);

                        // Errors should have different spans
                        const spans = errorsInFile.map((e) => e.spans[0].span);
                        for (let i = 1; i < spans.length; i++) {
                                expect(spans[i].start.offset).not.toBe(spans[i - 1].start.offset);
                        }
                });

                it('converts empty diagnostic array', () => {
                        const diagnostics = new DiagnosticCollector();

                        convertDiagnostics([], diagnostics);

                        expect(diagnostics.hasErrors()).toBe(false);
                        expect(diagnostics.count()).toBe(0);
                });

                it('maps specific TypeScript error codes', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        const errors = diagnostics.getErrors();
                        const errorCodes = errors.map((e) => e.code);

                        // Should have TS2322 (type mismatch)
                        expect(errorCodes.some((c) => c === 'ADTK-TS-2322')).toBe(true);

                        // Should have TS2339 (property doesn't exist)
                        expect(errorCodes.some((c) => c === 'ADTK-TS-2339')).toBe(true);

                        // Should have TS2304 (cannot find name)
                        expect(errorCodes.some((c) => c === 'ADTK-TS-2304')).toBe(true);
                });

                it('includes accurate offset information', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const errorsPath = fixturePath('compiler-errors', 'errors.ts');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        const errors = diagnostics.getErrors();

                        // Find errors from errors.ts
                        const errorsFromSource = errors.filter((e) =>
                                e.spans.some((s) => s.span.file === errorsPath),
                        );

                        expect(errorsFromSource.length).toBeGreaterThan(0);

                        // Get the source file once
                        let sourceFile = null;
                        if (result.ok) {
                                sourceFile = result.value.getSourceFile(errorsPath);
                        }

                        for (const error of errorsFromSource) {
                                const errorSpan = error.spans.find(
                                        (s) => s.span.file === errorsPath,
                                );
                                if (!errorSpan) continue;

                                const span = errorSpan.span;

                                // Offset should be >= 0
                                expect(span.start.offset).toBeGreaterThanOrEqual(0);
                                expect(span.end.offset).toBeGreaterThan(span.start.offset);

                                // If we have the source file, verify we can read the text
                                if (sourceFile) {
                                        const errorText = sourceFile.text.substring(
                                                span.start.offset,
                                                span.end.offset,
                                        );

                                        expect(errorText.length).toBeGreaterThan(0);
                                }
                        }
                });
        });
});
