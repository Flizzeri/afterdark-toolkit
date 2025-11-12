import { DIAGNOSTIC_PREFIX } from '../shared/constants.js';

const DIAGNOSTIC_PREFIX_IR = `${DIAGNOSTIC_PREFIX}-IR` as const;

export const TYPE_UNSUPPORTED = {
        code: `${DIAGNOSTIC_PREFIX_IR}-1001`,
        category: 'error',
        template: 'Unsupported TypeScript construct: %s',
        docsSlug: 'ADTK-IR-1001',
} as const;
export const TYPE_UNRESOLVED = {
        code: `${DIAGNOSTIC_PREFIX_IR}-1002`,
        category: 'error',
        template: 'Unable to resolve type: %s',
        docsSlug: 'ADTK-IR-1002',
} as const;
export const UNION_HETEROGENEOUS = {
        code: `${DIAGNOSTIC_PREFIX_IR}-2001`,
        category: 'error',
        template: 'Union must be homogeneous; offending member: %s',
        docsSlug: 'ADTK-IR-2001',
} as const;
export const INTERSECTION_CONFLICT = {
        code: `${DIAGNOSTIC_PREFIX_IR}-2002`,
        category: 'error',
        template: 'Conflicting property in intersection: %s',
        docsSlug: 'ADTK-IR-2002',
} as const;
export const RECURSION_CYCLE = {
        code: `${DIAGNOSTIC_PREFIX_IR}-2003`,
        category: 'error',
        template: 'Recursive type detected without resolvable $ref at: %s',
        docsSlug: 'ADTK-IR-2003',
} as const;
export const TAG_UNKNOWN = {
        code: `${DIAGNOSTIC_PREFIX_IR}-3001`,
        category: 'warning',
        template: 'Unknown JSDoc tag: %s',
        docsSlug: 'ADTK-IR-3001',
} as const;
export const TAG_MALFORMED = {
        code: `${DIAGNOSTIC_PREFIX_IR}-3002`,
        category: 'error',
        template: 'Malformed or invalid JSDoc tag: %s',
        docsSlug: 'ADTK-IR-3002',
} as const;
export const HASH_UNSTABLE_INPUT = {
        code: `${DIAGNOSTIC_PREFIX_IR}-4001`,
        category: 'error',
        template: 'Non-deterministic input detected during hashing: %s',
        docsSlug: 'ADTK-IR-4001',
} as const;
