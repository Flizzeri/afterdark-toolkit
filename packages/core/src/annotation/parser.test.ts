// packages/core/src/annotation/parser.test.ts

import { DiagnosticCollector } from '@adtk/shared';
import * as ts from 'typescript';
import { describe, it, expect } from 'vitest';

import { parseAnnotations } from './parser.js';
import { CoreDiagnostics } from '../diagnostics.js';

function createTestProgram(source: string): {
        program: ts.Program;
        sourceFile: ts.SourceFile;
        checker: ts.TypeChecker;
} {
        const fileName = 'test.ts';
        const compilerOptions: ts.CompilerOptions = {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ESNext,
        };

        const host = ts.createCompilerHost(compilerOptions);
        const originalGetSourceFile = host.getSourceFile;

        host.getSourceFile = (name, languageVersion): ts.SourceFile | undefined => {
                if (name === fileName) {
                        return ts.createSourceFile(name, source, languageVersion);
                }
                return originalGetSourceFile(name, languageVersion);
        };

        const program = ts.createProgram([fileName], compilerOptions, host);
        const sourceFile = program.getSourceFile(fileName)!;
        const checker = program.getTypeChecker();

        return { program, sourceFile, checker };
}

function getTypeAliasSymbol(sourceFile: ts.SourceFile, checker: ts.TypeChecker): ts.Symbol {
        let symbol: ts.Symbol | undefined;

        ts.forEachChild(sourceFile, (node) => {
                if (ts.isTypeAliasDeclaration(node)) {
                        symbol = checker.getSymbolAtLocation(node.name);
                }
        });

        if (!symbol) {
                throw new Error('No type alias found in source');
        }

        return symbol;
}

