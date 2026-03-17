// packages/program/src/project/types.ts

import type { FilePath } from '@adtk/shared';
import type * as ts from 'typescript';

export interface ProjectConfig {
        readonly tsconfig?: FilePath;
        readonly rootFiles?: readonly FilePath[];
        readonly compilerOptions?: ts.CompilerOptions;
}

export interface LoadOptions {
        readonly skipLibFiles?: boolean;
}

export type LoadErrorType =
        | 'tsconfig-not-found'
        | 'tsconfig-parse-error'
        | 'tsconfig-read-error'
        | 'no-input-files'
        | 'program-creation-failed'
        | 'compilation-errors';

export interface LoadError {
        readonly type: LoadErrorType;
        readonly message: string;
        readonly path?: FilePath;
}
