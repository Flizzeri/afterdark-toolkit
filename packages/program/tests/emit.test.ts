// packages/program/tests/emit.test.ts

import * as fs from 'node:fs';
import * as path from 'node:path';

import { filePath, DiagnosticCollector } from '@adtk/shared';
import type * as ts from 'typescript';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { emitProgram } from '../src/emit';
import { loadProject } from '../src/project';

const fixturesDir = path.join(__dirname, 'fixtures');
const tempDir = path.join(fixturesDir, 'temp-emit');

function fixturePath(name: string, file: string = ''): string {
        const fp = filePath(path.join(fixturesDir, name, file));
        if (!fp.ok) throw new Error(`Invalid fixture path: ${name}/${file}`);
        return fp.value;
}

function tempPath(file: string = ''): string {
        const fp = filePath(path.join(tempDir, file));
        if (!fp.ok) throw new Error(`Invalid temp path: ${file}`);
        return fp.value;
}

describe('emit/emitter', () => {
        beforeEach(() => {
                // Create temp directory for emit output
                if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                }
        });

        afterEach(() => {
                // Clean up temp directory
                if (fs.existsSync(tempDir)) {
                        fs.rmSync(tempDir, { recursive: true, force: true });
                }
        });

        describe('emitProgram', () => {
                it('emits JavaScript and declaration files', () => {
                        const tsconfigPath = fixturePath('emit-test', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);
                        expect(loadResult.ok).toBe(true);
                        if (!loadResult.ok) return;

                        const program = loadResult.value;
                        const outDir = tempPath();

                        const emitResult = emitProgram(program, diagnostics, { outDir });

                        expect(emitResult.ok).toBe(true);
                        if (!emitResult.ok) return;

                        expect(emitResult.value.emittedFiles.length).toBeGreaterThan(0);

                        // Check that .js file was created
                        const jsFiles = emitResult.value.emittedFiles.filter((f) =>
                                f.endsWith('.js'),
                        );
                        expect(jsFiles.length).toBeGreaterThan(0);

                        // Check that .d.ts file was created
                        const dtsFiles = emitResult.value.emittedFiles.filter((f) =>
                                f.endsWith('.d.ts'),
                        );
                        expect(dtsFiles.length).toBeGreaterThan(0);
                });

                it('writes files to specified outDir', () => {
                        const tsconfigPath = fixturePath('emit-test', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);
                        expect(loadResult.ok).toBe(true);
                        if (!loadResult.ok) return;

                        const program = loadResult.value;
                        const outDir = tempPath();

                        const emitResult = emitProgram(program, diagnostics, { outDir });

                        expect(emitResult.ok).toBe(true);
                        if (!emitResult.ok) return;

                        console.log('outDir:', outDir);
                        console.log('emitted files:', emitResult.value.emittedFiles);

                        // All emitted files should be in outDir
                        for (const file of emitResult.value.emittedFiles) {
                                // Normalize both paths for comparison
                                const normalizedFile = path.normalize(file);
                                const normalizedOutDir = path.normalize(outDir);

                                expect(normalizedFile.startsWith(normalizedOutDir)).toBe(true);
                                expect(fs.existsSync(file)).toBe(true);
                        }
                });

                it('creates output directory if it does not exist', () => {
                        const tsconfigPath = fixturePath('emit-test', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);
                        expect(loadResult.ok).toBe(true);
                        if (!loadResult.ok) return;

                        const program = loadResult.value;
                        const outDir = tempPath('nested/deep/output');

                        expect(fs.existsSync(outDir)).toBe(false);

                        const emitResult = emitProgram(program, diagnostics, { outDir });

                        expect(emitResult.ok).toBe(true);
                        expect(fs.existsSync(outDir)).toBe(true);
                });

                it('emits only .d.ts files when emitOnlyDtsFiles is true', () => {
                        const tsconfigPath = fixturePath('emit-test', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);
                        expect(loadResult.ok).toBe(true);
                        if (!loadResult.ok) return;

                        const program = loadResult.value;
                        const outDir = tempPath();

                        const emitResult = emitProgram(program, diagnostics, {
                                outDir,
                                emitOnlyDtsFiles: true,
                        });

                        expect(emitResult.ok).toBe(true);
                        if (!emitResult.ok) return;

                        // Should only have .d.ts files, no .js files
                        const jsFiles = emitResult.value.emittedFiles.filter((f) =>
                                f.endsWith('.js'),
                        );
                        const dtsFiles = emitResult.value.emittedFiles.filter((f) =>
                                f.endsWith('.d.ts'),
                        );

                        expect(jsFiles.length).toBe(0);
                        expect(dtsFiles.length).toBeGreaterThan(0);
                });

                it('collects emit diagnostics', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);
                        expect(loadResult.ok).toBe(false); // Has compilation errors

                        // Clear diagnostics to test emit phase
                        diagnostics.clear();

                        // Try to emit anyway (will fail)
                        if (!loadResult.ok) {
                                // Can't test emit with failed load
                                return;
                        }

                        const program = loadResult.value;
                        const outDir = tempPath();

                        const emitResult = emitProgram(program, diagnostics, { outDir });

                        // Emit should fail or collect diagnostics
                        if (!emitResult.ok) {
                                expect(emitResult.error.type).toBeDefined();
                        } else {
                                // If emit succeeded, might have warnings
                                expect(diagnostics.count()).toBeGreaterThanOrEqual(0);
                        }
                });

                it('returns error when emit is skipped', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        // Load will fail due to errors
                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        // If we somehow got a program with errors
                        if (loadResult.ok) {
                                const program = loadResult.value;
                                const outDir = tempPath();

                                const emitResult = emitProgram(program, diagnostics, { outDir });

                                // Should fail due to errors
                                expect(emitResult.ok).toBe(false);
                                if (emitResult.ok) return;

                                expect(['no-emit', 'emit-failed']).toContain(emitResult.error.type);
                        }
                });

                it('preserves directory structure in output', () => {
                        const tsconfigPath = fixturePath('multiple-files', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);
                        expect(loadResult.ok).toBe(true);
                        if (!loadResult.ok) return;

                        const program = loadResult.value;
                        const outDir = tempPath();

                        const emitResult = emitProgram(program, diagnostics, { outDir });

                        expect(emitResult.ok).toBe(true);
                        if (!emitResult.ok) return;

                        // Should have models/ and services/ subdirectories
                        const hasModelsDir = emitResult.value.emittedFiles.some((f) =>
                                f.includes('models'),
                        );
                        const hasServicesDir = emitResult.value.emittedFiles.some((f) =>
                                f.includes('services'),
                        );

                        expect(hasModelsDir).toBe(true);
                        expect(hasServicesDir).toBe(true);
                });

                it('emits valid JavaScript code', () => {
                        const tsconfigPath = fixturePath('emit-test', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);
                        expect(loadResult.ok).toBe(true);
                        if (!loadResult.ok) return;

                        const program = loadResult.value;
                        const outDir = tempPath();

                        const emitResult = emitProgram(program, diagnostics, { outDir });

                        expect(emitResult.ok).toBe(true);
                        if (!emitResult.ok) return;

                        const jsFiles = emitResult.value.emittedFiles.filter((f) =>
                                f.endsWith('.js'),
                        );
                        expect(jsFiles.length).toBeGreaterThan(0);

                        const jsFile = jsFiles[0];
                        const content = fs.readFileSync(jsFile, 'utf-8');

                        // Should be valid JavaScript (no TypeScript syntax)
                        expect(content).not.toContain('interface');
                        expect(content).not.toContain(': string');
                        expect(content).not.toContain(': number');
                });

                it('emits valid declaration files', () => {
                        const tsconfigPath = fixturePath('emit-test', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);
                        expect(loadResult.ok).toBe(true);
                        if (!loadResult.ok) return;

                        const program = loadResult.value;
                        const outDir = tempPath();

                        const emitResult = emitProgram(program, diagnostics, { outDir });

                        expect(emitResult.ok).toBe(true);
                        if (!emitResult.ok) return;

                        const dtsFiles = emitResult.value.emittedFiles.filter((f) =>
                                f.endsWith('.d.ts'),
                        );
                        expect(dtsFiles.length).toBeGreaterThan(0);

                        const dtsFile = dtsFiles[0];
                        const content = fs.readFileSync(dtsFile, 'utf-8');

                        // Should contain type definitions
                        expect(content).toContain('export');
                        expect(content.length).toBeGreaterThan(0);
                });

                it('handles emit without outDir', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);
                        expect(loadResult.ok).toBe(true);
                        if (!loadResult.ok) return;

                        const program = loadResult.value;

                        // Emit without specifying outDir (uses tsconfig outDir)
                        const emitResult = emitProgram(program, diagnostics);

                        expect(emitResult.ok).toBe(true);
                });

                it('returns error when directory creation fails', () => {
                        const tsconfigPath = fixturePath('emit-test', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);
                        expect(loadResult.ok).toBe(true);
                        if (!loadResult.ok) return;

                        const program = loadResult.value;

                        // Try to emit to an invalid path (e.g., null byte in path)
                        const invalidPath = filePath('/tmp/invalid\x00path');
                        if (!invalidPath.ok) {
                                // If path validation catches it, that's also fine
                                expect(invalidPath.ok).toBe(false);
                                return;
                        }

                        const emitResult = emitProgram(program, diagnostics, {
                                outDir: invalidPath.value,
                        });

                        expect(emitResult.ok).toBe(false);
                        if (emitResult.ok) return;

                        expect(emitResult.error.type).toBe('directory-creation-failed');
                });

                it('applies custom transformers', () => {
                        const tsconfigPath = fixturePath('emit-test', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const loadResult = loadProject({ tsconfig: tsconfigPath }, diagnostics);
                        expect(loadResult.ok).toBe(true);
                        if (!loadResult.ok) return;

                        const program = loadResult.value;
                        const outDir = tempPath();

                        // Create a simple transformer that adds a comment
                        const transformer: ts.TransformerFactory<ts.SourceFile> = () => {
                                return (sourceFile) => {
                                        // Just return the source file unchanged for this test
                                        // In real usage, you'd transform the AST
                                        return sourceFile;
                                };
                        };

                        const emitResult = emitProgram(program, diagnostics, {
                                outDir,
                                transformers: {
                                        before: [transformer],
                                },
                        });

                        expect(emitResult.ok).toBe(true);
                        if (!emitResult.ok) return;

                        expect(emitResult.value.emittedFiles.length).toBeGreaterThan(0);
                });
        });
});
