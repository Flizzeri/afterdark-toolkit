// packages/core/tests/extraction/objects.ts

// Covers extractObject exhaustively:
//   - interface declarations, type alias objects, class shapes
//   - every getPropertyNode branch: PropertySignature, PropertyDeclaration,
//     Parameter (constructor), PropertyAssignment, MethodSignature (err path)
//   - optional, readonly, annotated, documented properties
//   - index signatures: string, number, and the dual-index-sig error path
//   - isObjectType filtering (Reference and Tuple ObjectFlags must not match)
//   - Record<K,V> and similar resolved object types
//   - `as const` object shapes

// 1. Basic interface

export interface SimpleObject {
        name: string;
        age: number;
}

export interface AllOptionalObject {
        firstName?: string;
        lastName?: string;
        nickname?: string;
}

export interface MixedOptionalObject {
        id: number;
        email: string;
        phone?: string;
        bio?: string;
}

// 2. Readonly properties

export interface WithReadonly {
        readonly id: number;
        readonly createdAt: string;
        mutable: string;
}

export type ReadonlyObject = {
        readonly x: number;
        readonly y: number;
        label: string;
};

// 3. Annotated and documented properties

export interface AnnotatedUser {
        /** @email */
        email: string;

        /** @min(0) @max(150) */
        age: number;

        /**
         * The user's full display name.
         * Must not contain special characters.
         * @minLength(1) @maxLength(100)
         */
        displayName: string;

        /** @legacy Use displayName instead */
        name?: string;
}

// 4. Nested object properties

export interface Address {
        street: string;
        city: string;
        country: string;
        zip?: string;
}

export interface PersonWithAddress {
        id: number;
        name: string;
        address: Address;
        billingAddress?: Address;
}

export interface DeepNesting {
        level1: {
                level2: {
                        level3: {
                                value: string;
                        };
                };
        };
}

// 5. String index signature

export interface StringIndexed {
        [key: string]: string;
}

export interface StringIndexedWithProps {
        [key: string]: unknown;
        id: number; // must be compatible with index value type
        name: string;
}

export type StringRecord = Record<string, number>;
export type StringToBoolean = { [k: string]: boolean };

// 6. Number index signature

export interface NumberIndexed {
        [index: number]: string;
}

export interface NumberIndexedWithLength {
        [index: number]: boolean;
        length: number;
}

// 7. Type alias objects

export type Point = { x: number; y: number };
export type Vector3 = { x: number; y: number; z: number };
export type NamedPoint = { readonly label: string; x: number; y: number };

// 8. Object with function-type properties

export interface WithFunctions {
        transform: (value: string) => number;
        predicate: (x: number) => boolean;
        callback?: (event: string) => void;
}

// 9. Object with method signatures

export interface WithMethod {
        id: number;
        greet(): string;
}

// 10. Class shape

export class UserRecord {
        id: number = 0;
        name: string = '';
        readonly createdAt: string = '';
        email?: string;
}

export class Point2D {
        constructor(
                public readonly x: number,
                public readonly y: number,
        ) {}
}

// 11. `as const` object

export const CONFIG = {
        host: 'localhost',
        port: 3000,
        debug: false,
} as const;

export type Config = typeof CONFIG;

// 12. Resolved intersection as flat object

export interface HasId {
        id: number;
}

export interface HasLabel {
        label: string;
}

// Intersection resolved by checker to merged object (when accessed as type)
export type Tagged = HasId & HasLabel & { readonly tag: string };

// 13. Partial<T>, Required<T>, Pick<T,K>, Omit<T,K>

export type PartialUser = Partial<{ name: string; age: number }>;
export type RequiredUser = Required<{ name?: string; age?: number }>;
export type PickedUser = Pick<PersonWithAddress, 'id' | 'name'>;
export type OmittedUser = Omit<PersonWithAddress, 'address' | 'billingAddress'>;

// 14. Object with all property types

export interface KitchenSink {
        id: number;
        name: string;
        tags: string[];
        point: [number, number];
        status: 'active' | 'inactive';
        metadata?: Record<string, unknown>;
        readonly version: 1 | 2 | 3;
        child?: KitchenSink; // will become IRRef (cycle check)
}

// 15. Empty interface

export interface EmptyInterface {}
export type EmptyObjectType = {};
export type EmptyRecord = Record<never, never>;
