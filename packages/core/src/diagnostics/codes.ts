import { DIAGNOSTIC_PREFIX } from '../shared/constants.js';
import type { CodeMeta } from '../shared/diagnostics.js';

const DIAGNOSTIC_PREFIX_IR = `${DIAGNOSTIC_PREFIX}-IR` as const;

export const IR_CODES_META: Readonly<Record<string, CodeMeta>> = {
        TYPE_UNSUPPORTED: {
                code: `${DIAGNOSTIC_PREFIX_IR}-1001`,
                category: 'error',
                template: 'Unsupported TypeScript construct: %s',
                docsSlug: 'ADTK-IR-1001',
        },
        TYPE_UNRESOLVED: {
                code: `${DIAGNOSTIC_PREFIX_IR}-1002`,
                category: 'error',
                template: 'Unable to resolve type: %s',
                docsSlug: 'ADTK-IR-1002',
        },
        UNION_HETEROGENEOUS: {
                code: `${DIAGNOSTIC_PREFIX_IR}-2001`,
                category: 'error',
                template: 'Union must be homogeneous; offending member: %s',
                docsSlug: 'ADTK-IR-2001',
        },
        INTERSECTION_CONFLICT: {
                code: `${DIAGNOSTIC_PREFIX_IR}-2002`,
                category: 'error',
                template: 'Conflicting property in intersection: %s',
                docsSlug: 'ADTK-IR-2002',
        },
        RECURSION_CYCLE: {
                code: `${DIAGNOSTIC_PREFIX_IR}-2003`,
                category: 'error',
                template: 'Recursive type detected without resolvable $ref at: %s',
                docsSlug: 'ADTK-IR-2003',
        },
        TAG_UNKNOWN: {
                code: `${DIAGNOSTIC_PREFIX_IR}-3001`,
                category: 'warning',
                template: 'Unknown JSDoc tag: %s',
                docsSlug: 'ADTK-IR-3001',
        },
        TAG_MALFORMED: {
                code: `${DIAGNOSTIC_PREFIX_IR}-3002`,
                category: 'error',
                template: 'Malformed or invalid JSDoc tag: %s',
                docsSlug: 'ADTK-IR-3002',
        },
        HASH_UNSTABLE_INPUT: {
                code: `${DIAGNOSTIC_PREFIX_IR}-4001`,
                category: 'error',
                template: 'Non-deterministic input detected during hashing: %s',
                docsSlug: 'ADTK-IR-4001',
        },
};
