import { describe, it, expect } from 'vitest';

import { encodeCanonical } from '../../src/canonical/encode.js';
import {
        CANONICAL_UNSUPPORTED_TYPE,
        CANONICAL_UNSTABLE_NUMBER,
        CANONICAL_BIGINT_POLICY,
} from '../../src/diagnostics/codes.js';

//
// --- Mock Fixtures ---
//

const SIMPLE_OBJECT = { a: 1, b: 'test', c: true };
const NESTED_OBJECT = { z: 1, a: { y: 2, x: [1, 2, 3] }, c: null };
const WITH_SPECIALS = {
        n: NaN,
        i: Infinity,
        negInf: -Infinity,
        b: BigInt(123456789012345678901234567890n),
};

//
// --- Helper utilities ---
//

function normalizeJson(str: string): string {
        // normalize whitespace for comparisons
        return str.replace(/\s+/g, '');
}

//
// --- Tests ---
//

describe('encodeCanonical()', () => {
        it('encodes primitives deterministically', () => {
                const { json, diagnostics } = encodeCanonical(SIMPLE_OBJECT);
                expect(normalizeJson(json)).toBe(`{"a":1,"b":"test","c":true}`);
                expect(diagnostics).toHaveLength(0);
        });

        it('sorts object keys lexicographically', () => {
                const shuffled = { b: 2, a: 1, c: 3 };
                const { json } = encodeCanonical(shuffled);
                expect(normalizeJson(json)).toBe(`{"a":1,"b":2,"c":3}`);
        });

        it('recursively encodes nested objects and arrays', () => {
                const { json, diagnostics } = encodeCanonical(NESTED_OBJECT);
                expect(diagnostics).toHaveLength(0);
                const parsed = JSON.parse(json);
                expect(parsed.a.x).toEqual([1, 2, 3]);
                expect(Object.keys(parsed)).toEqual(['a', 'c', 'z']);
        });

        it('skips unsupported types and emits diagnostics', () => {
                const input = { fn: () => {}, sym: Symbol('x'), undef: undefined };
                const { json, diagnostics } = encodeCanonical(input);
                const parsed = JSON.parse(json);
                expect(parsed).toEqual({});
                expect(diagnostics.map((d) => d.code)).toContain(CANONICAL_UNSUPPORTED_TYPE.code);
        });

        describe('handling of special numbers', () => {
                it('throws diagnostics for NaN and Infinity by default', () => {
                        const { diagnostics } = encodeCanonical(WITH_SPECIALS);
                        expect(
                                diagnostics.some((d) => d.code === CANONICAL_UNSTABLE_NUMBER.code),
                        ).toBe(true);
                });

                it('stringifies NaN/Infinity when configured', () => {
                        const { json, diagnostics } = encodeCanonical(WITH_SPECIALS, {
                                specialNumbers: 'stringify',
                        });
                        expect(diagnostics).toHaveLength(0);
                        const parsed = JSON.parse(json);
                        expect(parsed.n).toBe('NaN');
                        expect(parsed.i).toBe('Infinity');
                        expect(parsed.negInf).toBe('-Infinity');
                });

                it('replaces NaN/Infinity with null when configured', () => {
                        const { json } = encodeCanonical(WITH_SPECIALS, { specialNumbers: 'null' });
                        const parsed = JSON.parse(json);
                        expect(parsed.n).toBeNull();
                        expect(parsed.i).toBeNull();
                });
        });

        describe('handling of BigInt', () => {
                it('stringifies BigInt by default', () => {
                        const { json, diagnostics } = encodeCanonical(WITH_SPECIALS);
                        const parsed = JSON.parse(json);
                        expect(typeof parsed.b).toBe('string');
                        expect(
                                diagnostics.find((d) => d.code === CANONICAL_BIGINT_POLICY.code),
                        ).toBeUndefined();
                });

                it('emits diagnostic when BigInt disallowed', () => {
                        const { json, diagnostics } = encodeCanonical(WITH_SPECIALS, {
                                bigints: 'error',
                        });
                        const parsed = JSON.parse(json);
                        expect(parsed.b).toBeNull();
                        expect(diagnostics.map((d) => d.code)).toContain(
                                CANONICAL_BIGINT_POLICY.code,
                        );
                });
        });

        it('is stable across invocations (deterministic output)', () => {
                const input = { x: 2, y: { z: [3, 1, 2] } };
                const first = encodeCanonical(input).json;
                const second = encodeCanonical(structuredClone(input)).json;
                expect(first).toBe(second);
        });

        it('produces stable encoding for arrays of objects', () => {
                const arr = [
                        { b: 2, a: 1 },
                        { c: 3, b: 2, a: 1 },
                ];
                const { json } = encodeCanonical(arr);
                const parsed = JSON.parse(json);
                expect(parsed[0]).toEqual({ a: 1, b: 2 });
                expect(parsed[1]).toEqual({ a: 1, b: 2, c: 3 });
        });

        it('preserves determinism under pretty mode', () => {
                const compact = encodeCanonical(SIMPLE_OBJECT).json;
                const pretty = encodeCanonical(SIMPLE_OBJECT, { pretty: true }).json;
                expect(JSON.parse(compact)).toEqual(JSON.parse(pretty));
        });

        it('handles mixed content gracefully', () => {
                const input = {
                        arr: [undefined, 1, 'x', { b: 2, a: 1 }, null],
                        extra: Symbol('s'),
                };
                const { json, diagnostics } = encodeCanonical(input);
                expect(diagnostics.some((d) => d.code === CANONICAL_UNSUPPORTED_TYPE.code)).toBe(
                        true,
                );
                const parsed = JSON.parse(json);
                expect(parsed.arr).toContain(1);
                expect(parsed.arr).toContain('x');
        });
});
