// packages/program/src/watch/types.ts

import type { FilePath, DiagnosticCollector } from '@adtk/shared';

import type { Program } from '../program';
import type { ProjectConfig, LoadOptions } from '../project';

export interface WatchConfig {
        readonly projectConfig: ProjectConfig;
        readonly loadOptions?: LoadOptions;
        readonly onProgramUpdate: (program: Program, changedFiles: readonly FilePath[]) => void;
        readonly onDiagnostics?: (diagnostics: DiagnosticCollector) => void;
        readonly onStatusChange?: (status: WatchStatus) => void;
}

export type WatchStatus =
        | { readonly type: 'starting' }
        | { readonly type: 'compiling'; readonly files: readonly FilePath[] }
        | { readonly type: 'compiled'; readonly duration: number };

export interface WatchProgram {
        getCurrentProgram(): Program;
        close(): void;
}

export type WatchError =
        | {
                  readonly type: 'missing-tsconfig';
                  readonly message: string;
          }
        | {
                  readonly type: 'watch-setup-failed';
                  readonly reason: string;
          };
