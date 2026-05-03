// packages/core/tests/extraction/tuples.test.ts

import { describe, it, expect } from 'vitest';

import { extractIR, asTuple, asPrimitive, asObject, IRNodeGuard } from '../utils/extraction.js';

const F = 'extraction';

// 1. Plain tuples

describe('plain tuples', () => {
        it('Empty → tuple with 0 elements, no rest', () => {
                const { ir } = extractIR(F, 'Empty');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(0);
                expect(t.rest).toBeUndefined();
        });

        it('Single → 1 required element', () => {
                const { ir } = extractIR(F, 'Single');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(1);
                expect(t.elements[0].optional).toBe(false);
                asPrimitive(t.elements[0].type);
        });

        it('PairTuple → [string, number]', () => {
                const { ir } = extractIR(F, 'PairTuple');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(2);
                expect(asPrimitive(t.elements[0].type).primitiveKind).toBe('string');
                expect(asPrimitive(t.elements[1].type).primitiveKind).toBe('number');
        });

        it('Triple → 3 elements', () => {
                const { ir } = extractIR(F, 'Triple');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(3);
        });

        it('HeterogeneousTuple → 5 elements', () => {
                const { ir } = extractIR(F, 'HeterogeneousTuple');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(5);
        });
});

// 2. Optional elements

describe('optional tuple elements', () => {
        it('OptionalTail → [string, number?]: second is optional', () => {
                const { ir } = extractIR(F, 'OptionalTail');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(2);
                expect(t.elements[0].optional).toBe(false);
                expect(t.elements[1].optional).toBe(true);
        });

        it('AllOptional → all 3 elements optional', () => {
                const { ir } = extractIR(F, 'AllOptional');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(3);
                expect(t.elements.every((e) => e.optional)).toBe(true);
        });

        it('MixedOptional → first two required, last two optional', () => {
                const { ir } = extractIR(F, 'MixedOptional');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(4);
                expect(t.elements[0].optional).toBe(false);
                expect(t.elements[1].optional).toBe(false);
                expect(t.elements[2].optional).toBe(true);
                expect(t.elements[3].optional).toBe(true);
        });
});

// 3. Rest elements

describe('rest elements', () => {
        it('WithRest → [string, ...number[]]: 1 element, rest is array of number', () => {
                const { ir } = extractIR(F, 'WithRest');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(1);
                expect(t.rest).toBeDefined();
                // rest.type for a rest element is the element type, not the array
                expect(t.rest!.optional).toBe(false);
        });

        it('OnlyRest → 0 elements, rest defined', () => {
                const { ir } = extractIR(F, 'OnlyRest');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(0);
                expect(t.rest).toBeDefined();
        });

        it('RestAtEnd → 2 required elements, rest at end', () => {
                const { ir } = extractIR(F, 'RestAtEnd');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(2);
                expect(t.rest).toBeDefined();
        });
});

// 4. Named tuple members

describe('named tuple members', () => {
        it('NamedPair → 2 elements (name does not affect structure)', () => {
                const { ir } = extractIR(F, 'NamedPair');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(2);
                expect(asPrimitive(t.elements[0].type).primitiveKind).toBe('string');
                expect(asPrimitive(t.elements[1].type).primitiveKind).toBe('number');
        });

        it('NamedOptional → second element is optional', () => {
                const { ir } = extractIR(F, 'NamedOptional');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(2);
                expect(t.elements[1].optional).toBe(true);
        });

        it('NamedWithRest → 1 element, rest defined', () => {
                const { ir } = extractIR(F, 'NamedWithRest');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(1);
                expect(t.rest).toBeDefined();
        });

        it('FullyNamed → 3 elements with correct types', () => {
                const { ir } = extractIR(F, 'FullyNamed');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(3);
                expect(asPrimitive(t.elements[0].type).primitiveKind).toBe('number');
                expect(asPrimitive(t.elements[1].type).primitiveKind).toBe('string');
                expect(asPrimitive(t.elements[2].type).primitiveKind).toBe('boolean');
        });
});

// 5. Named with optional and rest combined

describe('named with opt + rest combined', () => {
        it('NamedWithOptAndRest → 1 required, 1 optional, rest', () => {
                const { ir } = extractIR(F, 'NamedWithOptAndRest');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(2);
                expect(t.elements[0].optional).toBe(false);
                expect(t.elements[1].optional).toBe(true);
                expect(t.rest).toBeDefined();
        });
});

// 6. Complex element types

describe('complex element types', () => {
        it('TupleWithArray → first element is IRArray', () => {
                const { ir } = extractIR(F, 'TupleWithArray');
                const t = asTuple(ir);
                expect(IRNodeGuard.isArray(t.elements[0].type)).toBe(true);
        });

        it('TupleWithObject → first element is IRObject', () => {
                const { ir } = extractIR(F, 'TupleWithObject');
                const t = asTuple(ir);
                expect(IRNodeGuard.isObject(t.elements[0].type)).toBe(true);
        });

        it('TupleWithUnion → first element is IRUnion', () => {
                const { ir } = extractIR(F, 'TupleWithUnion');
                const t = asTuple(ir);
                expect(IRNodeGuard.isUnion(t.elements[0].type)).toBe(true);
        });

        it('TupleWithNested → first element is itself a tuple', () => {
                const { ir } = extractIR(F, 'TupleWithNested');
                const t = asTuple(ir);
                expect(IRNodeGuard.isTuple(t.elements[0].type)).toBe(true);
        });
});

// 7. Alias chains preserved

describe('alias chain preserves tuple structure', () => {
        it('Coords → tuple [lat: number, lng: number]', () => {
                const { ir } = extractIR(F, 'Coords');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(2);
                for (const e of t.elements) {
                        expect(asPrimitive(e.type).primitiveKind).toBe('number');
                }
        });

        it('BoundingBox → tuple of two Coords tuples', () => {
                const { ir } = extractIR(F, 'BoundingBox');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(2);
                for (const e of t.elements) {
                        expect(IRNodeGuard.isTuple(e.type)).toBe(true);
                }
        });
});

// 8. Readonly tuple

describe('readonly tuple', () => {
        it('ReadonlyPair → same structure as mutable Pair', () => {
                const { ir } = extractIR(F, 'ReadonlyPair');
                const t = asTuple(ir);
                expect(t.elements).toHaveLength(2);
        });
});

// 9. Tuple in object property

describe('tuple as object property', () => {
        it('HasTuple.point → tuple with 2 number elements', () => {
                const { ir } = extractIR(F, 'HasTuple');
                const obj = asObject(ir);
                const point = obj.properties.find((p) => p.name === 'point')!;
                const t = asTuple(point.type);
                expect(t.elements).toHaveLength(2);
        });

        it('HasTuple.tags → tuple with 1 element and a rest', () => {
                const { ir } = extractIR(F, 'HasTuple');
                const obj = asObject(ir);
                const tags = obj.properties.find((p) => p.name === 'tags')!;
                const t = asTuple(tags.type);
                expect(t.elements).toHaveLength(1);
                expect(t.rest).toBeDefined();
        });
});

// 10. Element spans

describe('tuple element spans', () => {
        it('every element in PairTuple has a span', () => {
                const { ir } = extractIR(F, 'PairTuple');
                const t = asTuple(ir);
                for (const e of t.elements) {
                        expect(e.span).toBeDefined();
                }
        });
});
