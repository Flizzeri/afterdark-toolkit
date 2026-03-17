// packages/program/tests/project.test.ts

import * as path from 'node:path';

import { filePath, DiagnosticCollector } from '@adtk/shared';
import { describe, it, expect } from 'vitest';

import { loadProject, parseTsConfig, findTsConfig } from '../src/project';

const fixturesDir = path.join(__dirname, 'fixtures');

function fixturePath(name: string, file: string = ''): string {
        const fp = filePath(path.join(fixturesDir, name, file));
        if (!fp.ok) throw new Error(`Invalid fixture path: ${name}/${file}`);
        return fp.value;
}

describe('project/config', () => {
        describe('parseTsConfig', () => {
                it('parses valid tsconfig.json', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const result = parseTsConfig(tsconfigPath);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        expect(result.value.options.target).toBeDefined();
                        expect(result.value.options.module).toBeDefined();
                        expect(result.value.fileNames.length).toBeGreaterThan(0);
                });

                it('returns error for non-existent tsconfig', () => {
                        const tsconfigPath = fixturePath('non-existent', 'tsconfig.json');
                        const result = parseTsConfig(tsconfigPath);

                        expect(result.ok).toBe(false);
                        if (result.ok) return;

                        expect(result.error.type).toBe('tsconfig-not-found');
                        expect(result.error.message).toContain('not found');
                });

                it('returns error for invalid tsconfig', () => {
                        const tsconfigPath = fixturePath('invalid-tsconfig', 'tsconfig.json');
                        const result = parseTsConfig(tsconfigPath);

                        expect(result.ok).toBe(false);
                        if (result.ok) return;

                        expect(result.error.type).toBe('tsconfig-parse-error');
                });

                it('resolves extends correctly', () => {
                        const tsconfigPath = fixturePath('nested-tsconfig/src', 'tsconfig.json');
                        const result = parseTsConfig(tsconfigPath);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        // Should inherit target from parent and add strict
                        expect(result.value.options.target).toBeDefined();
                        expect(result.value.options.strict).toBe(true);
                });

                it('includes files based on include pattern', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const result = parseTsConfig(tsconfigPath);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const fileNames = result.value.fileNames;
                        expect(fileNames.some((f) => f.includes('types.ts'))).toBe(true);
                        expect(fileNames.some((f) => f.includes('utils.ts'))).toBe(true);
                });

                it('excludes files based on exclude pattern', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const result = parseTsConfig(tsconfigPath);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const fileNames = result.value.fileNames;
                        expect(fileNames.some((f) => f.includes('node_modules'))).toBe(false);
                        expect(fileNames.some((f) => f.includes('dist'))).toBe(false);
                });
        });

        describe('findTsConfig', () => {
                it('finds tsconfig.json in current directory', () => {
                        const startDir = fixturePath('simple-project');
                        const result = findTsConfig(startDir);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        expect(result.value).toContain('simple-project');
                        expect(result.value).toContain('tsconfig.json');
                });

                it('finds tsconfig.json in parent directory', () => {
                        const startDir = fixturePath('simple-project/src');
                        const result = findTsConfig(startDir);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        expect(result.value).toContain('simple-project');
                        expect(result.value).toContain('tsconfig.json');
                });
        });
});

