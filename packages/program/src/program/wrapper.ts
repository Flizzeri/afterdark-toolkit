// packages/program/src/program/wrapper.ts

import { filePath, type FilePath } from '@adtk/shared';
import type * as ts from 'typescript';

import type { Program } from './types.js';
import type { LoadOptions } from '../project';
import { SourceFileWrapper, type SourceFile } from '../source';

export class ProgramWrapper implements Program {
        private sourceFileCache = new Map<FilePath, SourceFile>();

        public constructor(
                private readonly tsProgram: ts.Program,
                private readonly options: LoadOptions,
        ) {}

        public getSourceFiles(): readonly SourceFile[] {
                const files: SourceFile[] = [];

                for (const tsSourceFile of this.tsProgram.getSourceFiles()) {
                        if (this.options.skipLibFiles && tsSourceFile.isDeclarationFile) {
                                continue;
                        }

                        const filePathResult = filePath(tsSourceFile.fileName);
                        if (!filePathResult.ok) continue;

                        const fp = filePathResult.value;
                        let wrapped = this.sourceFileCache.get(fp);

                        if (!wrapped) {
                                wrapped = new SourceFileWrapper(tsSourceFile);
                                this.sourceFileCache.set(fp, wrapped);
                        }

                        files.push(wrapped);
                }

                return files;
        }

        public getSourceFile(fileName: FilePath): SourceFile | undefined {
                const cached = this.sourceFileCache.get(fileName);
                if (cached) return cached;

                const tsSourceFile = this.tsProgram.getSourceFile(fileName);
                if (!tsSourceFile) return undefined;

                const wrapped = new SourceFileWrapper(tsSourceFile);
                this.sourceFileCache.set(fileName, wrapped);
                return wrapped;
        }

        public getTypeChecker(): ts.TypeChecker {
                return this.tsProgram.getTypeChecker();
        }

        public getRootFileNames(): readonly FilePath[] {
                const rootNames = this.tsProgram.getRootFileNames();
                const result: FilePath[] = [];

                for (const name of rootNames) {
                        const fp = filePath(name);
                        if (fp.ok) {
                                result.push(fp.value);
                        }
                }

                return result;
        }

        public getCompilerOptions(): Readonly<ts.CompilerOptions> {
                return this.tsProgram.getCompilerOptions();
        }

        public emit(
                targetSourceFile?: ts.SourceFile,
                writeFile?: ts.WriteFileCallback,
                cancellationToken?: ts.CancellationToken,
                emitOnlyDtsFiles?: boolean,
                customTransformers?: ts.CustomTransformers,
        ): ts.EmitResult {
                return this.tsProgram.emit(
                        targetSourceFile,
                        writeFile,
                        cancellationToken,
                        emitOnlyDtsFiles,
                        customTransformers,
                );
        }
}
