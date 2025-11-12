import type { DiagnosticCategory } from './categories';
import { DOCS_BASE_URL, ERROR_NAMESPACE_IR } from './constants';
import type { ErrorCode } from './types';

// Define the *canonical* set of codes for the core/IR layer.
// Keep codes stable; add, don’t reuse.
export const IR_ERROR_CODES = {
        // 1xxx: Extraction / resolution
        TYPE_UNSUPPORTED: `${ERROR_NAMESPACE_IR}-1001`,
        TYPE_UNRESOLVED: `${ERROR_NAMESPACE_IR}-1002`,
        // 2xxx: Normalization / structure
        UNION_HETEROGENEOUS: `${ERROR_NAMESPACE_IR}-2001`,
        INTERSECTION_CONFLICT: `${ERROR_NAMESPACE_IR}-2002`,
        RECURSION_CYCLE: `${ERROR_NAMESPACE_IR}-2003`,
        // 3xxx: Annotations / tags
        TAG_UNKNOWN: `${ERROR_NAMESPACE_IR}-3001`,
        TAG_MALFORMED: `${ERROR_NAMESPACE_IR}-3002`,
        // 4xxx: Determinism / hashing
        HASH_UNSTABLE_INPUT: `${ERROR_NAMESPACE_IR}-4001`,
} as const;

export type IrErrorKey = keyof typeof IR_ERROR_CODES;

export interface CodeMeta {
        readonly code: ErrorCode;
        readonly category: DiagnosticCategory;
        readonly template: string; // printf-style %s placeholders
        readonly docsSlug: string; // path segment after DOCS_BASE_URL
}

const META: Readonly<Record<IrErrorKey, CodeMeta>> = {
        TYPE_UNSUPPORTED: {
                code: IR_ERROR_CODES.TYPE_UNSUPPORTED,
                category: 'error',
                template: 'Unsupported TypeScript construct: %s',
                docsSlug: 'ADTK-IR-1001',
        },
        TYPE_UNRESOLVED: {
                code: IR_ERROR_CODES.TYPE_UNRESOLVED,
                category: 'error',
                template: 'Unable to resolve type: %s',
                docsSlug: 'ADTK-IR-1002',
        },
        UNION_HETEROGENEOUS: {
                code: IR_ERROR_CODES.UNION_HETEROGENEOUS,
                category: 'error',
                template: 'Union must be homogeneous; offending member: %s',
                docsSlug: 'ADTK-IR-2001',
        },
        INTERSECTION_CONFLICT: {
                code: IR_ERROR_CODES.INTERSECTION_CONFLICT,
                category: 'error',
                template: 'Conflicting property in intersection: %s',
                docsSlug: 'ADTK-IR-2002',
        },
        RECURSION_CYCLE: {
                code: IR_ERROR_CODES.RECURSION_CYCLE,
                category: 'error',
                template: 'Recursive type detected without resolvable $ref at: %s',
                docsSlug: 'ADTK-IR-2003',
        },
        TAG_UNKNOWN: {
                code: IR_ERROR_CODES.TAG_UNKNOWN,
                category: 'warning',
                template: 'Unknown JSDoc tag: %s',
                docsSlug: 'ADTK-IR-3001',
        },
        TAG_MALFORMED: {
                code: IR_ERROR_CODES.TAG_MALFORMED,
                category: 'error',
                template: 'Malformed or invalid JSDoc tag: %s',
                docsSlug: 'ADTK-IR-3002',
        },
        HASH_UNSTABLE_INPUT: {
                code: IR_ERROR_CODES.HASH_UNSTABLE_INPUT,
                category: 'error',
                template: 'Non-deterministic input detected during hashing: %s',
                docsSlug: 'ADTK-IR-4001',
        },
};

export function getCodeMeta(key: IrErrorKey): CodeMeta {
        return META[key];
}

export function codeUrl(meta: CodeMeta): string {
        return `${DOCS_BASE_URL}/${meta.docsSlug}`;
}