describe('parseAnnotations', () => {
        describe('empty annotations', () => {
                it('returns empty array when no JSDoc', () => {
                        const source = 'type User = string;';
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result).toEqual([]);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('returns empty array when only standard JSDoc tags', () => {
                        const source = `
				/**
				 * A user identifier.
				 * @deprecated Use UserId instead
				 * @see UserId
				 * @example const id: User = "123";
				 * @since 1.0.0
				 * @public
				 */
				type User = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result).toEqual([]);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });
        });

        describe('simple annotations', () => {
                it('parses annotation without arguments', () => {
                        const source = `
				/**
				 * @validate
				 */
				type Email = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result).toHaveLength(1);
                        expect(result[0].tag).toBe('validate');
                        expect(result[0].data).toBe(null);
                        expect(result[0].span.file).toMatch(/test\.ts$/);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses multiple annotations', () => {
                        const source = `
				/**
				 * @validate
				 * @email
				 * @required
				 */
				type Email = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result).toHaveLength(3);
                        expect(result.map((a) => a.tag)).toEqual(['validate', 'email', 'required']);
                        expect(result.every((a) => a.data === null)).toBe(true);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });
        });

        describe('annotations with primitive arguments', () => {
                it('parses number argument', () => {
                        const source = `
				/**
				 * @min(18)
				 */
				type Age = number;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result).toHaveLength(1);
                        expect(result[0].tag).toBe('min');
                        expect(result[0].data).toBe(18);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses negative number', () => {
                        const source = `
				/**
				 * @min(-100)
				 */
				type Temperature = number;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe(-100);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses decimal number', () => {
                        const source = `
				/**
				 * @threshold(0.5)
				 */
				type Probability = number;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe(0.5);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses scientific notation', () => {
                        const source = `
				/**
				 * @value(1.5e10)
				 */
				type Large = number;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe(1.5e10);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses string argument', () => {
                        const source = `
				/**
				 * @pattern("^[A-Z]")
				 */
				type Initial = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].tag).toBe('pattern');
                        expect(result[0].data).toBe('^[A-Z]');
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses single-quoted string argument', () => {
                        const source = `
				/**
				 * @pattern('test-value')
				 */
				type Test = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe('test-value');
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses boolean true argument', () => {
                        const source = `
				/**
				 * @strict(true)
				 */
				type UserId = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe(true);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses boolean false argument', () => {
                        const source = `
				/**
				 * @optional(false)
				 */
				type Required = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe(false);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses null argument', () => {
                        const source = `
				/**
				 * @initialValue(null)
				 */
				type Optional = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe(null);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });
        });

        describe('annotations with complex arguments', () => {
                it('parses object argument', () => {
                        const source = `
				/**
				 * @range({ "min": 0, "max": 100 })
				 */
				type Percentage = number;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].tag).toBe('range');
                        expect(result[0].data).toEqual({ min: 0, max: 100 });
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses array argument', () => {
                        const source = `
				/**
				 * @values([1, 2, 3, 4, 5])
				 */
				type Rating = number;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].tag).toBe('values');
                        expect(result[0].data).toEqual([1, 2, 3, 4, 5]);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses nested object', () => {
                        const source = `
				/**
				 * @validation({ "rules": { "min": 0, "max": 10 }, "message": "Invalid" })
				 */
				type Count = number;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toEqual({
                                rules: { min: 0, max: 10 },
                                message: 'Invalid',
                        });
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses array of objects', () => {
                        const source = `
				/**
				 * @options([{ "id": 1, "name": "A" }, { "id": 2, "name": "B" }])
				 */
				type Choice = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toEqual([
                                { id: 1, name: 'A' },
                                { id: 2, name: 'B' },
                        ]);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses empty object literal {}', () => {
                        const source = `
        /** @config({}) */
        type Test = string;
    `;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();
                        const result = parseAnnotations(symbol, sourceFile, diagnostics);
                        expect(result[0].data).toEqual({});
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('falls back to string when object literal has no-colon pair', () => {
                        const source = `
        /** @config({ badpair }) */
        type Test = string;
    `;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();
                        const result = parseAnnotations(symbol, sourceFile, diagnostics);
                        // tryParseObjectLiteral fails → falls through to diagnostic + raw string
                        expect(typeof result[0].data).toBe('string');
                        expect(diagnostics.hasWarnings()).toBe(true);
                });

                it('parses object literal with JSON array value for a key', () => {
                        const source = `
        /** @config({ "ids": [1, 2, 3] }) */
        type Test = string;
    `;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();
                        const result = parseAnnotations(symbol, sourceFile, diagnostics);
                        // tryParseLiteral("[1, 2, 3]") fails, tryParseJson("[1, 2, 3]") succeeds
                        expect(result[0].data).toEqual({ ids: [1, 2, 3] });
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('falls back when object literal value is completely unparseable', () => {
                        const source = `
        /** @config({ key: some weird value }) */
        type Test = string;
    `;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();
                        const result = parseAnnotations(symbol, sourceFile, diagnostics);
                        expect(typeof result[0].data).toBe('string');
                        expect(diagnostics.hasWarnings()).toBe(true);
                });
        });

        describe('special value formats', () => {
                it('parses regex literal', () => {
                        const source = `
				/**
				 * @pattern(/^[A-Z][a-z]+$/)
				 */
				type Name = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBeInstanceOf(RegExp);
                        expect((result[0].data as RegExp).source).toBe('^[A-Z][a-z]+$');
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses regex with flags', () => {
                        const source = `
				/**
				 * @pattern(/test/gi)
				 */
				type Pattern = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        const regex = result[0].data as RegExp;
                        expect(regex.source).toBe('test');
                        expect(regex.flags).toBe('gi');
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses regex with complex pattern', () => {
                        const source = `
				/**
				 * @pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/)
				 */
				type Email = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBeInstanceOf(RegExp);
                        expect((result[0].data as RegExp).source).toBe(
                                '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                        );
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses bigint literal', () => {
                        const source = `
				/**
				 * @max(9007199254740991n)
				 */
				type BigNumber = bigint;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe(9007199254740991n);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses negative bigint', () => {
                        const source = `
				/**
				 * @value(-123456789n)
				 */
				type NegativeBig = bigint;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe(-123456789n);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });
        });

        describe('error handling', () => {
                it('warns on unparseable arguments but continues', () => {
                        const source = `
				/**
				 * @custom(some weird { syntax)
				 */
				type Test = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result).toHaveLength(1);
                        expect(result[0].tag).toBe('custom');
                        expect(result[0].data).toBe('some weird { syntax');
                        expect(diagnostics.hasWarnings()).toBe(true);
                        expect(diagnostics.getWarnings()[0].code).toBe(
                                CoreDiagnostics.ANNOTATION_UNPARSEABLE_ARGUMENT.code,
                        );
                        expect(diagnostics.getWarnings()[0].message.title).toContain(
                                'Cannot parse annotation argument',
                        );
                });

                it('handles invalid regex gracefully', () => {
                        const source = `
				/**
				 * @pattern(/[/)
				 */
				type Test = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        // Invalid regex falls back to string value with warning
                        expect(result[0].data).toBe('/[/');
                        expect(diagnostics.hasWarnings()).toBe(true);
                });

                it('handles JavaScript object literal (unquoted keys)', () => {
                        const source = `
        /**
         * @config({ key: "value" })
         */
        type Test = string;
    `;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();
                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        // Should successfully parse object literals
                        expect(result[0].data).toEqual({ key: 'value' });
                        expect(diagnostics.hasWarnings()).toBe(false);
                });

                it('handles unclosed brackets', () => {
                        const source = `
				/**
				 * @array([1, 2, 3)
				 */
				type Test = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe('[1, 2, 3');
                        expect(diagnostics.hasWarnings()).toBe(true);
                });

                it('handles invalid bigint format', () => {
                        const source = `
				/**
				 * @value(notanumbern)
				 */
				type Test = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        // Falls back to string
                        expect(result[0].data).toBe('notanumbern');
                        expect(diagnostics.hasWarnings()).toBe(true);
                });
        });

        describe('mixed annotations', () => {
                it('parses mix of standard and custom tags correctly', () => {
                        const source = `
				/**
				 * User email address.
				 * @deprecated Use EmailAddress instead
				 * @validate
				 * @email
				 * @min(5)
				 * @see EmailAddress
				 * @pattern(/^[^@]+@[^@]+$/)
				 */
				type Email = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result).toHaveLength(4);
                        expect(result.map((a) => a.tag)).toEqual([
                                'validate',
                                'email',
                                'min',
                                'pattern',
                        ]);
                        expect(result[0].data).toBe(null);
                        expect(result[1].data).toBe(null);
                        expect(result[2].data).toBe(5);
                        expect(result[3].data).toBeInstanceOf(RegExp);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('preserves order of annotations', () => {
                        const source = `
				/**
				 * @first
				 * @second(42)
				 * @third("value")
				 */
				type Test = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result.map((a) => a.tag)).toEqual(['first', 'second', 'third']);
                        expect(result[0].data).toBe(null);
                        expect(result[1].data).toBe(42);
                        expect(result[2].data).toBe('value');
                });
        });

        describe('plain text annotations', () => {
                it('parses annotation with plain text as string', () => {
                        const source = `
				/**
				 * @note This is a special case
				 */
				type Special = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].tag).toBe('note');
                        expect(result[0].data).toBe('This is a special case');
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('parses multiline text annotation', () => {
                        const source = `
				/**
				 * @customNote This is a long description
				 * that spans multiple lines in the JSDoc comment
				 */
				type Test = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].tag).toBe('customNote');
                        expect(result[0].data).toContain('This is a long description');
                        expect(result[0].data).toContain('multiple lines');
                });

                it('trims whitespace from plain text', () => {
                        const source = `
				/**
				 * @note    whitespace around    
				 */
				type Test = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe('whitespace around');
                });
        });

        describe('edge cases', () => {
                it('handles annotation with empty parentheses', () => {
                        const source = `
				/**
				 * @custom()
				 */
				type Test = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        // Empty parens don't match function call regex, so treated as plain text (no warning)
                        expect(result[0].data).toBe('()');
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('handles annotation with only whitespace in parentheses', () => {
                        const source = `
				/**
				 * @custom(   )
				 */
				type Test = string;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        // Whitespace-only in parens: the argsText gets trimmed to empty string
                        // Empty string in parseAnnotationArguments gets returned as empty string with warning
                        expect(result[0].data).toBe('');
                        expect(diagnostics.hasWarnings()).toBe(true);
                });

                it('handles multiple comma-separated values as array', () => {
                        const source = `
				/**
				 * @range(0, 100)
				 */
				type Test = number;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        // Without brackets, "0, 100" won't parse as JSON array
                        // So it falls back to string with warning
                        expect(typeof result[0].data).toBe('object');
                        expect(diagnostics.hasWarnings()).toBe(false);
                });

                it('handles zero as number', () => {
                        const source = `
				/**
				 * @min(0)
				 */
				type NonNegative = number;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        expect(result[0].data).toBe(0);
                        expect(diagnostics.hasDiagnostics()).toBe(false);
                });

                it('handles NaN-like strings as unparseable', () => {
                        const source = `
				/**
				 * @value(NaN)
				 */
				type Test = number;
			`;
                        const { sourceFile, checker } = createTestProgram(source);
                        const symbol = getTypeAliasSymbol(sourceFile, checker);
                        const diagnostics = new DiagnosticCollector();

                        const result = parseAnnotations(symbol, sourceFile, diagnostics);

                        // "NaN" is not a valid JSON literal or number string
                        expect(result[0].data).toBe('NaN');
                        expect(diagnostics.hasWarnings()).toBe(true);
                });
        });
});
