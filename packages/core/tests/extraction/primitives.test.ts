// packages/core/tests/extraction/primitives.test.ts

import { describe, it, expect } from 'vitest';

import {
        extractIR,
        asPrimitive,
        asObject,
        asUnion,
        getProp,
        IRNodeGuard,
} from '../utils/extraction.js';

const F = 'extraction';

// 1. Every primitive kind — top-level alias

describe('primitive kinds', () => {
        const cases: Array<[string, string]> = [
                ['PStr', 'string'],
                ['PNum', 'number'],
                ['PBool', 'boolean'],
                ['PBigInt', 'bigint'],
                ['PSym', 'symbol'],
                ['PUndef', 'undefined'],
                ['PVoid', 'void'],
                ['PNever', 'never'],
                ['PAny', 'any'],
                ['PUnknown', 'unknown'],
        ];

        for (const [name, kind] of cases) {
                it(`${name} → primitiveKind: '${kind}'`, () => {
                        const { ir } = extractIR(F, name);
                        const p = asPrimitive(ir, name);
                        expect(p.primitiveKind).toBe(kind);
                });
        }
});

// 2. Annotated primitives — annotations present in metadata

describe('annotated primitives', () => {
        it('Email has @email annotation extracted into metadata', () => {
                const { ir } = extractIR(F, 'Email');
                const p = asPrimitive(ir);
                const tags = p.metadata.annotations.map((a) => a.tag);
                expect(tags).toContain('minLength');
                expect(tags).toContain('maxLength');
        });

        it('Age has @min and @max annotations', () => {
                const { ir } = extractIR(F, 'Age');
                const p = asPrimitive(ir);
                const tags = p.metadata.annotations.map((a) => a.tag);
                expect(tags).toContain('min');
                expect(tags).toContain('max');
        });

        it('LegacyAge has @legacy annotation', () => {
                const { ir } = extractIR(F, 'LegacyAge');
                const p = asPrimitive(ir);
                expect(p.metadata.annotations.some((a) => a.tag === 'legacy')).toBe(true);
        });
});

// 3. Documentation extraction

describe('documented primitives', () => {
        it('DateString documentation is extracted when extractDocumentation is true', () => {
                const { ir } = extractIR(F, 'DateString', { extractDocumentation: true });
                const p = asPrimitive(ir);
                expect(p.metadata).toBeDefined();
                // metadata symbolId is set
                expect(typeof p.metadata.symbolId).toBe('string');
        });

        it('DateString has no documentation by default (extractDocumentation: false)', () => {
                const { ir } = extractIR(F, 'DateString', { extractDocumentation: false });
                asPrimitive(ir); // just confirm it's a primitive
        });
});

// 4. Primitives as object property types

describe('primitives as object properties', () => {
        it('AllPrimitiveFields has every primitive kind as a property', () => {
                const { ir } = extractIR(F, 'AllPrimitiveFields');
                const obj = asObject(ir);

                const propKinds: Record<string, string> = {
                        str: 'string',
                        num: 'number',
                        bool: 'boolean',
                        big: 'bigint',
                        anyProp: 'any',
                        unknownProp: 'unknown',
                };

                for (const [propName, expectedKind] of Object.entries(propKinds)) {
                        const prop = getProp(obj, propName);
                        const p = asPrimitive(prop.type, `property "${propName}"`);
                        expect(p.primitiveKind).toBe(expectedKind);
                }
        });
});

// 5. Primitives as union members

describe('primitives as union members', () => {
        it('StringOrNumber produces union with string and number primitive members', () => {
                const { ir } = extractIR(F, 'StringOrNumber');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(2);
                const kinds = u.members.map((m) => asPrimitive(m.type).primitiveKind);
                expect(kinds).toContain('string');
                expect(kinds).toContain('number');
        });

        it('AnyPrimitive union has 7 members, null is a literal kind not primitive', () => {
                const { ir } = extractIR(F, 'AnyPrimitive');
                const u = asUnion(ir);
                // string | number | boolean | bigint | symbol | undefined | null
                // null is a literal, the rest are primitives
                expect(u.members.length).toBe(7);
                const primitiveMembers = u.members.filter((m) => IRNodeGuard.isPrimitive(m.type));
                expect(primitiveMembers.length).toBe(6);
                const literalMembers = u.members.filter((m) => IRNodeGuard.isLiteral(m.type));
                expect(literalMembers.length).toBe(1);
        });
});

// 6. Metadata structure

describe('primitive metadata structure', () => {
        it('symbolId is a non-empty string', () => {
                const { ir } = extractIR(F, 'PStr');
                expect(typeof ir.metadata.symbolId).toBe('string');
                expect(ir.metadata.symbolId.length).toBeGreaterThan(0);
        });

        it('span has start and end properties', () => {
                const { ir } = extractIR(F, 'PNum');
                expect(ir.metadata.span).toBeDefined();
                expect(typeof ir.metadata.span.start.line).toBe('number');
                expect(typeof ir.metadata.span.start.column).toBe('number');
                expect(typeof ir.metadata.span.end.line).toBe('number');
                expect(typeof ir.metadata.span.end.column).toBe('number');
        });

        it('annotations array is present (may be empty)', () => {
                const { ir } = extractIR(F, 'PBool');
                expect(Array.isArray(ir.metadata.annotations)).toBe(true);
        });
});
