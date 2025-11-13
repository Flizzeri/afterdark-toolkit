import { describe, it, expect } from 'vitest';

import { encodeCanonical, type CanonicalEncodeConfig } from '../../src/canonical/encode.js';
import { computeHash } from '../../src/canonical/hash.js';
import { ok, isOk, type Result } from '../../src/shared/result.js';

export function compareCanonical(
        a: unknown,
        b: unknown,
        config?: Partial<CanonicalEncodeConfig>,
): Result<boolean> {
        const ha = computeHash(a, config);
        const hb = computeHash(b, config);

        if (!ha.ok) return ha;
        if (!hb.ok) return hb;
        return ok(ha.value === hb.value);
}

describe('canonical encoding and hashing', () => {
        const complexFixtures: Record<string, unknown> = {
                flat: { a: 1, b: 2 },
                nested: { user: { name: 'Ada', age: 42, active: true } },
                arrayMix: [1, 'a', true, null],
                deep: {
                        users: [
                                { id: 1, tags: new Set(['a', 'b']) },
                                { id: 2, tags: new Set(['b', 'a']) }, // same elements diff order
                        ],
                        meta: new Map<string, unknown>([
                                ['created', new Date('2020-01-01T00:00:00.000Z')],
                                ['version', 1],
                        ]),
                },
                numbers: {
                        posZero: +0,
                        negZero: -0,
                        finite: 1.23,
                },
                bigint: { x: 12n },
        };

        it('encodes deterministically with sorted keys and no variance', () => {
                const a = { b: 2, a: 1 };
                const b = { a: 1, b: 2 };
                const ra = encodeCanonical(a);
                const rb = encodeCanonical(b);
                expect(isOk(ra)).toBe(true);
                expect(isOk(rb)).toBe(true);
                if (isOk(rb)) expect(ra.ok && rb.ok && ra.value).toBe(rb.value);
        });

        it('produces identical hashes for semantically equivalent objects', () => {
                const obj1 = { x: 1, y: { a: 2, b: 3 } };
                const obj2 = { y: { b: 3, a: 2 }, x: 1 };
                const r = compareCanonical(obj1, obj2);
                expect(isOk(r)).toBe(true);
                expect(r.ok && r.value).toBe(true);
        });

        it('distinguishes different logical content', () => {
                const r = compareCanonical({ x: 1 }, { x: 2 });
                expect(isOk(r)).toBe(true);
                expect(r.ok && r.value).toBe(false);
        });

        it('handles nested, mixed fixtures deterministically', () => {
                for (const [, value] of Object.entries(complexFixtures)) {
                        const h = computeHash(value);
                        expect(isOk(h)).toBe(true);
                        if (h.ok) {
                                // Stable output: SHA-256 hex string of length 64
                                expect(h.value).toMatch(/^[a-f0-9]{64}$/);
                        }
                }
        });

        it('treats set elements as order-independent', () => {
                const a = new Set([1, 2, 3]);
                const b = new Set([3, 2, 1]);
                const r = compareCanonical(a, b);
                expect(isOk(r)).toBe(true);
                expect(r.ok && r.value).toBe(true);
        });

        it('ensures byte-identical encodings for nested deterministic structures', () => {
                const o1 = { nested: { z: [1, 2], a: 'x' } };
                const o2 = { nested: { a: 'x', z: [1, 2] } };
                const e1 = encodeCanonical(o1);
                const e2 = encodeCanonical(o2);
                expect(isOk(e1) && isOk(e2)).toBe(true);
                if (isOk(e1) && isOk(e2)) expect(e1.ok && e2.ok && e1.value).toBe(e2.value);
        });

        it('rejects non-serializable values with diagnostics', () => {
                const fn = encodeCanonical(() => {});
                expect(fn.ok).toBe(false);
                const sym = encodeCanonical(Symbol('x'));
                expect(sym.ok).toBe(false);
        });

        it('produces stable hashes for equivalent objects across runs', () => {
                const obj = { alpha: 1, beta: [2, 3], gamma: { a: true } };
                const h1 = computeHash(obj);
                const h2 = computeHash(obj);
                expect(isOk(h1) && isOk(h2)).toBe(true);
                if (isOk(h1) && isOk(h2)) expect(h1.ok && h2.ok && h1.value).toBe(h2.value);
        });

        it('handles policy variants gracefully (BigInt string vs number)', () => {
                const a = computeHash({ big: 10n }, { bigintPolicy: 'string' });
                const b = computeHash({ big: 10n }, { bigintPolicy: 'number' });
                expect(isOk(a)).toBe(true);
                expect(isOk(b)).toBe(true);
                // They can differ, but both should be deterministic strings
                if (a.ok && b.ok) {
                        expect(a.value).not.toBe('');
                        expect(b.value).not.toBe('');
                }
        });
});
