// Centralized, typed constants to avoid magic strings.

export const DOCS_BASE_URL: 'https://afterdark.dev/errors' = 'https://afterdark.dev/errors';

// Namespaces for error code groups within the IR / Core layer.
export type ErrorNamespace = 'ADTK-IR';

export const ERROR_NAMESPACE_IR: ErrorNamespace = 'ADTK-IR' as const;
