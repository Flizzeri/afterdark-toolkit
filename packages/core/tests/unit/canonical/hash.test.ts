// tests/unit/canonical/hash.test.ts

import { isOk, isErr } from '@afterdarktk/shared';
import { describe, it, expect } from 'vitest';

import { computeHash } from '../../../src/canonical/hash.js';

describe('Canonical Hashing', () => {
        describe('Basic Hashing', () => {
                it('computes hash for primitives', () => {
                        const result = computeHash('hello');
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                        }
                });

                it('computes hash for numbers', () => {
                        const result = computeHash(42);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                        }
                });

                it('computes hash for objects', () => {
                        const result = computeHash({ a: 1, b: 2 });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                        }
                });

                it('computes hash for arrays', () => {
                        const result = computeHash([1, 2, 3]);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                        }
                });
        });

        describe('Determinism', () => {
                it('produces identical hash for identical values', () => {
                        const obj = { a: 1, b: 2, c: 3 };
                        const hash1 = computeHash(obj);
                        const hash2 = computeHash(obj);

                        expect(isOk(hash1) && isOk(hash2)).toBe(true);
                        if (isOk(hash1) && isOk(hash2)) {
                                expect(hash1.value).toBe(hash2.value);
                        }
                });

                it('produces identical hash regardless of property order', () => {
                        const obj1 = { z: 3, a: 1, m: 2 };
                        const obj2 = { a: 1, m: 2, z: 3 };

                        const hash1 = computeHash(obj1);
                        const hash2 = computeHash(obj2);

                        expect(isOk(hash1) && isOk(hash2)).toBe(true);
                        if (isOk(hash1) && isOk(hash2)) {
                                expect(hash1.value).toBe(hash2.value);
                        }
                });

                it('produces different hashes for different values', () => {
                        const hash1 = computeHash({ a: 1 });
                        const hash2 = computeHash({ a: 2 });

                        expect(isOk(hash1) && isOk(hash2)).toBe(true);
                        if (isOk(hash1) && isOk(hash2)) {
                                expect(hash1.value).not.toBe(hash2.value);
                        }
                });

                it('produces different hashes for different types with same value', () => {
                        const hash1 = computeHash('42');
                        const hash2 = computeHash(42);

                        expect(isOk(hash1) && isOk(hash2)).toBe(true);
                        if (isOk(hash1) && isOk(hash2)) {
                                expect(hash1.value).not.toBe(hash2.value);
                        }
                });
        });

        describe('Nested Structures', () => {
                it('computes stable hash for nested objects', () => {
                        const obj = {
                                level1: {
                                        level2: {
                                                level3: {
                                                        value: 'deep',
                                                },
                                        },
                                },
                        };

                        const hash1 = computeHash(obj);
                        const hash2 = computeHash(obj);

                        expect(isOk(hash1) && isOk(hash2)).toBe(true);
                        if (isOk(hash1) && isOk(hash2)) {
                                expect(hash1.value).toBe(hash2.value);
                        }
                });

                it('computes stable hash for nested arrays', () => {
                        const arr = [
                                [1, 2, 3],
                                [4, 5, 6],
                                [7, 8, 9],
                        ];

                        const hash1 = computeHash(arr);
                        const hash2 = computeHash(arr);

                        expect(isOk(hash1) && isOk(hash2)).toBe(true);
                        if (isOk(hash1) && isOk(hash2)) {
                                expect(hash1.value).toBe(hash2.value);
                        }
                });
        });

        describe('IR-like Structures', () => {
                it('computes stable hash for IR nodes', () => {
                        const irNode = {
                                kind: 'object',
                                properties: [
                                        {
                                                name: 'id',
                                                type: {
                                                        kind: 'primitive',
                                                        primitiveKind: 'string',
                                                },
                                                optional: false,
                                        },
                                ],
                                metadata: {
                                        symbolId: 'Test.Symbol',
                                        annotations: [],
                                },
                        };

                        const hash1 = computeHash(irNode);
                        const hash2 = computeHash(irNode);

                        expect(isOk(hash1) && isOk(hash2)).toBe(true);
                        if (isOk(hash1) && isOk(hash2)) {
                                expect(hash1.value).toBe(hash2.value);
                        }
                });

                it('produces different hashes for different IR nodes', () => {
                        const node1 = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };

                        const node2 = {
                                kind: 'primitive',
                                primitiveKind: 'number',
                        };

                        const hash1 = computeHash(node1);
                        const hash2 = computeHash(node2);

                        expect(isOk(hash1) && isOk(hash2)).toBe(true);
                        if (isOk(hash1) && isOk(hash2)) {
                                expect(hash1.value).not.toBe(hash2.value);
                        }
                });
        });

        describe('Error Handling', () => {
                it('propagates encoding errors', () => {
                        const result = computeHash(NaN);
                        expect(isErr(result)).toBe(true);
                        if (isErr(result)) {
                                expect(result.diagnostics).toHaveLength(1);
                        }
                });

                it('propagates circular reference errors', () => {
                        interface SelfRef {
                                a: number;
                                self?: SelfRef;
                        }
                        const obj: SelfRef = { a: 1 };
                        obj.self = obj;
                        const result = computeHash(obj);
                        expect(isErr(result)).toBe(true);
                });
        });

        describe('Golden Vectors', () => {
                it('produces known hash for empty object', () => {
                        const result = computeHash({});
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe(
                                        '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
                                );
                        }
                });

                it('produces known hash for empty array', () => {
                        const result = computeHash([]);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe(
                                        '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
                                );
                        }
                });

                it('produces known hash for simple object', () => {
                        const result = computeHash({ a: 1 });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                // Hash of canonical JSON: {"a":1}
                                expect(result.value).toBe(
                                        '015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862',
                                );
                        }
                });
        });

        describe('Configuration', () => {
                it('respects encoding configuration', () => {
                        const hash1 = computeHash(42n, { bigintPolicy: 'string' });
                        const hash2 = computeHash(42n, { bigintPolicy: 'number' });

                        expect(isOk(hash1) && isOk(hash2)).toBe(true);
                        if (isOk(hash1) && isOk(hash2)) {
                                expect(hash1.value).not.toBe(hash2.value);
                        }
                });
        });

        describe('Large Structures', () => {
                it('handles large arrays efficiently', () => {
                        const largeArray = Array.from({ length: 1000 }, (_, i) => i);
                        const result = computeHash(largeArray);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                        }
                });

                it('handles large objects efficiently', () => {
                        const largeObject = Object.fromEntries(
                                Array.from({ length: 1000 }, (_, i) => [`key${i}`, i]),
                        );
                        const result = computeHash(largeObject);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                        }
                });
        });
});
