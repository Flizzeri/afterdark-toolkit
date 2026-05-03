// packages/core/tests/extraction/literals.test.ts

import { describe, it, expect } from 'vitest';

import { extractIR, asLiteral, asUnion, asObject, getProp } from '../utils/extraction.js';

const F = 'extraction';

// 1. String literals

describe('string literals', () => {
        it('EmptyString → literalKind: string, value: ""', () => {
                const { ir } = extractIR(F, 'EmptyString');
                const l = asLiteral(ir);
                expect(l.literalKind).toBe('string');
                expect(l.value).toBe('');
        });

        it('SingleWord → value: "hello"', () => {
                const { ir } = extractIR(F, 'SingleWord');
                const l = asLiteral(ir);
                expect(l.value).toBe('hello');
        });

        it('WithSpecialChars → value preserved verbatim', () => {
                const { ir } = extractIR(F, 'WithSpecialChars');
                const l = asLiteral(ir);
                expect(l.literalKind).toBe('string');
                expect(typeof l.value).toBe('string');
        });

        it('UnicodeString → value is a string', () => {
                const { ir } = extractIR(F, 'UnicodeString');
                const l = asLiteral(ir);
                expect(l.literalKind).toBe('string');
        });

        it('Status → union of three string literals', () => {
                const { ir } = extractIR(F, 'Status');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(3);
                for (const m of u.members) {
                        const l = asLiteral(m.type);
                        expect(l.literalKind).toBe('string');
                }
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain('active');
                expect(values).toContain('inactive');
                expect(values).toContain('pending');
        });
});

// 2. Number literals

describe('number literals', () => {
        it('Zero → value: 0', () => {
                const { ir } = extractIR(F, 'Zero');
                const l = asLiteral(ir);
                expect(l.literalKind).toBe('number');
                expect(l.value).toBe(0);
        });

        it('PositiveInt → value: 42', () => {
                const { ir } = extractIR(F, 'PositiveInt');
                const l = asLiteral(ir);
                expect(l.value).toBe(42);
        });

        it('NegativeInt → value: -1', () => {
                const { ir } = extractIR(F, 'NegativeInt');
                const l = asLiteral(ir);
                expect(l.value).toBe(-1);
        });

        it('Float → value: 3.14', () => {
                const { ir } = extractIR(F, 'Float');
                const l = asLiteral(ir);
                expect(l.value).toBe(3.14);
        });

        it('NegativeFloat → value: -2.718', () => {
                const { ir } = extractIR(F, 'NegativeFloat');
                const l = asLiteral(ir);
                expect(l.value).toBe(-2.718);
        });

        it('LargeNumber → value is Number.MAX_SAFE_INTEGER', () => {
                const { ir } = extractIR(F, 'LargeNumber');
                const l = asLiteral(ir);
                expect(l.value).toBe(Number.MAX_SAFE_INTEGER);
        });
});

// 3. Boolean literals

describe('boolean literals', () => {
        it('TrueLiteral → literalKind: boolean, value: true', () => {
                const { ir } = extractIR(F, 'TrueLiteral');
                const l = asLiteral(ir);
                expect(l.literalKind).toBe('boolean');
                expect(l.value).toBe(true);
        });

        it('FalseLiteral → value: false', () => {
                const { ir } = extractIR(F, 'FalseLiteral');
                const l = asLiteral(ir);
                expect(l.value).toBe(false);
        });

        it('BoolUnion → union with two boolean literal members', () => {
                const { ir } = extractIR(F, 'BoolUnion');
                const u = asUnion(ir);
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain(true);
                expect(values).toContain(false);
        });
});

// 4. BigInt literals

