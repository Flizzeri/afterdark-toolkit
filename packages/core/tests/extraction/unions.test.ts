// packages/core/tests/extraction/unions.test.ts

import { describe, it, expect } from 'vitest';

import { extractIR, asUnion, asLiteral, asPrimitive, IRNodeGuard } from '../utils/extraction.js';

const F = 'extraction';

// 1. Basic unions

describe('basic unions', () => {
        it('StringOrNum → 2-member union of primitives', () => {
                const { ir } = extractIR(F, 'StringOrNum');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(2);
                const kinds = u.members.map((m) => asPrimitive(m.type).primitiveKind);
                expect(kinds).toContain('string');
                expect(kinds).toContain('number');
        });

        it('ThreeWay → 3 members', () => {
                const { ir } = extractIR(F, 'ThreeWay');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(3);
        });

        it('NullableUnion → string | null, null member is IRLiteral', () => {
                const { ir } = extractIR(F, 'NullableUnion');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(2);
                const nullMember = u.members.find((m) => IRNodeGuard.isLiteral(m.type));
                expect(nullMember).toBeDefined();
                expect(asLiteral(nullMember!.type).literalKind).toBe('null');
        });

        it('PrimitiveOrNull → 3 members', () => {
                const { ir } = extractIR(F, 'PrimitiveOrNull');
                const u = asUnion(ir);
                expect(u.members.length).toBe(3);
        });

        it('members each have a span', () => {
                const { ir } = extractIR(F, 'StringOrNum');
                const u = asUnion(ir);
                for (const m of u.members) {
                        expect(m.span).toBeDefined();
                }
        });
});

// 2. Union of object types (non-discriminated)

describe('union of object types', () => {
        it('Animal → 2-member union, both members are objects', () => {
                const { ir } = extractIR(F, 'Animal');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(2);
                for (const m of u.members) {
                        expect(IRNodeGuard.isObject(m.type)).toBe(true);
                }
        });

        it('Animal has no discriminant (no shared literal property)', () => {
                const { ir } = extractIR(F, 'Animal');
                const u = asUnion(ir);
                expect(u.discriminant).toBeUndefined();
        });
});

// 3. Discriminated unions

describe('discriminated unions', () => {
        it('Result → discriminant on "status" property', () => {
                const { ir } = extractIR(F, 'Result');
                const u = asUnion(ir);
                expect(u.discriminant).toBeDefined();
                expect(u.discriminant!.propertyName).toBe('status');
        });

        it('Result discriminant values are ["ok", "error"]', () => {
                const { ir } = extractIR(F, 'Result');
                const u = asUnion(ir);
                const values = u.discriminant!.values;
                expect(values).toContain('ok');
                expect(values).toContain('error');
        });

        it('AsyncState → 3-way discriminant on "status"', () => {
                const { ir } = extractIR(F, 'AsyncState');
                const u = asUnion(ir);
                expect(u.discriminant).toBeDefined();
                expect(u.discriminant!.propertyName).toBe('status');
                expect(u.discriminant!.values).toHaveLength(3);
        });
});

// 4. Discriminant detection — failure cases

describe('discriminant detection failure cases', () => {
        it('MixedMembers → no discriminant (one member missing the property)', () => {
                const { ir } = extractIR(F, 'MixedMembers');
                const u = asUnion(ir);
                expect(u.discriminant).toBeUndefined();
        });

        it('OptionalKindUnion → no discriminant (property is optional)', () => {
                const { ir } = extractIR(F, 'OptionalKindUnion');
                const u = asUnion(ir);
                expect(u.discriminant).toBeUndefined();
        });

        it('NonLiteralDiscriminant → no discriminant (property type is string, not literal)', () => {
                const { ir } = extractIR(F, 'NonLiteralDiscriminant');
                const u = asUnion(ir);
                expect(u.discriminant).toBeUndefined();
        });

        it('DuplicateDiscriminant → no discriminant (duplicate literal values)', () => {
                const { ir } = extractIR(F, 'DuplicateDiscriminant');
                const u = asUnion(ir);
                expect(u.discriminant).toBeUndefined();
        });

        it('ObjectOrPrimitive → no discriminant (non-object member)', () => {
                const { ir } = extractIR(F, 'ObjectOrPrimitive');
                const u = asUnion(ir);
                expect(u.discriminant).toBeUndefined();
        });
});

// 5. String enums

describe('string enums', () => {
        it('Direction → union with 4 string literal members', () => {
                const { ir } = extractIR(F, 'Direction');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(4);
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain('UP');
                expect(values).toContain('DOWN');
                expect(values).toContain('LEFT');
                expect(values).toContain('RIGHT');
        });

        it('Color → union with 3 string literal members', () => {
                const { ir } = extractIR(F, 'Color');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(3);
        });
});

// 6. Numeric enums

describe('numeric enums', () => {
        it('Priority → union with 3 number literal members (0, 1, 2)', () => {
                const { ir } = extractIR(F, 'Priority');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(3);
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain(0);
                expect(values).toContain(1);
                expect(values).toContain(2);
        });

        it('HttpStatus → values 200, 404, 500', () => {
                const { ir } = extractIR(F, 'HttpStatus');
                const u = asUnion(ir);
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain(200);
                expect(values).toContain(404);
                expect(values).toContain(500);
        });
});

// 7. Nested / aliased union

describe('aliased union members', () => {
        it('Outer → 2-member union: first member is Inner (nested union), second is literal "c"', () => {
                const { ir } = extractIR(F, 'Outer');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(2);
                // First member: the Inner union ('a' | 'b')
                const innerUnion = asUnion(u.members[0].type, 'Inner member');
                const innerValues = innerUnion.members.map((m) => asLiteral(m.type).value);
                expect(innerValues).toContain('a');
                expect(innerValues).toContain('b');
                // Second member: the literal 'c'
                expect(asLiteral(u.members[1].type).value).toBe('c');
        });
});

// 8. ComplexUnion

describe('complex union members', () => {
        it('ComplexUnion → 3 members: array, object, null literal', () => {
                const { ir } = extractIR(F, 'ComplexUnion');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(3);
                const kinds = u.members.map((m) => m.type.kind);
                expect(kinds).toContain('array');
                expect(kinds).toContain('object');
                expect(kinds).toContain('literal');
        });
});

// 9. Union metadata

describe('union metadata', () => {
        it('union node has a symbolId', () => {
                const { ir } = extractIR(F, 'StringOrNum');
                expect(typeof ir.metadata.symbolId).toBe('string');
        });

        it('discriminant span is defined when discriminant is present', () => {
                const { ir } = extractIR(F, 'Result');
                const u = asUnion(ir);
                expect(u.discriminant!.span).toBeDefined();
        });
});
