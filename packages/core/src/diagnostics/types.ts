import type { DiagnosticCategory } from './categories';

export interface DiagnosticLocation {
        readonly filePath?: string; // normalized posix path
        readonly line?: number; // 1-based
        readonly column?: number; // 1-based
        readonly symbol?: string; // TS symbol (fully qualified if available)
}

export interface DiagnosticContext {
        readonly entity?: string; // e.g., interface name for @entity
        readonly field?: string; // property/field name
        readonly hint?: string; // brief human-readable extra context
}

export type ErrorCode = `${string}-${string}-${number}`; // e.g., ADTK-IR-1001

export interface Diagnostic {
        readonly code: ErrorCode;
        readonly category: DiagnosticCategory;
        readonly message: string; // final, user-facing message assembled by factory
        readonly helpUrl?: string; // stable link to docs
        readonly location?: DiagnosticLocation;
        readonly context?: DiagnosticContext;
}

// Result pattern for recoverable operations
export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; diagnostics: readonly Diagnostic[] };
export type Result<T> = Ok<T> | Err;

// Narrowing helpers (explicit return types to satisfy lint rules).
export function isOk<T>(r: Result<T>): r is Ok<T> {
        return r.ok === true;
}

export function isErr<T>(r: Result<T>): r is Err {
        return r.ok === false;
}
