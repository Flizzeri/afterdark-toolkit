// packages/core/tests/extraction/template-literals.ts

// 1. Single interpolation, text on both sides

export type Greeting = `Hello, ${string}!`;
export type Wrapped = `<${string}>`;
export type SlashPath = `/${string}`;
export type PrefixedId = `id_${number}`;

// 2. Interpolation at the start

export type StartsWithType = `${string}-suffix`;
export type TypeFirst = `${number}px`;
export type TypeFirstBool = `${boolean}Flag`;

// 3. Interpolation at the end

export type EndsWithType = `prefix-${string}`;
export type NumericSuffix = `count:${number}`;

// 4. Interpolation only

export type OnlyType = `${string}`;
export type OnlyNumber = `${number}`;
export type OnlyBoolean = `${boolean}`;

// 5. Multiple interpolations

export type TwoSlots = `${string}-${number}`;
export type ThreeSlots = `${string}/${string}/${string}`;
export type MixedSlots = `${number}.${number}.${number}`;
export type HttpVerb = `${string} /${string} HTTP/${number}.${number}`;

// 6. Literal type in the interpolation slot

export type KnownMethod = `${'GET' | 'POST' | 'PUT' | 'DELETE'} /${string}`;
export type EventName = `on${'Click' | 'Focus' | 'Blur'}`;
export type CssUnit = `${number}${'px' | 'em' | 'rem' | '%'}`;

// 7. Nested template literal

export type InnerPath = `/${string}`;
export type FullUrl = `https://${string}${InnerPath}`;

// 8. Template with bigint slot

export type BigIntLabel = `value:${bigint}`;

// 9. Template literals in object properties

export interface Routes {
        path: `/${string}`;
        method: `${'GET' | 'POST'}`;
        fullUrl: `https://${string}/${string}`;
}

// 10. Template literal that resolves to a known string

export type CardinalDir = 'north' | 'south' | 'east' | 'west';
export type Compass = `facing-${CardinalDir}`; // resolves to string literal union

// 11. Template literal union member

export type UrlOrPath = `https://${string}` | `/${string}`;
export type TypedKey = `user_${number}` | `post_${number}`;
