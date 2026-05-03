// packages/core/tests/extraction/intersections.ts

// 1. Basic two-member intersections — AST path

export interface HasId {
        id: number;
}

export interface HasName {
        name: string;
}

export interface HasTimestamps {
        createdAt: string;
        updatedAt: string;
}

export type WithId = HasId & HasName;
export type WithTimestamps = HasId & HasName & HasTimestamps;

// 2. Intersection with inline object literal members

export type Identified = { id: number } & { label: string };

// Three-way with inline types
export type ThreeProperties = { a: string } & { b: number } & { c: boolean };

// 3. Intersection mixing named interface and inline literal

export type AdminUser = HasId & { role: 'admin'; permissions: string[] };

// 4. Intersection with primitives

export type StringAndString = string & string; // redundant but valid

// 5. Resolved intersection as object

export interface MergedEntity extends HasId, HasName, HasTimestamps {
        extra: boolean;
}

// 6. Intersection with optional property on one side

export type OptionalIntersection = HasId & { nickname?: string };

// 7. Intersection with readonly property

export type ReadonlyIntersection = HasId & { readonly tag: string };

// 8. Intersection with array property

export type WithTags = HasName & { tags: string[] };

// 9. Nested intersections

export type Base = HasId & HasName;
export type Extended = Base & HasTimestamps; // AST: Base & HasTimestamps (TypeRefNode & TypeRefNode)

// 10. Intersection with union member — exercises mixed combinator nesting

export type WithStatus = HasId & { status: 'active' | 'inactive' };

// 11. Intersection where one member is a function type property

export interface Callable {
        call: (arg: string) => number; // function-type property, not a method sig
}

export type CallableWithId = HasId & Callable;
