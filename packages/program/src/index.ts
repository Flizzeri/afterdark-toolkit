// packages/program/src/index.ts

export { loadProject } from './project';
export type { ProjectConfig, LoadOptions, LoadError } from './project';

export type { Program } from './program';

export type { SourceFile } from './source';

export { convertDiagnostics, toAdtkDiagnosticCode } from './diagnostics';
export type { TypeScriptDiagnosticCode } from './diagnostics';

export type { TransformerFactory, CustomTransformers } from './transform';

export { emitProgram } from './emit';
export type { EmitConfig, EmitResult, EmitError } from './emit';

export { createWatchProgram } from './watch';
export type { WatchConfig, WatchProgram, WatchStatus, WatchError } from './watch';

export * from './utils';
