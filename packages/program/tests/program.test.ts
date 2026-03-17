// packages/program/tests/program.test.ts

import * as path from 'node:path';

import { filePath, DiagnosticCollector } from '@adtk/shared';
import { describe, it, expect } from 'vitest';

import { loadProject } from '../src/project';

const fixturesDir = path.join(__dirname, 'fixtures');

function fixturePath(name: string, file: string = ''): string {
        const fp = filePath(path.join(fixturesDir, name, file));
        if (!fp.ok) throw new Error(`Invalid fixture path: ${name}/${file}`);
        return fp.value;
}

describe('program/wrapper', () => {
        describe('Program', () => {
                it('returns all source files', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFiles = program.getSourceFiles();

                        expect(sourceFiles.length).toBeGreaterThan(0);
                        expect(sourceFiles.every((f) => f.fileName)).toBe(true);
                        expect(sourceFiles.every((f) => typeof f.text === 'string')).toBe(true);
                });

                it('returns specific source file by path', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const typesPath = fixturePath('simple-project/src', 'types.ts');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFile = program.getSourceFile(typesPath);

                        expect(sourceFile).toBeDefined();
                        expect(sourceFile?.fileName).toBe(typesPath);
                        expect(sourceFile?.text).toContain('interface User');
                });

                it('returns undefined for non-existent source file', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const nonExistentPath = fixturePath(
                                'simple-project/src',
                                'non-existent.ts',
                        );
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFile = program.getSourceFile(nonExistentPath);

                        expect(sourceFile).toBeUndefined();
                });

                it('caches source file wrappers', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const typesPath = fixturePath('simple-project/src', 'types.ts');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFile1 = program.getSourceFile(typesPath);
                        const sourceFile2 = program.getSourceFile(typesPath);

                        // Should return same instance (reference equality)
                        expect(sourceFile1).toBe(sourceFile2);
                });

                it('provides access to type checker', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const typeChecker = program.getTypeChecker();

                        expect(typeChecker).toBeDefined();
                        // TypeChecker should have expected methods
                        expect(typeof typeChecker.getTypeAtLocation).toBe('function');
                        expect(typeof typeChecker.getSymbolAtLocation).toBe('function');
                });

                it('returns root file names', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const rootFileNames = program.getRootFileNames();

                        expect(rootFileNames.length).toBeGreaterThan(0);
                        expect(rootFileNames.some((f) => f.includes('types.ts'))).toBe(true);
                });

                it('returns compiler options', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const options = program.getCompilerOptions();

                        expect(options).toBeDefined();
                        expect(options.target).toBeDefined();
                        expect(options.module).toBeDefined();
                });

                it('filters out lib files when skipLibFiles is true', () => {
                        const tsconfigPath = fixturePath('lib-files', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics, {
                                skipLibFiles: true,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFiles = program.getSourceFiles();

                        // Should not include any lib.*.d.ts files
                        expect(sourceFiles.every((f) => !f.fileName.includes('lib.'))).toBe(true);
                        // Should include our source file
                        expect(sourceFiles.some((f) => f.fileName.includes('code.ts'))).toBe(true);
                });

                it('handles multiple calls to getSourceFiles efficiently', () => {
                        const tsconfigPath = fixturePath('multiple-files', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();
                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;

                        const files1 = program.getSourceFiles();
                        const files2 = program.getSourceFiles();

                        // Should return equivalent arrays
                        expect(files1.length).toBe(files2.length);

                        // Files with same path should be same instance (cached)
                        const file1 = files1.find((f) => f.fileName.includes('user.ts'));
                        const file2 = files2.find((f) => f.fileName.includes('user.ts'));
                        expect(file1).toBe(file2);
                });
        });
});
