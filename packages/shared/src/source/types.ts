// packages/shared/src/source/types.ts

import type { FilePath } from '../branded';

export interface SourcePosition {
        readonly line: number;
        readonly column: number;
        readonly offset: number;
}

export interface SourceSpan {
        readonly file: FilePath;
        readonly start: SourcePosition;
        readonly end: SourcePosition;
}
