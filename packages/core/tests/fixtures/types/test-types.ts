// Test fixture for type resolution

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
export type BigIntLiteral = 123n;

// Literal Unions (should be normalized)
export type Status = 'active' | 'inactive' | 'pending';
export type Priority = 1 | 2 | 3;
export type Flag = true | false;

// Arrays
export type StringArray = string[];
export type NestedArray = number[][];

// Tuples
export type Pair = [string, number];
export type Triple = [string, number, boolean];

// Objects
export interface SimpleObject {
        name: string;
        age: number;
}

export interface NestedObject {
        user: SimpleObject;
        metadata: {
                created: string;
                updated: string;
        };
}

export interface OptionalProps {
        required: string;
        optional?: number;
}

export interface ReadonlyProps {
        readonly id: string;
        name: string;
}

// Index signatures
export interface WithStringIndex {
        known: string;
        [key: string]: string | number;
}

export type StringRecord = Record<string, number>;
export type NumberRecord = Record<number, string>;

// Unions (should be validated for homogeneity)
export type StringOrNumber = string | number;

// Discriminated union
export type Shape =
        | { kind: 'circle'; radius: number }
        | { kind: 'square'; size: number }
        | { kind: 'rectangle'; width: number; height: number };

// Intersections (should be flattened)
export type PersonWithEmail = SimpleObject & { email: string };
export type MultiIntersection = { a: string } & { b: number } & { c: boolean };

// Intersection with conflicts (should fail)
export type ConflictingIntersection = { x: string } & { x: number };

// Recursive types
export interface TreeNode {
        value: string;
        children: TreeNode[];
}

export interface LinkedList {
        data: number;
        next: LinkedList | null;
}

// Enums (should be lowered to literal unions)
export enum Color {
        Red = 'red',
        Green = 'green',
        Blue = 'blue',
}

export enum NumericEnum {
        First = 1,
        Second = 2,
        Third = 3,
}

// Type aliases (should resolve or ref)
export type AliasedString = string;
export type AliasedObject = SimpleObject;
export type ChainedAlias = AliasedString;

// Template literals (should become string)
export type Greeting = `Hello ${string}`;
export type TemplatePattern = `${string}-${number}`;

// Unsupported constructs
export type FunctionType = (x: number) => string;
export type AnyType = any;
export type UnknownType = unknown;
export type NeverType = never;
export type VoidType = void;

// Conditional types (partial support - compiler must resolve)
export type IsString<T> = T extends string ? 'yes' : 'no';
export type ConcreteConditional = IsString<string>;

// Mapped type that should resolve
export type ReadonlyObject<T> = {
        readonly [P in keyof T]: T[P];
};

export type ReadonlyPerson = ReadonlyObject<SimpleObject>;
