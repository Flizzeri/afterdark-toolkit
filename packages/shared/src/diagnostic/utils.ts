// packages/shared/src/diagnostic/utils.ts

import {
        type Diagnostic,
        type DiagnosticCategory,
        type DiagnosticCode,
        type DiagnosticMessage,
        type DiagnosticSpan,
        FatalDiagnostic,
} from './types';

/**
 * Creates a diagnostic object with the specified properties.
 *
 * @remarks
 * This is a low-level utility for constructing diagnostics. Most code should
 * use `DiagnosticCollector.addError()`, `addWarning()`, etc. instead, which
 * provide a more convenient API.
 *
 * Use this function when:
 * - Building diagnostics from external sources
 * - Creating diagnostic arrays programmatically
 * - You need precise control over all diagnostic fields
 *
 * @example
 * ```typescript
 * const diagnostic = createDiagnostic(
 *   'ADTK-IR-001',
 *   'error',
 *   {
 *     title: 'Type extraction failed',
 *     description: 'Could not represent template literal type in IR'
 *   },
 *   {
 *     span: sourceSpan,
 *     message: 'Template literal found here',
 *     help: 'Use a string union instead'
 *   }
 * );
 * ```
 */
export function createDiagnostic(
        code: DiagnosticCode,
        category: DiagnosticCategory,
        message: DiagnosticMessage,
        spans: DiagnosticSpan[],
): Diagnostic {
        return {
                code,
                category,
                message,
                spans,
        };
}

export function isFatal(diagnostic: Diagnostic): boolean {
        return diagnostic.category === 'fatal';
}

export function isError(diagnostic: Diagnostic): boolean {
        return diagnostic.category === 'error';
}

export function isWarning(diagnostic: Diagnostic): boolean {
        return diagnostic.category === 'warning';
}

export function isInfo(diagnostic: Diagnostic): boolean {
        return diagnostic.category === 'info';
}

export function isHint(diagnostic: Diagnostic): boolean {
        return diagnostic.category === 'hint';
}

export function throwFatal(diagnostic: Diagnostic): never {
        throw new FatalDiagnostic(diagnostic);
}
