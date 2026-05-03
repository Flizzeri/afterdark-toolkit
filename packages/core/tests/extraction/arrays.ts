// packages/core/tests/extraction/arrays.ts

// 1. Primitive element types

export type StringArray = string[];
export type NumberArray = number[];
export type BooleanArray = boolean[];
export type BigIntArray = bigint[];
export type UndefinedArray = undefined[];
export type AnyArray = any[];
export type UnknownArray = unknown[];

// Generic syntax
export type GenericStringArray = string[];
export type GenericNumberArray = number[];

// 2. Literal element types

export type StringLiteralArray = Array<'a'>;
export type NumberLiteralArray = Array<1 | 2 | 3>;
export type BooleanLiteralArray = Array<true>;
export type NullArray = null[];

// 3. Object element types

export interface Point {
        x: number;
        y: number;
}

export type PointArray = Point[];
export type InlineObjectArray = Array<{ id: number; name: string }>;

// 4. Union element types

export type StringOrNumArray = Array<string | number>;
export type NullableArray = Array<string | null>;

// 5. Nested arrays

export type Matrix = number[][];
export type DeepNested = string[][][];
export type ArrayOfArrays = boolean[][];

// 6. Array of tuples

export type PairArray = Array<[string, number]>;
export type CoordList = Array<[number, number]>;

// 7. Array in object property

export interface Container {
        items: string[];
        matrix: number[][];
        pairs: Array<[string, number]>;
        nested: boolean[][];
}

// 8. Readonly array

export type ReadonlyStrings = readonly string[];
export type ReadonlyPoints = readonly Point[];

// 9. Array element that is itself an array of arrays (deeply nested array)

export type Cube = number[][][];

// 10. Template literal element

export type PathArray = Array<`/${string}`>;
