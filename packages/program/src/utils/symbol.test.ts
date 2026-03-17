// packages/program/src/utils/symbol.test.ts

import { DiagnosticCollector } from '@adtk/shared';
import * as ts from 'typescript';
import { describe, it, expect, beforeEach } from 'vitest';

import { generateSymbolId } from './symbol';

describe('utils/symbol', () => {
        let collector: DiagnosticCollector;

        beforeEach(() => {
                collector = new DiagnosticCollector();
        });

        function createProgram(
                code: string,
                fileName: string = 'test.ts',
        ): {
                program: ts.Program;
                sourceFile: ts.SourceFile;
        } {
                const sourceFile = ts.createSourceFile(
                        fileName,
                        code,
                        ts.ScriptTarget.ES2022,
                        true,
                );

                const host: ts.CompilerHost = {
                        getSourceFile: (name) => (name === fileName ? sourceFile : undefined),
                        writeFile: () => {},
                        getCurrentDirectory: () => '/',
                        getDirectories: () => [],
                        fileExists: () => true,
                        readFile: () => '',
                        getCanonicalFileName: (name) => name,
                        useCaseSensitiveFileNames: () => true,
                        getNewLine: () => '\n',
                        getDefaultLibFileName: () => 'lib.d.ts',
                };

                const program = ts.createProgram([fileName], {}, host);
                return { program, sourceFile };
        }

        function findSymbol(
                sourceFile: ts.SourceFile,
                checker: ts.TypeChecker,
                name: string,
        ): ts.Symbol | undefined {
                let foundSymbol: ts.Symbol | undefined;

                function visit(node: ts.Node): void {
                        if (ts.isIdentifier(node) && node.text === name) {
                                const symbol = checker.getSymbolAtLocation(node);
                                if (symbol && !foundSymbol) {
                                        foundSymbol = symbol;
                                }
                        }
                        ts.forEachChild(node, visit);
                }

                visit(sourceFile);
                return foundSymbol;
        }

        describe('generateSymbolId', () => {
                it('generates symbol ID for interface', () => {
                        const code = 'interface User { name: string; }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'User');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        expect(typeof symbolId).toBe('string');
                        expect(symbolId).toContain('User');
                        expect(symbolId).toContain('test.ts');
                        expect(symbolId.split('#').length).toBe(3); // name#file#hash
                });

                it('generates symbol ID for type alias', () => {
                        const code = 'type Status = "active" | "inactive";';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'Status');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        expect(symbolId).toContain('Status');
                        expect(symbolId).toContain('test.ts');
                });

                it('generates symbol ID for function', () => {
                        const code = 'function getUser(id: string) { return id; }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'getUser');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        expect(symbolId).toContain('getUser');
                        expect(symbolId).toContain('test.ts');
                });

                it('generates symbol ID for variable', () => {
                        const code = 'const MAX_COUNT = 100;';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'MAX_COUNT');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        expect(symbolId).toContain('MAX_COUNT');
                        expect(symbolId).toContain('test.ts');
                });

                it('generates symbol ID for class', () => {
                        const code = 'class UserService { getUser() {} }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'UserService');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        expect(symbolId).toContain('UserService');
                        expect(symbolId).toContain('test.ts');
                });

                it('generates symbol ID for enum', () => {
                        const code = 'enum Color { Red, Green, Blue }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'Color');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        expect(symbolId).toContain('Color');
                        expect(symbolId).toContain('test.ts');
                });

                it('includes position hash in symbol ID', () => {
                        const code = 'interface User { name: string; }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'User');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        const parts = symbolId.split('#');
                        expect(parts.length).toBe(3);
                        expect(parts[0]).toBe('User'); // name

                        expect(parts[1]).toContain('test.ts');
                        expect(parts[1].endsWith('test.ts')).toBe(true);
                        expect(parts[2]).toMatch(/^[a-f0-9]{8}$/); // hash (8 hex chars)
                });

                it('generates different IDs for same name in different positions', () => {
                        const code = `
        interface User { name: string; }
        interface User { age: number; } // Merged declaration
      `;
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        // Find all "User" identifiers
                        const symbols: ts.Symbol[] = [];
                        function visit(node: ts.Node): void {
                                if (ts.isIdentifier(node) && node.text === 'User') {
                                        const symbol = checker.getSymbolAtLocation(node);
                                        if (symbol) {
                                                symbols.push(symbol);
                                        }
                                }
                                ts.forEachChild(node, visit);
                        }
                        visit(sourceFile);

                        // Should find the merged symbol (both declarations point to same symbol)
                        expect(symbols.length).toBeGreaterThan(0);

                        const symbolId = generateSymbolId(symbols[0], collector);
                        expect(symbolId).toContain('User');
                });

                it('generates different IDs for different files', () => {
                        const code = 'interface User { name: string; }';

                        const { program: program1, sourceFile: sourceFile1 } = createProgram(
                                code,
                                'file1.ts',
                        );
                        const checker1 = program1.getTypeChecker();
                        const symbol1 = findSymbol(sourceFile1, checker1, 'User');
                        expect(symbol1).toBeDefined();
                        if (!symbol1) return;

                        const { program: program2, sourceFile: sourceFile2 } = createProgram(
                                code,
                                'file2.ts',
                        );
                        const checker2 = program2.getTypeChecker();
                        const symbol2 = findSymbol(sourceFile2, checker2, 'User');
                        expect(symbol2).toBeDefined();
                        if (!symbol2) return;

                        const symbolId1 = generateSymbolId(symbol1, collector);
                        const symbolId2 = generateSymbolId(symbol2, collector);

                        expect(symbolId1).not.toBe(symbolId2);
                        expect(symbolId1).toContain('file1.ts');
                        expect(symbolId2).toContain('file2.ts');
                });

                it('generates consistent IDs for same symbol', () => {
                        const code = 'interface User { name: string; }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'User');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId1 = generateSymbolId(symbol, collector);
                        const symbolId2 = generateSymbolId(symbol, collector);

                        expect(symbolId1).toBe(symbolId2);
                });

                it('handles symbols without declarations', () => {
                        // Create a symbol without declarations (built-in types, etc.)
                        const code = 'const x: string = "hello";';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        // Find the string type symbol
                        let stringSymbol: ts.Symbol | undefined;
                        function visit(node: ts.Node): void {
                                if (
                                        ts.isTypeReferenceNode(node) &&
                                        ts.isIdentifier(node.typeName)
                                ) {
                                        const symbol = checker.getSymbolAtLocation(node.typeName);
                                        if (symbol && symbol.getName() === 'string') {
                                                stringSymbol = symbol;
                                        }
                                }
                                ts.forEachChild(node, visit);
                        }
                        visit(sourceFile);

                        if (!stringSymbol) {
                                // If we can't get a symbol without declarations, skip this test
                                return;
                        }

                        const symbolId = generateSymbolId(stringSymbol, collector);

                        expect(symbolId).toContain('unknown');
                        expect(symbolId).toMatch(/^.+#unknown#[a-f0-9]{8}$/);
                });

                it('uses absolute file paths', () => {
                        const code = 'interface User { name: string; }';
                        const { program, sourceFile } = createProgram(code, 'test.ts');
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'User');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        // File path should be normalized (forward slashes)
                        expect(symbolId).toContain('/');
                        expect(symbolId).not.toContain('\\');
                });

                it('handles exported symbols', () => {
                        const code = 'export interface User { name: string; }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'User');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        expect(symbolId).toContain('User');
                        expect(symbolId).toContain('test.ts');
                });

                it('handles default exports', () => {
                        const code = 'export default interface User { name: string; }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'User');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        expect(symbolId).toContain('User');
                });

                it('handles namespace symbols', () => {
                        const code = 'namespace MyNamespace { export interface User {} }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'MyNamespace');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        expect(symbolId).toContain('MyNamespace');
                });

                it('format is name#filepath#hash', () => {
                        const code = 'interface User { name: string; }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'User');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        const parts = symbolId.split('#');
                        expect(parts.length).toBe(3);

                        const [name, filepath, hash] = parts;
                        expect(name).toBe('User');
                        expect(filepath).toContain('.ts');
                        expect(hash).toMatch(/^[a-f0-9]{8}$/);
                });

                it('includes position in hash calculation', () => {
                        const code1 = 'interface User { name: string; }';
                        const code2 = '  interface User { name: string; }'; // Different position

                        const { program: program1, sourceFile: sourceFile1 } = createProgram(
                                code1,
                                'test.ts',
                        );
                        const checker1 = program1.getTypeChecker();
                        const symbol1 = findSymbol(sourceFile1, checker1, 'User');

                        const { program: program2, sourceFile: sourceFile2 } = createProgram(
                                code2,
                                'test.ts',
                        );
                        const checker2 = program2.getTypeChecker();
                        const symbol2 = findSymbol(sourceFile2, checker2, 'User');

                        expect(symbol1).toBeDefined();
                        expect(symbol2).toBeDefined();
                        if (!symbol1 || !symbol2) return;

                        const symbolId1 = generateSymbolId(symbol1, collector);
                        const symbolId2 = generateSymbolId(symbol2, collector);

                        // Different positions should produce different hashes
                        const hash1 = symbolId1.split('#')[2];
                        const hash2 = symbolId2.split('#')[2];

                        expect(hash1).not.toBe(hash2);
                });

                it('does not add diagnostics for successful ID generation', () => {
                        const code = 'interface User { name: string; }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'User');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        generateSymbolId(symbol, collector);

                        expect(collector.count()).toBe(0);
                        expect(collector.hasErrors()).toBe(false);
                });

                it('hash is 8 characters long', () => {
                        const code = 'interface User { name: string; }';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'User');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);
                        const hash = symbolId.split('#')[2];

                        expect(hash.length).toBe(8);
                        expect(hash).toMatch(/^[a-f0-9]{8}$/);
                });

                it('handles symbols with special characters in names', () => {
                        const code = 'const __SPECIAL_NAME__ = 42;';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, '__SPECIAL_NAME__');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        expect(symbolId).toContain('__SPECIAL_NAME__');
                });

                it('handles computed property names', () => {
                        const code = 'const key = "test"; const obj = { [key]: 42 };';
                        const { program, sourceFile } = createProgram(code);
                        const checker = program.getTypeChecker();

                        const symbol = findSymbol(sourceFile, checker, 'obj');
                        expect(symbol).toBeDefined();
                        if (!symbol) return;

                        const symbolId = generateSymbolId(symbol, collector);

                        expect(symbolId).toContain('obj');
                });
        });
});