describe('bigint literals', () => {
        it('ZeroBigInt → literalKind: bigint, value: 0n', () => {
                const { ir } = extractIR(F, 'ZeroBigInt');
                const l = asLiteral(ir);
                expect(l.literalKind).toBe('bigint');
                expect(l.value).toBe(0n);
        });

        it('PositiveBigInt → value: 123n', () => {
                const { ir } = extractIR(F, 'PositiveBigInt');
                const l = asLiteral(ir);
                expect(l.value).toBe(123n);
        });

        it('NegativeBigInt → value: -456n', () => {
                const { ir } = extractIR(F, 'NegativeBigInt');
                const l = asLiteral(ir);
                expect(l.value).toBe(-456n);
        });

        it('LargeBigInt → value is a bigint', () => {
                const { ir } = extractIR(F, 'LargeBigInt');
                const l = asLiteral(ir);
                expect(typeof l.value).toBe('bigint');
                expect(l.value).toBe(9999999999999999999n);
        });
});

// 5. Null literal

describe('null literal', () => {
        it('NullType → literalKind: null, value: null', () => {
                const { ir } = extractIR(F, 'NullType');
                const l = asLiteral(ir);
                expect(l.literalKind).toBe('null');
                expect(l.value).toBeNull();
        });

        it('NullableString → union containing null literal and string primitive', () => {
                const { ir } = extractIR(F, 'NullableString');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(2);
                const kinds = u.members.map((m) => m.type.kind);
                expect(kinds).toContain('literal');
                expect(kinds).toContain('primitive');
        });
});

// 6. Mixed literal union

describe('mixed literal union', () => {
        it('MixedLiterals → union with 7 members of various kinds', () => {
                const { ir } = extractIR(F, 'MixedLiterals');
                const u = asUnion(ir);
                // 'yes' | 'no' | 0 | 1 | true | false | null
                expect(u.members.length).toBe(7);
        });

        it('MixedLiterals contains both string and number literals', () => {
                const { ir } = extractIR(F, 'MixedLiterals');
                const u = asUnion(ir);
                const literals = u.members.map((m) => asLiteral(m.type));
                expect(literals.some((l) => l.literalKind === 'string')).toBe(true);
                expect(literals.some((l) => l.literalKind === 'number')).toBe(true);
                expect(literals.some((l) => l.literalKind === 'boolean')).toBe(true);
                expect(literals.some((l) => l.literalKind === 'null')).toBe(true);
        });
});

// 7. Literals as object property types

describe('literals as object properties', () => {
        it('Flags.enabled → literal true', () => {
                const { ir } = extractIR(F, 'Flags');
                const obj = asObject(ir);
                const prop = getProp(obj, 'enabled');
                const l = asLiteral(prop.type);
                expect(l.value).toBe(true);
        });

        it('Flags.direction → union of two string literals', () => {
                const { ir } = extractIR(F, 'Flags');
                const obj = asObject(ir);
                const prop = getProp(obj, 'direction');
                const u = asUnion(prop.type);
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain('left');
                expect(values).toContain('right');
        });

        it('Flags.priority → union of three number literals', () => {
                const { ir } = extractIR(F, 'Flags');
                const obj = asObject(ir);
                const prop = getProp(obj, 'priority');
                const u = asUnion(prop.type);
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain(1);
                expect(values).toContain(2);
                expect(values).toContain(3);
        });

        it('Flags.count → union of two bigint literals', () => {
                const { ir } = extractIR(F, 'Flags');
                const obj = asObject(ir);
                const prop = getProp(obj, 'count');
                const u = asUnion(prop.type);
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain(0n);
                expect(values).toContain(1n);
        });

        it('Flags.nothing → null literal', () => {
                const { ir } = extractIR(F, 'Flags');
                const obj = asObject(ir);
                const prop = getProp(obj, 'nothing');
                const l = asLiteral(prop.type);
                expect(l.value).toBeNull();
        });
});

// 8. Const assertion

describe('const assertion types', () => {
        it('HttpMethod → union of four string literals', () => {
                const { ir } = extractIR(F, 'HttpMethod');
                const u = asUnion(ir);
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain('GET');
                expect(values).toContain('POST');
                expect(values).toContain('PUT');
                expect(values).toContain('DELETE');
        });

        it('MinLimit → literal number 0', () => {
                const { ir } = extractIR(F, 'MinLimit');
                const l = asLiteral(ir);
                expect(l.literalKind).toBe('number');
                expect(l.value).toBe(0);
        });
});