describe('project/loader', () => {
        describe('loadProject', () => {
                it('loads project from valid tsconfig', () => {
                        const tsconfigPath = fixturePath('simple-project', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        expect(diagnostics.hasErrors()).toBe(false);

                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFiles = program.getSourceFiles();

                        expect(sourceFiles.length).toBeGreaterThan(0);
                        expect(sourceFiles.some((f) => f.fileName.includes('types.ts'))).toBe(true);
                });

                it('loads project from root files', () => {
                        const typesFile = fixturePath('simple-project/src', 'types.ts');
                        const utilsFile = fixturePath('simple-project/src', 'utils.ts');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject(
                                { rootFiles: [typesFile, utilsFile] },
                                diagnostics,
                        );

                        expect(result.ok).toBe(true);
                        expect(diagnostics.hasErrors()).toBe(false);

                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFiles = program.getSourceFiles();

                        expect(sourceFiles.length).toBeGreaterThan(0);
                });

                it('collects TypeScript compiler diagnostics', () => {
                        const tsconfigPath = fixturePath('compiler-errors', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(false);
                        expect(diagnostics.hasErrors()).toBe(true);

                        const errors = diagnostics.getErrors();
                        expect(errors.length).toBeGreaterThan(0);

                        // Check that we got actual TypeScript errors
                        expect(errors.some((e) => e.code.startsWith('ADTK-TS-'))).toBe(true);
                }, 10000);

                it('returns error when neither tsconfig nor rootFiles provided', () => {
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject({}, diagnostics);

                        expect(result.ok).toBe(false);
                        if (result.ok) return;

                        expect(result.error.type).toBe('no-input-files');
                });

                it('returns error for non-existent root file', () => {
                        const nonExistentFile = fixturePath('non-existent', 'file.ts');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject({ rootFiles: [nonExistentFile] }, diagnostics);

                        expect(result.ok).toBe(false);
                        if (result.ok) return;

                        expect(result.error.type).toBe('no-input-files');
                });

                it('skips lib files when skipLibFiles option is true', () => {
                        const tsconfigPath = fixturePath('lib-files', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics, {
                                skipLibFiles: true,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;

                        const sourceFiles = program.getSourceFiles();

                        // Should not include lib.d.ts files
                        expect(sourceFiles.some((f) => f.fileName.includes('lib.'))).toBe(false);

                        // Should include our actual source file
                        expect(sourceFiles.some((f) => f.fileName.includes('code.ts'))).toBe(true);
                });

                it('includes lib files when skipLibFiles is false', () => {
                        const tsconfigPath = fixturePath('lib-files', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics, {
                                skipLibFiles: false,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFiles = program.getSourceFiles();

                        // Should include lib.d.ts files
                        expect(sourceFiles.some((f) => f.fileName.includes('lib.'))).toBe(true);
                });

                it('handles circular type references', () => {
                        const tsconfigPath = fixturePath('circular-refs', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        expect(diagnostics.hasErrors()).toBe(false);

                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFiles = program.getSourceFiles();

                        expect(sourceFiles.some((f) => f.fileName.includes('a.ts'))).toBe(true);
                        expect(sourceFiles.some((f) => f.fileName.includes('b.ts'))).toBe(true);
                });

                it('loads multiple files correctly', () => {
                        const tsconfigPath = fixturePath('multiple-files', 'tsconfig.json');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject({ tsconfig: tsconfigPath }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const sourceFiles = program.getSourceFiles();

                        expect(sourceFiles.some((f) => f.fileName.includes('models/user.ts'))).toBe(
                                true,
                        );
                        expect(sourceFiles.some((f) => f.fileName.includes('models/post.ts'))).toBe(
                                true,
                        );
                        expect(
                                sourceFiles.some((f) =>
                                        f.fileName.includes('services/user-service.ts'),
                                ),
                        ).toBe(true);
                        expect(sourceFiles.some((f) => f.fileName.includes('index.ts'))).toBe(true);
                });

                it('applies default compiler options when loading from root files', () => {
                        const typesFile = fixturePath('simple-project/src', 'types.ts');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject({ rootFiles: [typesFile] }, diagnostics);

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const options = program.getCompilerOptions();

                        // Should have default options applied
                        expect(options.target).toBeDefined();
                        expect(options.module).toBeDefined();
                        expect(options.strict).toBe(true);
                });

                it('merges provided compiler options with defaults', () => {
                        const typesFile = fixturePath('simple-project/src', 'types.ts');
                        const diagnostics = new DiagnosticCollector();

                        const result = loadProject(
                                {
                                        rootFiles: [typesFile],
                                        compilerOptions: {
                                                declaration: true,
                                                declarationMap: true,
                                        },
                                },
                                diagnostics,
                        );

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const program = result.value;
                        const options = program.getCompilerOptions();

                        // Should have custom options
                        expect(options.declaration).toBe(true);
                        expect(options.declarationMap).toBe(true);

                        // Should still have defaults
                        expect(options.strict).toBe(true);
                });
        });
});
