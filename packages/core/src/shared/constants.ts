// packages/core/src/shared/constants.ts

export const PROJECT_NAME = 'afterdarktk';
export const DOCS_BASE_URL = 'https://afterdark.dev/errors';
export const CACHE_ROOT = `.afterdarktk/cache`;

export const CACHE_DIRS = {
        IR: 'ir',
        SYMBOLS: 'symbols',
        INDEX: 'index',
        MANIFESTS: 'manifests',
} as const;

export const FILE_NAMES = {
        INDEX: 'index.json',
        FINGERPRINT: 'fingerprint.json',
} as const;

export const HASH_ALGORITHM = 'sha256' as const;

export const DIAGNOSTIC_PREFIX = 'ADTK' as const;
export const DIAGNOSTIC_CATEGORIES = ['error', 'warning', 'info'] as const;

export const FEATURE_STATUS = {
        SUPPORTED: 'supported',
        PARTIAL: 'partial',
        UNSUPPORTED: 'unsupported',
} as const;

/**
 * Version constants, bound to package.json at build-time if needed.
 */
export const TOOLKIT_VERSION = '0.1.0-dev';

export const CACHE_FILE_EXTENSION = '.json';

export const CANONICAL_ENCODING = {
        INDENT: 2,
        SORT_KEYS: true,
} as const;

export const PATHS = {
        CONFIG: 'afterdarktk.config.ts',
        TS_CONFIG: 'tsconfig.json',
} as const;

Object.freeze(CACHE_DIRS);
Object.freeze(FILE_NAMES);
Object.freeze(DIAGNOSTIC_CATEGORIES);
Object.freeze(FEATURE_STATUS);
Object.freeze(PATHS);
