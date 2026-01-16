// packages/shared/src/result/utils.ts

import type { Result, Ok, Err } from './types';

// Result utilities
export const ok = <T>(value: T): Result<T, never> => ({
        ok: true,
        value,
});

export const err = <E>(error: E): Result<never, E> => ({
        ok: false,
        error,
});

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.ok;
