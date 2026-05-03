// packages/core/tests/metadata/metadata.ts

// ---------------------------------------------------------------------------
// A. Named type aliases — extractMetadataWithSymbol via type.aliasSymbol
// ---------------------------------------------------------------------------

// Plain primitive alias
export type UserId = number;

/** Alias chained through another alias */
export type AuthorId = UserId;

// ---------------------------------------------------------------------------
// A + E. Named alias with JSDoc prose (extractDocumentation: true path)
// ---------------------------------------------------------------------------

/**
 * Represents a user's display name.
 * This description should appear when extractDocumentation is enabled.
 */
export type DisplayName = string;

// ---------------------------------------------------------------------------
// A + G. Named alias with multiple annotations
// ---------------------------------------------------------------------------

/**
 * @entity
 * @min(0)
 * @max(120)
 */
export type Age = number;

/**
 * @email
 * @maxLength(255)
 */
export type EmailAddress = string;

// ---------------------------------------------------------------------------
// A. Named interface — extractMetadataWithSymbol via getDeclaredTypeOfSymbol
// ---------------------------------------------------------------------------

/** A simple named interface */
export interface Point {
        x: number;
        y: number;
}

/**
 * An annotated interface.
 * @entity
 */
export interface User {
        id: number;
        /** @email */
        email: string;
        age: Age;
}

// ---------------------------------------------------------------------------
// A + E. Interface with JSDoc documentation
// ---------------------------------------------------------------------------

/**
 * Represents a product in the catalogue.
 * Detailed multi-line description goes here.
 */
export interface Product {
        id: number;
        name: string;
        price: number;
}

// ---------------------------------------------------------------------------
// B. Synthetic metadata — anonymous / structural types
//    Inline object property types, anonymous union members, and anonymous
//    intersection members all lack a ts.Symbol → createSyntheticMetadata.
// ---------------------------------------------------------------------------

/** Inline anonymous object as a property type */
export interface WithInlineObject {
        config: { host: string; port: number };
}

/** Union of anonymous object literal types */
export type Shape =
        | { kind: 'circle'; radius: number }
        | { kind: 'rectangle'; width: number; height: number };

/** Intersection of two anonymous objects */
export type Positioned = { x: number } & { y: number };

// ---------------------------------------------------------------------------
// C. findTypeAliasSymbol — TypeAliasDeclaration ancestor in the AST
//    Any type alias whose type node is extracted will have the declaration
//    as an ancestor; the walker must find it and return the alias symbol.
// ---------------------------------------------------------------------------

/** Object alias — declaration is a TypeAliasDeclaration */
export type Coordinate = { lat: number; lng: number };

/** Union alias — union node lives inside a TypeAliasDeclaration */
export type Direction = 'north' | 'south' | 'east' | 'west';

// ---------------------------------------------------------------------------
// D. type.aliasSymbol fallback — checker-resolved aliases
//    Mapped / conditional / utility types are resolved by the checker but
//    retain aliasSymbol on the resolved type.
// ---------------------------------------------------------------------------

/** Readonly<T> — mapped type, resolved by checker, aliasSymbol preserved */
export type ReadonlyPoint = Readonly<Point>;

/** Conditional type — checker resolves but aliasSymbol set */
export type IsString<T> = T extends string ? true : false;

/** Partial utility type */
export type PartialUser = Partial<User>;

// ---------------------------------------------------------------------------
// F. extractAnnotations: false
//    Tags in source must produce empty annotations[] when option is false.
// ---------------------------------------------------------------------------

/**
 * @validate
 * @min(1)
 */
export type PositiveNumber = number;

/**
 * @entity
 * @tableName('products')
 */
export interface AnnotatedProduct {
        id: number;
        name: string;
}

// ---------------------------------------------------------------------------
// H. Span coverage — spread across the file to exercise span computation
// ---------------------------------------------------------------------------

export type FirstInFile = string;

export type LastInFile = boolean;

// ---------------------------------------------------------------------------
// Suppressed documentation (default extractDocumentation: false)
// ---------------------------------------------------------------------------

/**
 * This prose must NOT appear in metadata when extractDocumentation is false (the default).
 */
export type DocumentedButSuppressed = number;
