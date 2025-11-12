import type { Diagnostic } from './diagnostics';

// Result pattern (success/failure)
export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; diagnostics: readonly Diagnostic[] };
export type Result<T> = Ok<T> | Err;

// Functional helpers for Result
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = <T = never>(diagnostics: readonly Diagnostic[]): Result<T> => ({
        ok: false,
        diagnostics,
});

export const isOk = <T>(r: Result<T>): r is { ok: true; value: T } => r.ok;
export const isErr = <T>(r: Result<T>): r is { ok: false; diagnostics: readonly Diagnostic[] } =>
        !r.ok;

Object.freeze(ok);
Object.freeze(err);
Object.freeze(isOk);
Object.freeze(isErr);
