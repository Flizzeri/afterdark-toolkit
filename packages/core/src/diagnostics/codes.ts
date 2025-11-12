import { DIAGNOSTIC_PREFIX } from '../shared/constants.js';
import type { CodeMeta } from '../shared/diagnostics.js';

const DIAGNOSTIC_PREFIX_IR = `${DIAGNOSTIC_PREFIX}-IR` as const;

// 1xxx: Extraction / resolution
export const TYPE_UNSUPPORTED: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-1001`,
        category: 'error',
        template: 'Unsupported TypeScript construct: %s',
        docsSlug: 'ADTK-IR-1001',
} as const;

export const TYPE_UNRESOLVED: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-1002`,
        category: 'error',
        template: 'Unable to resolve type: %s',
        docsSlug: 'ADTK-IR-1002',
} as const;

// 2xxx: Normalization / structure
export const UNION_HETEROGENEOUS: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-2001`,
        category: 'error',
        template: 'Union must be homogeneous; offending member: %s',
        docsSlug: 'ADTK-IR-2001',
} as const;

export const INTERSECTION_CONFLICT: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-2002`,
        category: 'error',
        template: 'Conflicting property in intersection: %s',
        docsSlug: 'ADTK-IR-2002',
} as const;

export const RECURSION_CYCLE: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-2003`,
        category: 'error',
        template: 'Recursive type detected without resolvable $ref at: %s',
        docsSlug: 'ADTK-IR-2003',
} as const;

// 3xxx: Annotations / tags
export const TAG_UNKNOWN: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-3001`,
        category: 'warning',
        template: 'Unknown JSDoc tag: %s',
        docsSlug: 'ADTK-IR-3001',
} as const;

export const TAG_MALFORMED: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-3002`,
        category: 'error',
        template: 'Malformed or invalid JSDoc tag: %s',
        docsSlug: 'ADTK-IR-3002',
} as const;

// 4xxx: Determinism / hashing
export const HASH_UNSTABLE_INPUT: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-4001`,
        category: 'error',
        template: 'Non-deterministic input detected during hashing: %s',
        docsSlug: 'ADTK-IR-4001',
} as const;

// 91xx: Internal / encoding
export const CANONICAL_UNSUPPORTED_TYPE: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-9101`,
        category: 'error',
        template: 'Unsupported value type for canonical encoding: %s',
        docsSlug: 'ADTK-CANONICAL-1001',
} as const;

export const CANONICAL_UNSTABLE_NUMBER: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-9102`,
        category: 'error',
        template: 'Non-deterministic number representation: %s',
        docsSlug: 'ADTK-CANONICAL-1002',
} as const;

export const CANONICAL_BIGINT_POLICY: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-9103`,
        category: 'error',
        template: 'BigInt encountered but disallowed by policy',
        docsSlug: 'ADTK-CANONICAL-1003',
} as const;
