// packages/core/tests/fixtures/types/test-types.ts

// Primitives
export type StringType = string;
export type NumberType = number;
export type BooleanType = boolean;
export type BigIntType = bigint;
export type NullType = null;
export type UndefinedType = undefined;

// Literals
export type StringLiteral = 'hello';
export type NumberLiteral = 42;
export type BooleanLiteral = true;
export type FalseLiteral = false;
export type BigIntLiteral = 9007199254740991n;
export type NegativeBigIntLiteral = -123456789012345n;

// Enum
export enum NumericEnum {
        A = 1,
        B = 2,
        C = 3,
}

export enum StringEnum {
        Red = 'RED',
        Green = 'GREEN',
        Blue = 'BLUE',
}

export type NumericEnumMember = NumericEnum.A;
export type StringEnumMember = StringEnum.Red;

// Literal Unions
export type Status = 'active' | 'pending' | 'inactive';
export type Priority = 1 | 2 | 3;
export type MixedLiterals = 'a' | 1 | true;

// Arrays
export type StringArray = string[];
export type NumberArray = Array<number>;
export type NestedArray = string[][];

// Tuples
export type SimpleTuple = [string, number];
export type MixedTuple = [string, number, boolean];
export type EmptyTuple = [];

// Objects
export interface SimpleObject {
        name: string;
        age: number;
}

export interface OptionalProps {
        required: string;
        optional?: number;
}

export interface ReadonlyProps {
        readonly id: string;
        name: string;
}

export interface WithStringIndex {
        [key: string]: number;
}

export interface WithNumberIndex {
        [key: number]: string;
}

export interface MixedWithIndex {
        name: string;
        [key: string]: string;
}

// Nested Objects
export interface NestedObject {
        outer: {
                inner: {
                        value: string;
                };
        };
}

// Records
export type StringRecord = Record<string, number>;
export type NumberRecord = Record<number, string>;

// Unions
export type StringOrNumber = string | number;
export type NullableString = string | null;
export type OptionalString = string | undefined;
export type NullableObject = { id: string } | null;

// Discriminated Unions
export type Shape =
        | { kind: 'circle'; radius: number }
        | { kind: 'square'; size: number }
        | { kind: 'rectangle'; width: number; height: number };

// Heterogeneous unions (should fail)
export type HeterogeneousUnion = { a: string } | string;

// Intersections
export type Person = { name: string; age: number };
export type Email = { email: string };
export type PersonWithEmail = Person & Email;

export type TypeA = { a: string };
export type TypeB = { b: number };
export type TypeC = { c: boolean };
export type MultiIntersection = TypeA & TypeB & TypeC;

// Conflicting intersection (should fail)
export type Conflict1 = { value: string };
export type Conflict2 = { value: number };
export type ConflictingIntersection = Conflict1 & Conflict2;

// Intersection with index signatures
export type WithIndexA = { [key: string]: number };
export type WithIndexB = { [key: string]: string };
export type ConflictingIndexSignatures = WithIndexA & WithIndexB;

// Recursive Types
export interface TreeNode {
        value: string;
        children: TreeNode[];
}

export interface LinkedList {
        value: number;
        next: LinkedList | null;
}

export type RecursiveUnion = { value: string; next: RecursiveUnion } | null;

// Template Literals
export type Greeting = `Hello, ${'world' | 'friend'}`;

// Unsupported Constructs
export type FunctionType = (x: number) => string;
export type ConstructorType = new (x: number) => Date;
export type AnyType = any;
export type UnknownType = unknown;
export type NeverType = never;
export type VoidType = void;

// Type Aliases
export type AliasedString = StringType;
export type DoubleAliased = AliasedString;

// Complex nested union
export type ComplexUnion =
        | { type: 'a'; data: string }
        | { type: 'b'; data: number }
        | { type: 'c'; data: boolean };

// Union with null (should be allowed)
export type NullableUnion = { id: string; name: string } | { id: string; age: number } | null;

// Circular type with union
export interface CircularA {
        value: string;
        b: CircularB | null;
}

export interface CircularB {
        value: number;
        a: CircularA | null;
}

// Mixed object and properties with index signature
export interface ComplexObject {
        id: string;
        data: {
                nested: string;
        };
        [key: string]: any;
}

// Type with callable signature (should fail)
export interface CallableInterface {
        (x: number): string;
        prop: string;
}
