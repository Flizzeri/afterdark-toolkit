// packages/core/tests/extraction/literals.ts

// 1. String literals

export type EmptyString = '';
export type SingleWord = 'hello';
export type Sentence = 'hello world';
export type WithSpecialChars = 'it\'s a "test"';
export type UnicodeString = '日本語';
export type Status = 'active' | 'inactive' | 'pending'; // union of string literals

// 2. Number literals

export type Zero = 0;
export type PositiveInt = 42;
export type NegativeInt = -1;
export type Float = 3.14;
export type NegativeFloat = -2.718;
export type LargeNumber = 9007199254740991; // Number.MAX_SAFE_INTEGER

// 3. Boolean literals

export type TrueLiteral = true;
export type FalseLiteral = false;
export type BoolUnion = true | false; // should produce two-member union

// 4. BigInt literals

export type ZeroBigInt = 0n;
export type PositiveBigInt = 123n;
export type NegativeBigInt = -456n;
export type LargeBigInt = 9999999999999999999n;

// 5. Null

export type NullType = null;
export type NullableString = string | null;
export type NullableNumber = number | null;

// 6. Mixed literal union

export type MixedLiterals = 'yes' | 'no' | 0 | 1 | true | false | null;

// 7. Literals as object property types

export interface Flags {
        enabled: true;
        direction: 'left' | 'right';
        priority: 1 | 2 | 3;
        count: 0n | 1n;
        nothing: null;
}

// 8. Const assertion

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number]; // 'GET' | 'POST' | 'PUT' | 'DELETE'

export const LIMITS = { min: 0, max: 100 } as const;
export type MinLimit = (typeof LIMITS)['min']; // 0
