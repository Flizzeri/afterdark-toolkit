// packages/shared/src/utils/utilities.ts

import type { Result, Ok, Err } from './types';
import type { Diagnostic } from '../diagnostics/types';

// Exhaustiveness guard
export const assertNever = (x: never): never => {
        throw new Error(`Unexpected value: ${x}`);
};

// Result utilities
export const ok = <T>(value: T): Result<T> => ({
        ok: true,
        value,
});

export const err = <T = never>(diagnostics: readonly Diagnostic[]): Result<T> => ({
        ok: false,
        diagnostics,
});

export const isOk = <T>(r: Result<T>): r is Ok<T> => r.ok;
export const isErr = <T>(r: Result<T>): r is Err => !r.ok;
