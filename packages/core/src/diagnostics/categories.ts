// Diagnostic category is a closed set; encode as a string union for ESLint friendliness.
export type DiagnosticCategory = 'error' | 'warning' | 'info';

// Ordered by severity to enable deterministic sort/filter behavior downstream.
export const CATEGORY_ORDER: Readonly<Record<DiagnosticCategory, number>> = {
        error: 0,
        warning: 1,
        info: 2,
} as const;
