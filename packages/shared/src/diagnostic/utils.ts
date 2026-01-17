// packages/shared/src/diagnostic/utils.ts

import {
        type Diagnostic,
        type DiagnosticCategory,
        type DiagnosticCode,
        type DiagnosticMessage,
        type DiagnosticSpan,
        FatalDiagnostic,
} from './types';

export function createDiagnostic(
        code: DiagnosticCode,
        category: DiagnosticCategory,
        message: DiagnosticMessage,
        span: DiagnosticSpan,
        relatedSpans?: readonly DiagnosticSpan[],
): Diagnostic {
        return {
                code,
                category,
                message,
                span,
                ...(relatedSpans && { relatedSpans }),
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
