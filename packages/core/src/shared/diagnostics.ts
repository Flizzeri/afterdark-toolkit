// src/shared/diagnostics.ts

import type { FilePath } from '@afterdarktk/shared';

import type { DIAGNOSTIC_PREFIX } from './constants.js';

type DiagnosticPrefix = typeof DIAGNOSTIC_PREFIX;

export type DiagnosticCategory = 'error' | 'warning' | 'info';

// Represents a source location span (1-based line/column).
export interface SourceSpan {
        readonly filePath: FilePath; // normalized posix path
        readonly startLine: number; // 1-based
        readonly startColumn: number; // 1-based
        readonly endLine: number; // 1-based
        readonly endColumn: number; // 1-based
}

export interface DiagnosticLocation {
        readonly filePath?: FilePath; // normalized posix path
        readonly line?: number; // 1-based
        readonly column?: number; // 1-based
        readonly symbol?: string; // TS symbol (fully qualified if available)
}

export interface DiagnosticContext {
        readonly entity?: string; // e.g., interface name for @entity
        readonly field?: string; // property/field name
        readonly hint?: string; // brief human-readable extra context
}

export type DiagnosticCode = `${DiagnosticPrefix}-${string}-${number}`; // e.g., ADTK-IR-1001

export interface CodeMeta {
        readonly code: DiagnosticCode;
        readonly category: DiagnosticCategory;
        readonly template: string; // printf-style %s placeholders
        readonly docsSlug: string; // path segment after DOCS_BASE_URL
}

export interface Diagnostic {
        readonly code: DiagnosticCode;
        readonly category: DiagnosticCategory;
        readonly message: string; // final, user-facing message assembled by factory
        readonly helpUrl?: string; // stable link to docs
        readonly location?: DiagnosticLocation;
        readonly context?: DiagnosticContext;
}
