// packages/program/src/project/loader.ts

import { ok, err, type DiagnosticCollector, type Result, type FilePath } from '@adtk/shared';
import * as ts from 'typescript';

import { parseTsConfig, resolveRootFiles } from './config.js';
import type { ProjectConfig, LoadOptions, LoadError } from './types.js';
import { convertDiagnostics } from '../diagnostics';
import type { Program } from '../program/types.js';
import { ProgramWrapper } from '../program/wrapper.js';

export function loadProject(
        config: ProjectConfig,
        diagnostics: DiagnosticCollector,
        options: LoadOptions = {},
): Result<Program, LoadError> {
        if (config.tsconfig) {
                return loadFromTsConfig(config.tsconfig, diagnostics, options);
        }

        if (config.rootFiles && config.rootFiles.length > 0) {
                return loadFromRootFiles(
                        config.rootFiles,
                        config.compilerOptions,
                        diagnostics,
                        options,
                );
        }

        return err({
                type: 'no-input-files',
                message: 'Either tsconfig or rootFiles must be provided',
        });
}

function loadFromTsConfig(
        tsconfigPath: FilePath,
        diagnostics: DiagnosticCollector,
        options: LoadOptions,
): Result<Program, LoadError> {
        const parseResult = parseTsConfig(tsconfigPath);
        if (!parseResult.ok) {
                return parseResult;
        }

        const parsed = parseResult.value;

        const program = ts.createProgram({
                rootNames: parsed.fileNames,
                options: parsed.options,
        });

        if (!program) {
                return err({
                        type: 'program-creation-failed',
                        message: 'Failed to create TypeScript program',
                });
        }

        const tsDiagnostics = [
                ...program.getOptionsDiagnostics(),
                ...program.getSyntacticDiagnostics(),
                ...program.getSemanticDiagnostics(),
        ];

        convertDiagnostics(tsDiagnostics, diagnostics);

        if (diagnostics.hasErrors()) {
                return err({
                        type: 'compilation-errors',
                        message: `TypeScript compilation failed with ${diagnostics.countByCategory('error')} error(s)`,
                });
        }

        return ok(new ProgramWrapper(program, options));
}

function loadFromRootFiles(
        rootFiles: readonly FilePath[],
        compilerOptions: ts.CompilerOptions = {},
        diagnostics: DiagnosticCollector,
        options: LoadOptions,
): Result<Program, LoadError> {
        const resolveResult = resolveRootFiles(rootFiles);
        if (!resolveResult.ok) {
                return resolveResult;
        }

        const program = ts.createProgram({
                rootNames: resolveResult.value,
                options: {
                        ...getDefaultCompilerOptions(),
                        ...compilerOptions,
                },
        });

        if (!program) {
                return err({
                        type: 'program-creation-failed',
                        message: 'Failed to create TypeScript program',
                });
        }

        const tsDiagnostics = [
                ...program.getOptionsDiagnostics(),
                ...program.getSyntacticDiagnostics(),
                ...program.getSemanticDiagnostics(),
        ];

        convertDiagnostics(tsDiagnostics, diagnostics);

        if (diagnostics.hasErrors()) {
                return err({
                        type: 'compilation-errors',
                        message: `TypeScript compilation failed with ${diagnostics.countByCategory('error')} error(s)`,
                });
        }

        return ok(new ProgramWrapper(program, options));
}

function getDefaultCompilerOptions(): ts.CompilerOptions {
        return {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ESNext,
                moduleResolution: ts.ModuleResolutionKind.Bundler,
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
        };
}
