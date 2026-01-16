// packages/shared/src/branded/types.ts

type Branded<T, B extends string> = T & { readonly __brand: B };

// Fundamental branded primitives
export type Hash = Branded<string, 'Hash'>;
export type CanonicalJson = Branded<string, 'BrandedJson'>;

export type FilePath = Branded<string, 'FilePath'>;
export type SemVer = Branded<string, 'VersionString'>;

export type EntityName = Branded<string, 'EntityName'>;
export type SymbolId = Branded<string, 'SymbolId'>;
export type TypeId = Branded<string, 'TypeId'>;
export type NodeId = Branded<string, 'NodeId'>;
export type JsDocTagName = Branded<string, 'JsDocTagName'>;
