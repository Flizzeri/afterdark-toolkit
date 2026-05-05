// packages/program/src/emit/emitter.ts

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
        ok,
        err,
        filePath,
        type Result,
        type FilePath,
        type DiagnosticCollector,
} from '@adtk/shared';
import type * as ts from 'typescript';

import { ProgramDiagnostics } from '../codes.js';
import { convertDiagnostics } from '../diagnostics';
import type { Program } from '../program';
import type { EmitConfig, EmitResult, EmitError } from './types.js';

export function emitProgram(
        program: Program,
        diagnostics: DiagnosticCollector,
        config: EmitConfig = {},
): Result<EmitResult, EmitError> {
        if (config.outDir) {
                const outDirResult = ensureDirectoryExists(config.outDir);
                if (!outDirResult.ok) {
                        return err({
                                type: 'directory-creation-failed',
                                path: config.outDir,
                                reason: outDirResult.error,
                        });
                }
        }

        const emittedFiles: FilePath[] = [];
        let writeError: { path: string; reason: string } | undefined;

        const writeFile: ts.WriteFileCallback = (fileName, data) => {
                if (writeError) return;

                try {
                        let targetFileName = fileName;

                        // Rewrite output path if custom outDir provided
                        if (config.outDir) {
                                const compilerOptions = program.getCompilerOptions();

                                if (compilerOptions.outDir) {
                                        // Replace compiler's outDir with ours
                                        const relativeToOutDir = path.relative(
                                                path.resolve(compilerOptions.outDir),
                                                path.resolve(fileName),
                                        );
                                        targetFileName = path.join(config.outDir, relativeToOutDir);
                                } else {
                                        // No compiler outDir - files would be next to source
                                        // Preserve directory structure relative to rootDir or first file
                                        const rootDir =
                                                compilerOptions.rootDir ||
                                                path.dirname(program.getRootFileNames()[0] || '');
                                        const relativeToRoot = path.relative(
                                                path.resolve(rootDir),
                                                path.resolve(fileName),
                                        );
                                        targetFileName = path.join(config.outDir, relativeToRoot);
                                }
                        }

                        const dir = path.dirname(targetFileName);
                        fs.mkdirSync(dir, { recursive: true });
                        fs.writeFileSync(targetFileName, data, 'utf-8');

                        const filePathResult = filePath(targetFileName);
                        if (filePathResult.ok) {
                                emittedFiles.push(filePathResult.value);
                        }
                } catch (error) {
                        writeError = {
                                path: fileName,
                                reason: error instanceof Error ? error.message : String(error),
                        };
                }
        };

        let emitResult: ts.EmitResult;
        try {
                emitResult = program.emit(
                        undefined,
                        writeFile,
                        undefined,
                        config.emitOnlyDtsFiles,
                        config.transformers,
                );
        } catch (error) {
                diagnostics.add(
                        ProgramDiagnostics.EMIT_CRASHED.new(
                                error instanceof Error ? error.message : String(error),
                        ),
                );
                // Fatal diagnostic throws, but TypeScript doesn't know that
                // Return here to satisfy type checker (unreachable in practice)
                return err({
                        type: 'emit-failed',
                        message: 'Emit crashed (unreachable)',
                });
        }

        if (writeError) {
                const filePathResult = filePath(writeError.path);
                return err({
                        type: 'write-failed',
                        path: filePathResult.ok
                                ? filePathResult.value
                                : (writeError.path as FilePath),
                        reason: writeError.reason,
                });
        }

        convertDiagnostics(emitResult.diagnostics, diagnostics);

        if (emitResult.emitSkipped) {
                return err({
                        type: 'no-emit',
                        message: 'TypeScript skipped emit',
                });
        }

        if (diagnostics.hasErrors()) {
                return err({
                        type: 'emit-failed',
                        message: `Emit failed with ${diagnostics.countByCategory('error')} error(s)`,
                });
        }

        return ok({
                emittedFiles,
        });
}

function ensureDirectoryExists(dir: FilePath): Result<void, string> {
        try {
                if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                }
                return ok(undefined);
        } catch (error) {
                return err(error instanceof Error ? error.message : String(error));
        }
}
