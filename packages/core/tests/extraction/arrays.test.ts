// packages/core/tests/extraction/arrays.test.ts

import { describe, it, expect } from 'vitest';

import {
        extractIR,
        asArray,
        asPrimitive,
        asObject,
        asTuple,
        asUnion,
        asLiteral,
        IRNodeGuard,
} from '../utils/extraction.js';

const F = 'extraction';

// 1. Primitive element types

describe('primitive element arrays', () => {
        const cases: Array<[string, string]> = [
                ['StringArray', 'string'],
                ['NumberArray', 'number'],
                ['BooleanArray', 'boolean'],
                ['BigIntArray', 'bigint'],
                ['UndefinedArray', 'undefined'],
                ['AnyArray', 'any'],
                ['UnknownArray', 'unknown'],
        ];

        for (const [name, kind] of cases) {
                it(`${name} → array of ${kind}`, () => {
                        const { ir } = extractIR(F, name);
                        const a = asArray(ir);
                        expect(asPrimitive(a.element).primitiveKind).toBe(kind);
                });
        }

        it('GenericStringArray (Array<string>) → same structure as T[]', () => {
                const { ir: shorthand } = extractIR(F, 'StringArray');
                const { ir: generic } = extractIR(F, 'GenericStringArray');
                expect(asArray(shorthand).element.kind).toBe(asArray(generic).element.kind);
                expect(asPrimitive(asArray(generic).element).primitiveKind).toBe('string');
        });
});

// 2. Literal element types

describe('literal element arrays', () => {
        it('StringLiteralArray → array of string literal "a"', () => {
                const { ir } = extractIR(F, 'StringLiteralArray');
                const a = asArray(ir);
                expect(asLiteral(a.element).value).toBe('a');
        });

        it('NumberLiteralArray → array of union of number literals', () => {
                const { ir } = extractIR(F, 'NumberLiteralArray');
                const a = asArray(ir);
                expect(IRNodeGuard.isUnion(a.element)).toBe(true);
        });

        it('BooleanLiteralArray → array of boolean literal true', () => {
                const { ir } = extractIR(F, 'BooleanLiteralArray');
                const a = asArray(ir);
                expect(asLiteral(a.element).value).toBe(true);
        });

        it('NullArray → array of null literal', () => {
                const { ir } = extractIR(F, 'NullArray');
                const a = asArray(ir);
                expect(asLiteral(a.element).literalKind).toBe('null');
        });
});

// 3. Object element types

describe('object element arrays', () => {
        it('PointArray → array of IRObject with x and y', () => {
                const { ir } = extractIR(F, 'PointArray');
                const a = asArray(ir);
                const obj = asObject(a.element);
                const names = obj.properties.map((p) => p.name);
                expect(names).toContain('x');
                expect(names).toContain('y');
        });

        it('InlineObjectArray → array of inline object', () => {
                const { ir } = extractIR(F, 'InlineObjectArray');
                const a = asArray(ir);
                expect(IRNodeGuard.isObject(a.element)).toBe(true);
        });
});

// 4. Union element types

describe('union element arrays', () => {
        it('StringOrNumArray → array element is union of string | number', () => {
                const { ir } = extractIR(F, 'StringOrNumArray');
                const a = asArray(ir);
                const u = asUnion(a.element);
                const kinds = u.members.map((m) => asPrimitive(m.type).primitiveKind);
                expect(kinds).toContain('string');
                expect(kinds).toContain('number');
        });

        it('NullableArray → array element is string | null', () => {
                const { ir } = extractIR(F, 'NullableArray');
                const a = asArray(ir);
                expect(IRNodeGuard.isUnion(a.element)).toBe(true);
        });
});

// 5. Nested arrays

describe('nested arrays', () => {
        it('Matrix (number[][]) → array of array of number', () => {
                const { ir } = extractIR(F, 'Matrix');
                const outer = asArray(ir);
                const inner = asArray(outer.element, 'inner element');
                expect(asPrimitive(inner.element).primitiveKind).toBe('number');
        });

        it('DeepNested (string[][][]) → 3 levels deep', () => {
                const { ir } = extractIR(F, 'DeepNested');
                const l1 = asArray(ir);
                const l2 = asArray(l1.element);
                const l3 = asArray(l2.element);
                expect(asPrimitive(l3.element).primitiveKind).toBe('string');
        });

        it('ArrayOfArrays (Array<Array<boolean>>) → same as boolean[][]', () => {
                const { ir } = extractIR(F, 'ArrayOfArrays');
                const l1 = asArray(ir);
                const l2 = asArray(l1.element);
                expect(asPrimitive(l2.element).primitiveKind).toBe('boolean');
        });
});

// 6. Array of tuples

describe('array of tuples', () => {
        it('PairArray → array element is a tuple', () => {
                const { ir } = extractIR(F, 'PairArray');
                const a = asArray(ir);
                expect(IRNodeGuard.isTuple(a.element)).toBe(true);
        });

        it('CoordList → array of [number, number] tuples', () => {
                const { ir } = extractIR(F, 'CoordList');
                const a = asArray(ir);
                const t = asTuple(a.element);
                expect(t.elements).toHaveLength(2);
        });
});

// 7. Arrays in object properties

describe('arrays as object properties', () => {
        it('Container.items → string array', () => {
                const { ir } = extractIR(F, 'Container');
                const obj = asObject(ir);
                const items = obj.properties.find((p) => p.name === 'items')!;
                expect(asPrimitive(asArray(items.type).element).primitiveKind).toBe('string');
        });

        it('Container.matrix → array of array of number', () => {
                const { ir } = extractIR(F, 'Container');
                const obj = asObject(ir);
                const matrix = obj.properties.find((p) => p.name === 'matrix')!;
                const outer = asArray(matrix.type);
                expect(IRNodeGuard.isArray(outer.element)).toBe(true);
        });
});

// 8. Readonly arrays

describe('readonly arrays', () => {
        it('ReadonlyStrings → extracted as IRArray of string', () => {
                const { ir } = extractIR(F, 'ReadonlyStrings');
                const a = asArray(ir);
                expect(asPrimitive(a.element).primitiveKind).toBe('string');
        });

        it('ReadonlyPoints → extracted as IRArray of object', () => {
                const { ir } = extractIR(F, 'ReadonlyPoints');
                const a = asArray(ir);
                expect(IRNodeGuard.isObject(a.element)).toBe(true);
        });
});

// 9. Deeply nested

describe('deeply nested cube', () => {
        it('Cube → 3 levels of IRArray wrapping number primitive', () => {
                const { ir } = extractIR(F, 'Cube');
                const l1 = asArray(ir);
                const l2 = asArray(l1.element);
                const l3 = asArray(l2.element);
                expect(asPrimitive(l3.element).primitiveKind).toBe('number');
        });
});

// 10. Template literal element

describe('template literal element array', () => {
        it('PathArray → array element is a templateLiteral', () => {
                const { ir } = extractIR(F, 'PathArray');
                const a = asArray(ir);
                expect(IRNodeGuard.isTemplateLiteral(a.element)).toBe(true);
        });
});

// 11. Array metadata

describe('array metadata', () => {
        it('array node has symbolId', () => {
                const { ir } = extractIR(F, 'StringArray');
                expect(typeof ir.metadata.symbolId).toBe('string');
        });
});
