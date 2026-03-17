// packages/program/src/emit/types.ts

import type { FilePath } from '@adtk/shared';

import type { CustomTransformers } from '../transform';

export interface EmitConfig {
        readonly outDir?: FilePath;
        readonly declaration?: boolean;
        readonly declarationMap?: boolean;
        readonly sourceMap?: boolean;
        readonly emitOnlyDtsFiles?: boolean;
        readonly transformers?: CustomTransformers;
}

export interface EmitResult {
        readonly emittedFiles: readonly FilePath[];
}

export type EmitError =
        | {
                  readonly type: 'emit-failed';
                  readonly message: string;
          }
        | {
                  readonly type: 'no-emit';
                  readonly message: string;
          }
        | {
                  readonly type: 'write-failed';
                  readonly path: FilePath;
                  readonly reason: string;
          }
        | {
                  readonly type: 'directory-creation-failed';
                  readonly path: FilePath;
                  readonly reason: string;
          };
