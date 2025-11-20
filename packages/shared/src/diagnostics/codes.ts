// packages/shared/src/diagnostics/codes.ts

import { DIAGNOSTIC_PREFIX, type CodeMeta } from '@afterdarktk/shared';

const DIAGNOSTIC_PREFIX_IR = `${DIAGNOSTIC_PREFIX}-ENCODING` as const;

// 90xx: Internal / encoding
export const CANONICAL_UNSUPPORTED_TYPE: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-9001`,
        category: 'error',
        template: 'Unsupported value type for canonical encoding: %s',
        docsSlug: 'ADTK-CANONICAL-1001',
} as const;

export const CANONICAL_UNSTABLE_NUMBER: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-9002`,
        category: 'error',
        template: 'Non-deterministic number representation: %s',
        docsSlug: 'ADTK-CANONICAL-1002',
} as const;

export const CANONICAL_BIGINT_POLICY: CodeMeta = {
        code: `${DIAGNOSTIC_PREFIX_IR}-9003`,
        category: 'error',
        template: 'BigInt encountered but disallowed by policy',
        docsSlug: 'ADTK-CANONICAL-1003',
} as const;
