// packages/program/src/program/types.ts

import type { FilePath, SourceSpan, SourcePosition } from '@adtk/shared';
import type * as ts from 'typescript';

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

export interface SourceFile {
        readonly fileName: FilePath;
        readonly text: string;
        getSpan(node: ts.Node): SourceSpan;
        getPosition(offset: number): SourcePosition;
}
