// packages/shared/src/index.ts

export * from './primitives/types.js';
export * from './primitives/constants.js';

export type { Result } from './utils/types.js';

export { assertNever, ok, err, isOk, isErr } from './utils/utilities.js';
