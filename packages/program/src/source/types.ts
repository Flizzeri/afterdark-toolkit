// packages/program/src/source/types.ts

import type { FilePath, SourceSpan, SourcePosition } from '@adtk/shared';
import type * as ts from 'typescript';

export interface SourceFile {
        readonly fileName: FilePath;
        readonly text: string;
        getSpan(node: ts.Node): SourceSpan;
        getPosition(offset: number): SourcePosition;
}
