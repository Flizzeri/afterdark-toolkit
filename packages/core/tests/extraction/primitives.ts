// packages/core/tests/extraction/primitives.ts

// 1. All ten primitive kinds

export type PStr = string;
export type PNum = number;
export type PBool = boolean;
export type PBigInt = bigint;
export type PSym = symbol;
export type PUndef = undefined;
export type PVoid = void;
export type PNever = never;
export type PAny = any;
export type PUnknown = unknown;

// 2. Annotated primitives

/** @minLength(1) @maxLength(255) */
export type Email = string;

/** @min(0) @max(150) */
export type Age = number;

/** @legacy Use Age instead */
export type LegacyAge = number;

// 3. Documented primitive

/**
 * An ISO 8601 date string.
 * Must be in the format YYYY-MM-DD.
 */
export type DateString = string;

// 4. Primitives as object properties

export interface AllPrimitiveFields {
        str: string;
        num: number;
        bool: boolean;
        big: bigint;
        sym: symbol;
        undef: undefined;
        voidProp: void;
        anyProp: any;
        unknownProp: unknown;
}

// 5. Union members that are primitives

export type StringOrNumber = string | number;
export type AnyPrimitive = string | number | boolean | bigint | symbol | undefined | null;
