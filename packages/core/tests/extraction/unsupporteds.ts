// packages/core/tests/extraction/unsupporteds.ts

// Covers the IRUnsupported path in dispatchFromCheckerFlags — types that pass
// through all the isPrimitive/isLiteral/isUnion/... guards without matching,
// landing in the fallback that emits ADTK-CORE-9999 and returns IRUnsupported.
//
// These are NOT broken types (those are caught by the TS compiler before we
// even get to extraction). They are valid TypeScript but structurally beyond
// what the current IR can represent:
//   - un-instantiated generics (TypeParameter flags)
//   - conditional types (Conditional flags)
//   - mapped types (Mapped flags / anonymous Object with homomorphic mapping)
//   - infer types (used inside conditional)
//   - indexed access types where the result is a TypeParameter
//   - keyof types (Index flags)

// 1. Un-instantiated generic type parameter

export type Identity<T> = T; // T is free → unsupported
export type Wrapper<T> = { value: T }; // property type is TypeParameter
export type Pair<A, B> = { first: A; second: B };

// 2. Conditional types

export type IsString<T> = T extends string ? true : false;
export type NonNullable2<T> = T extends null | undefined ? never : T;
export type ReturnType2<T> = T extends (...args: any[]) => infer R ? R : never;
export type Flatten<T> = T extends Array<infer U> ? U : T;

// 3. Mapped types

export type ReadonlyAll<T> = { readonly [K in keyof T]: T[K] };
export type Optional<T> = { [K in keyof T]?: T[K] };
export type Stringify<T> = { [K in keyof T]: string };
export type Nullable<T> = { [K in keyof T]: T[K] | null };

// 4. keyof — TypeFlags.Index

export type Keys<T> = keyof T;
export type UserKeys = keyof { id: number; name: string; email: string };

// 5. Infer used inside conditional

export type UnpackPromise<T> = T extends Promise<infer U> ? U : T;
export type FirstArg<T> = T extends (first: infer A, ...rest: any[]) => any ? A : never;

// 6. Recursive conditional type

export type DeepReadonly<T> = T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

// 7. Object with only unsupported property types

export interface WithGenericProp<T> {
        // T is a free type parameter — property type will be IRUnsupported
        value: T;
        wrapped: Wrapper<T>;
}

// 8. Intersection with an unsupported member

export type WithConditional<T> = { id: number } & (T extends string
        ? { kind: 'string' }
        : { kind: 'other' });

// 9. Instantiated generics that ARE supported

export type StringArray = string[]; // resolves to object (array) → IRArray
export type NumberPair = [number, number]; // resolves to tuple → IRTuple
export type PartialPoint = Partial<{ x: number; y: number }>; // resolves to object → IRObject

// 10. Template literal with an unsupported interpolation type

export type KeyOf<T> = `key_${keyof T & string}`; // keyof T is unsupported inside the template
