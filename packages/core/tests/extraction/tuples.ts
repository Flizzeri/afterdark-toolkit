// packages/core/tests/extraction/tuples.ts

// 1. Plain tuples — fixed-length, all required, no labels

export type Empty = [];
export type Single = [string];
export type PairTuple = [string, number];
export type Triple = [string, number, boolean];
export type HeterogeneousTuple = [string, number, boolean, null, bigint];

// 2. Optional elements

export type OptionalTail = [string, number?];
export type AllOptional = [string?, number?, boolean?];
export type MixedOptional = [string, number, boolean?, string?];

// 3. Rest element

export type WithRest = [string, ...number[]];
export type OnlyRest = [...string[]];
export type RestAtEnd = [string, number, ...boolean[]];

// 4. Named tuple members

export type NamedPair = [first: string, second: number];
export type NamedOptional = [name: string, age?: number];
export type NamedWithRest = [head: string, ...tail: number[]];
export type FullyNamed = [id: number, label: string, active: boolean];

// 5. Mixed named and unnamed

export type NamedWithOptAndRest = [first: string, second?: number, ...rest: boolean[]];

// 6. Tuple containing complex element types

export type TupleWithArray = [string[], number];
export type TupleWithObject = [{ id: number; name: string }, string];
export type TupleWithUnion = [string | number, boolean];
export type TupleWithNested = [[number, string], boolean[]];

// 7. Tuple used as alias

export type Coords = [lat: number, lng: number];
export type BoundingBox = [topLeft: Coords, bottomRight: Coords];

// 8. Readonly tuple

export type ReadonlyPair = readonly [string, number];
export type ReadonlyNamed = readonly [x: number, y: number, z: number];

// 9. Single-element tuple (distinct from a primitive type alias)

export type Singleton = [string];
export type SingletonOptional = [string?];

// 10. Tuple in object property

export interface HasTuple {
        point: [number, number];
        range: [min: number, max: number];
        tags: [string, ...string[]];
}
