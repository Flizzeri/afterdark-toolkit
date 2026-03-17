// packages/program/tests/source.test.ts

import * as path from 'node:path';

import { filePath, DiagnosticCollector } from '@adtk/shared';
import * as ts from 'typescript';
import { describe, it, expect } from 'vitest';

import { loadProject } from '../src/project';

const fixturesDir = path.join(__dirname, 'fixtures');

function fixturePath(name: string, file: string = ''): string {
        const fp = filePath(path.join(fixturesDir, name, file));
        if (!fp.ok) throw new Error(`Invalid fixture path: ${name}/${file}`);
        return fp.value;
}

describe('source/wrapper', () => {
        describe('SourceFile', () => {
                it('has fileName property', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFiles = program.getSourceFiles();
                        const sourceFile = sourceFiles[0];

                        expect(sourceFile.fileName).toBeDefined();
                        expect(typeof sourceFile.fileName).toBe('string');
                        expect(sourceFile.fileName.length).toBeGreaterThan(0);
                });

                it('has text property with source code', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const typesPath = fixturePath('simple-project/src', 'types.ts');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFile = program.getSourceFile(typesPath);

                        expect(sourceFile).toBeDefined();
                        expect(sourceFile?.text).toBeDefined();
                        expect(sourceFile?.text).toContain('interface User');
                        expect(sourceFile?.text).toContain('export type UserStatus');
                });

                it('creates source spans for nodes', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const typesPath = fixturePath('simple-project/src', 'types.ts');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFile = program.getSourceFile(typesPath);

                        expect(sourceFile).toBeDefined();
                        if (!sourceFile) return;

                        // Get TypeScript AST to find a node
                        const tsProgram = program.tsProgram as ts.Program;
                        const tsSourceFile = tsProgram.getSourceFile(typesPath);
                        expect(tsSourceFile).toBeDefined();
                        if (!tsSourceFile) return;

                        // Find the User interface declaration
                        let userInterface: ts.InterfaceDeclaration | undefined;
                        ts.forEachChild(tsSourceFile, (node) => {
                                if (ts.isInterfaceDeclaration(node) && node.name.text === 'User') {
                                        userInterface = node;
                                }
                        });

                        expect(userInterface).toBeDefined();
                        if (!userInterface) return;

                        const span = sourceFile.getSpan(userInterface);

                        expect(span).toBeDefined();
                        expect(span.file).toBe(typesPath);
                        expect(span.start.line).toBeGreaterThan(0);
                        expect(span.start.column).toBeGreaterThan(0);
                        expect(span.end.line).toBeGreaterThanOrEqual(span.start.line);
                        expect(span.start.offset).toBeGreaterThanOrEqual(0);
                        expect(span.end.offset).toBeGreaterThan(span.start.offset);
                });

                it('creates positions from offsets', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const typesPath = fixturePath('simple-project/src', 'types.ts');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFile = program.getSourceFile(typesPath);

                        expect(sourceFile).toBeDefined();
                        if (!sourceFile) return;

                        // Get position at offset 0 (start of file)
                        const pos0 = sourceFile.getPosition(0);
                        expect(pos0.line).toBe(1);
                        expect(pos0.column).toBe(1);
                        expect(pos0.offset).toBe(0);

                        // Get position at some offset in the middle
                        const offset = 100;
                        const pos100 = sourceFile.getPosition(offset);
                        expect(pos100.line).toBeGreaterThan(0);
                        expect(pos100.column).toBeGreaterThan(0);
                        expect(pos100.offset).toBe(offset);
                });

                it('uses 1-indexed line and column numbers', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const typesPath = fixturePath('simple-project/src', 'types.ts');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFile = program.getSourceFile(typesPath);

                        expect(sourceFile).toBeDefined();
                        if (!sourceFile) return;

                        const position = sourceFile.getPosition(0);

                        // First line and column should be 1, not 0 (LSP convention)
                        expect(position.line).toBe(1);
                        expect(position.column).toBe(1);
                });

                it('creates accurate spans for multi-line nodes', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const typesPath = fixturePath('simple-project/src', 'types.ts');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFile = program.getSourceFile(typesPath);

                        expect(sourceFile).toBeDefined();
                        if (!sourceFile) return;

                        // Get TypeScript AST
                        const tsProgram = program.tsProgram as ts.Program;
                        const tsSourceFile = tsProgram.getSourceFile(typesPath);
                        expect(tsSourceFile).toBeDefined();
                        if (!tsSourceFile) return;

                        // Find the User interface (multi-line)
                        let userInterface: ts.InterfaceDeclaration | undefined;
                        ts.forEachChild(tsSourceFile, (node) => {
                                if (ts.isInterfaceDeclaration(node) && node.name.text === 'User') {
                                        userInterface = node;
                                }
                        });

                        expect(userInterface).toBeDefined();
                        if (!userInterface) return;

                        const span = sourceFile.getSpan(userInterface);

                        // Interface spans multiple lines
                        expect(span.end.line).toBeGreaterThan(span.start.line);

                        // Start and end should have different offsets
                        expect(span.end.offset).toBeGreaterThan(span.start.offset);

                        // The span should cover the interface definition
                        const spanText = sourceFile.text.substring(
                                span.start.offset,
                                span.end.offset,
                        );
                        expect(spanText).toContain('interface User');
                        expect(spanText).toContain('id: string');
                        expect(spanText).toContain('name: string');
                });

                it('handles nodes at different positions in file', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const typesPath = fixturePath('simple-project/src', 'types.ts');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFile = program.getSourceFile(typesPath);

                        expect(sourceFile).toBeDefined();
                        if (!sourceFile) return;

                        // Get TypeScript AST
                        const tsProgram = program.tsProgram as ts.Program;
                        const tsSourceFile = tsProgram.getSourceFile(typesPath);
                        expect(tsSourceFile).toBeDefined();
                        if (!tsSourceFile) return;

                        const declarations: ts.Node[] = [];
                        ts.forEachChild(tsSourceFile, (node) => {
                                if (
                                        ts.isInterfaceDeclaration(node) ||
                                        ts.isTypeAliasDeclaration(node)
                                ) {
                                        declarations.push(node);
                                }
                        });

                        expect(declarations.length).toBeGreaterThan(1);

                        // Get spans for all declarations
                        const spans = declarations.map((decl) => sourceFile.getSpan(decl));

                        // Spans should be in order (start positions increase)
                        for (let i = 1; i < spans.length; i++) {
                                expect(spans[i].start.offset).toBeGreaterThan(
                                        spans[i - 1].start.offset,
                                );
                        }

                        // Spans should not overlap
                        for (let i = 1; i < spans.length; i++) {
                                expect(spans[i].start.offset).toBeGreaterThanOrEqual(
                                        spans[i - 1].end.offset,
                                );
                        }
                });
        });
});
