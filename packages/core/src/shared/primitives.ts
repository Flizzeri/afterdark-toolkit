// packages/core/src/shared/primitives.ts

export type Branded<T, B extends string> = T & { readonly __brand: B };

// Fundamental branded primitives
export type FilePath = Branded<string, 'FilePath'>;
export type EntityName = Branded<string, 'EntityName'>;
export type Hash = Branded<string, 'Hash'>;
export type DiagnosticCode = Branded<string, 'DiagnosticCode'>;
export type VersionString = Branded<string, 'VersionString'>;
export type CanonicalJson = Branded<string, 'BrandedJson'>;
export type Fingerprint = Branded<string, 'Fingerprint'>;

// Exhaustiveness guard
export const assertNever = (x: never): never => {
        throw new Error(`Unexpected value: ${x}`);
};

// Immutable freeze pattern for constants exported from here (if any in future)
Object.freeze(assertNever);
