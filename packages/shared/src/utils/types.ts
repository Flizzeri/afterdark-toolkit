// packages/shared/src/utils/types.ts

import type { Diagnostic } from '../diagnostics/types';

export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; diagnostics: readonly Diagnostic[] };
export type Result<T> = Ok<T> | Err;
