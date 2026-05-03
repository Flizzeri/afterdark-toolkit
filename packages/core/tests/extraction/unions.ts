// packages/core/tests/extraction/unions.ts

// 1. Basic unions — AST path (UnionTypeNode), all primitive members

export type StringOrNum = string | number;
export type ThreeWay = string | number | boolean;
export type NullableUnion = string | null;
export type OptionalString = string | undefined;
export type PrimitiveOrNull = number | null | undefined;

// 2. Union of object types — non-discriminated

export interface Cat {
        legs: 4;
        noise: 'meow';
}

export interface Bird {
        wings: 2;
        sound: 'tweet';
}

export type Animal = Cat | Bird;

// 3. Discriminated union

export interface OkResult {
        status: 'ok';
        data: string;
}

export interface ErrResult {
        status: 'error';
        message: string;
}

export type Result = OkResult | ErrResult;

// Three-way discriminated union
export interface LoadingState {
        status: 'loading';
}

export interface SuccessState {
        status: 'success';
        value: number;
}

export interface FailureState {
        status: 'failure';
        error: string;
}

export type AsyncState = LoadingState | SuccessState | FailureState;

// 4. Non-discriminated union of objects

export interface WithKind {
        kind: 'a';
        value: string;
}

export interface WithoutKind {
        // no kind property — prevents discriminant detection
        data: number;
}

export type MixedMembers = WithKind | WithoutKind;

// 5. Would-be discriminant but property is optional

export interface OptionalDiscriminant {
        kind?: 'x';
        value: string;
}

export interface AlsoOptionalDiscriminant {
        kind?: 'y';
        value: number;
}

export type OptionalKindUnion = OptionalDiscriminant | AlsoOptionalDiscriminant;

// 6. Would-be discriminant but property type is not a literal

export interface NonLiteralKind {
        kind: string; // not a literal — disqualifies discriminant
        value: number;
}

export interface AlsoNonLiteralKind {
        kind: string;
        value: string;
}

export type NonLiteralDiscriminant = NonLiteralKind | AlsoNonLiteralKind;

// 7. Duplicate discriminant values

export interface DupKindA {
        type: 'dup';
        a: string;
}

export interface DupKindB {
        type: 'dup'; // same literal value — disqualifies discriminant
        b: number;
}

export type DuplicateDiscriminant = DupKindA | DupKindB;

// 8. Union containing non-object members

export type ObjectOrPrimitive = { value: string } | string;

// 9. String enums

export enum Direction {
        Up = 'UP',
        Down = 'DOWN',
        Left = 'LEFT',
        Right = 'RIGHT',
}

export enum Color {
        Red = 'red',
        Green = 'green',
        Blue = 'blue',
}

// 10. Numeric enums

export enum Priority {
        Low,
        Medium,
        High,
}

export enum HttpStatus {
        OK = 200,
        NotFound = 404,
        InternalServerError = 500,
}

// 11. Const enum

export const enum Weekday {
        Mon = 1,
        Tue,
        Wed,
        Thu,
        Fri,
}

// 12. Nested / recursive union

export type Inner = 'a' | 'b';
export type Outer = Inner | 'c'; // checker flattens to 'a' | 'b' | 'c' but AST sees Inner | 'c'

// 13. Union with parenthesized member — exercises the parenthesized unwrap
//    in dispatchFromAstNode

export type ParenUnion = (string | number) | boolean;

// 14. Union with array and object members

export type ComplexUnion = string[] | { name: string } | null;
