// packages/shared/src/index.ts

export * from './primitives/types.js';
export * from './primitives/constants.js';

export * from './diagnostics/types.js';
export { makeDiagnostic } from './diagnostics/factory.js';
export { formatDiagnostics } from './diagnostics/reporter.js';

export type { Result } from './utils/types.js';

export { assertNever, ok, err, isOk, isErr } from './utils/utilities.js';
