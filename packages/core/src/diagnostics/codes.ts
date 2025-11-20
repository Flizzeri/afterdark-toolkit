// packages/core/src/diagnostics/codes.ts

import { DIAGNOSTIC_PREFIX, type CodeMeta } from '@afterdarktk/shared';

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

export const TAG_PAYLOAD_MISSING: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-3003`,
        category: 'error',
        template: 'Tag %s requires a payload',
        docsSlug: 'ADTK-IR-3003',
} as const;

export const TAG_PAYLOAD_INVALID: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-3004`,
        category: 'error',
        template: 'Tag %s has invalid payload: %s',
        docsSlug: 'ADTK-IR-3004',
} as const;

export const TAG_INCOMPATIBLE_TYPE: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-3005`,
        category: 'error',
        template: 'Tag %s cannot be applied to type %s',
        docsSlug: 'ADTK-IR-3005',
} as const;

export const TAG_FIELD_NOT_FOUND: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-3006`,
        category: 'error',
        template: 'Field %s referenced in tag %s does not exist',
        docsSlug: 'ADTK-IR-3006',
} as const;

export const TAG_DUPLICATE: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-3007`,
        category: 'error',
        template: 'Duplicate tag %s on symbol',
        docsSlug: 'ADTK-IR-3007',
} as const;

// 91xx: Internal / cache
export const CACHE_CORRUPTED: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-9101`,
        category: 'error',
        template: 'Cache entry is corrupted or checksum mismatch: %s',
        docsSlug: 'ADTK-CACHE-9001',
} as const;

export const CACHE_IO_ERROR: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-9102`,
        category: 'error',
        template: 'Cache I/O error at %s: %s',
        docsSlug: 'ADTK-CACHE-9002',
} as const;
