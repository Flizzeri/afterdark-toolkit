// packages/program/src/watch/watcher.ts

import { filePath, DiagnosticCollector, ok, err, type FilePath, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import { convertDiagnostics } from '../diagnostics';
import type { WatchConfig, WatchProgram, WatchError } from './types.js';
import { ProgramWrapper } from '../program/wrapper';

const TS_DIAGNOSTIC_STARTING_COMPILATION = 6031;
const TS_DIAGNOSTIC_FILE_CHANGE_DETECTED = 6032;

export function createWatchProgram(config: WatchConfig): Result<WatchProgram, WatchError> {
        if (!config.projectConfig.tsconfig) {
                return err({
                        type: 'missing-tsconfig',
                        message: 'Watch mode requires a tsconfig.json path',
                });
        }

        const loadOptions = config.loadOptions ?? {};
        const previousSourceFiles = new Map<FilePath, string>();
        let isFirstCompile = true;
        let compilationStartTime = 0;

        const host = ts.createWatchCompilerHost(
                config.projectConfig.tsconfig,
                {},
                ts.sys,
                ts.createSemanticDiagnosticsBuilderProgram,
                (diagnostic) => reportDiagnostic(diagnostic),
                (diagnostic) => reportWatchStatus(diagnostic),
        );

        const originalAfterProgramCreate = host.afterProgramCreate;

        host.afterProgramCreate = (builderProgram): void => {
                const tsProgram = builderProgram.getProgram();
                const program = new ProgramWrapper(tsProgram, loadOptions);

                const changedFiles: FilePath[] = [];

                for (const sourceFile of tsProgram.getSourceFiles()) {
                        if (loadOptions.skipLibFiles && sourceFile.isDeclarationFile) {
                                continue;
                        }

                        const filePathResult = filePath(sourceFile.fileName);
                        if (!filePathResult.ok) continue;

                        const fp = filePathResult.value;
                        const currentText = sourceFile.text;
                        const previousText = previousSourceFiles.get(fp);

                        if (previousText === undefined) {
                                previousSourceFiles.set(fp, currentText);
                                if (!isFirstCompile) {
                                        changedFiles.push(fp);
                                }
                        } else if (previousText !== currentText) {
                                changedFiles.push(fp);
                                previousSourceFiles.set(fp, currentText);
                        }
                }

                for (const [fp] of previousSourceFiles) {
                        const stillExists = tsProgram.getSourceFile(fp);
                        if (!stillExists) {
                                changedFiles.push(fp);
                                previousSourceFiles.delete(fp);
                        }
                }

                const duration = Date.now() - compilationStartTime;

                if (isFirstCompile) {
                        isFirstCompile = false;
                }

                config.onStatusChange?.({ type: 'compiled', duration });
                config.onProgramUpdate(program, changedFiles);

                originalAfterProgramCreate?.(builderProgram);
        };

        function reportDiagnostic(diagnostic: ts.Diagnostic): void {
                const collector = new DiagnosticCollector();
                convertDiagnostics([diagnostic], collector);
                if (config.onDiagnostics) {
                        config.onDiagnostics(collector);
                }
        }

        function reportWatchStatus(diagnostic: ts.Diagnostic): void {
                if (diagnostic.code === TS_DIAGNOSTIC_STARTING_COMPILATION) {
                        config.onStatusChange?.({ type: 'starting' });
                } else if (diagnostic.code === TS_DIAGNOSTIC_FILE_CHANGE_DETECTED) {
                        compilationStartTime = Date.now();
                        config.onStatusChange?.({ type: 'compiling', files: [] });
                }
        }

        let watchProgram: ts.WatchOfConfigFile<ts.SemanticDiagnosticsBuilderProgram>;

        try {
                watchProgram = ts.createWatchProgram(host);
        } catch (error) {
                return err({
                        type: 'watch-setup-failed',
                        reason: error instanceof Error ? error.message : String(error),
                });
        }

        return ok({
                getCurrentProgram: () => {
                        const tsProgram = watchProgram.getProgram().getProgram();
                        return new ProgramWrapper(tsProgram, loadOptions);
                },
                close: () => {
                        watchProgram.close();
                },
        });
}
