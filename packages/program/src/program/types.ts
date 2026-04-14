// packages/program/src/program/types.ts

import type { FilePath } from '@adtk/shared';
import type * as ts from 'typescript';

import type { SourceFile } from '../source';

export interface Program {
        getSourceFiles(): readonly SourceFile[];
        getSourceFile(fileName: FilePath): SourceFile | undefined;
        getTypeChecker(): ts.TypeChecker;
        getRootFileNames(): readonly FilePath[];
        getCompilerOptions(): Readonly<ts.CompilerOptions>;

        emit(
                targetSourceFile?: ts.SourceFile,
                writeFile?: ts.WriteFileCallback,
                cancellationToken?: ts.CancellationToken,
                emitOnlyDtsFiles?: boolean,
                customTransformers?: ts.CustomTransformers,
        ): ts.EmitResult;
}
