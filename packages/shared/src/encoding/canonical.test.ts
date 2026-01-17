// packages/shared/src/encoding/canonical.test.ts

import { describe, it, expect } from 'vitest';

import { encodeCanonical } from './canonical.js';

describe('encodeCanonical - primitives', () => {
        it('encodes null', () => {
                const result = encodeCanonical(null);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('null');
                }
        });

        it('encodes booleans', () => {
                const trueResult = encodeCanonical(true);
                expect(trueResult.ok).toBe(true);
                if (trueResult.ok) {
                        expect(trueResult.value).toBe('true');
                }

                const falseResult = encodeCanonical(false);
                expect(falseResult.ok).toBe(true);
                if (falseResult.ok) {
                        expect(falseResult.value).toBe('false');
                }
        });

        it('encodes strings', () => {
                const result = encodeCanonical('hello');
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('"hello"');
                }
        });

        it('encodes numbers', () => {
                const result = encodeCanonical(42);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('42');
                }
        });

        it('coerces -0 to 0 by default', () => {
                const result = encodeCanonical(-0);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('0');
                }
        });

        it('preserves -0 when coercion disabled', () => {
                const result = encodeCanonical(-0, { coerceNegativeZeroToZero: false });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('-0');
                }
        });
});

describe('encodeCanonical - special numbers', () => {
        it('rejects NaN by default', () => {
                const result = encodeCanonical(NaN);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('non-finite-number');
                        expect(result.error.path).toBe('$');
                        expect(result.error.value).toBe('NaN');
                }
        });

        it('encodes NaN as string when policy is string', () => {
                const result = encodeCanonical(NaN, { specialNumberPolicy: 'string' });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('"NaN"');
                }
        });

        it('encodes NaN as null when policy is null', () => {
                const result = encodeCanonical(NaN, { specialNumberPolicy: 'null' });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('null');
                }
        });

        it('rejects Infinity by default', () => {
                const result = encodeCanonical(Infinity);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('non-finite-number');
                        expect(result.error.value).toBe('Infinity');
                }
        });

        it('rejects -Infinity by default', () => {
                const result = encodeCanonical(-Infinity);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('non-finite-number');
                        expect(result.error.value).toBe('-Infinity');
                }
        });

        it('encodes Infinity as string when policy is string', () => {
                const result = encodeCanonical(Infinity, { specialNumberPolicy: 'string' });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('"Infinity"');
                }
        });
});

describe('encodeCanonical - bigint', () => {
        it('encodes bigint as string by default', () => {
                const result = encodeCanonical(42n);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('"42"');
                }
        });

        it('rejects bigint when policy is error', () => {
                const result = encodeCanonical(42n, { bigintPolicy: 'error' });
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('bigint-disallowed');
                }
        });

        it('converts safe bigint to number when policy is number', () => {
                const result = encodeCanonical(42n, { bigintPolicy: 'number' });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('42');
                }
        });

        it('rejects unsafe bigint when policy is number', () => {
                const unsafeBigInt = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
                const result = encodeCanonical(unsafeBigInt, { bigintPolicy: 'number' });
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('unsafe-bigint');
                }
        });
});

describe('encodeCanonical - unsupported types', () => {
        it('rejects functions', () => {
                const result = encodeCanonical(() => {});
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('unsupported-type');
                        expect(result.error.message).toContain('function');
                }
        });

        it('rejects symbols', () => {
                const result = encodeCanonical(Symbol('test'));
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('unsupported-type');
                        expect(result.error.message).toContain('symbol');
                }
        });
});

describe('encodeCanonical - arrays', () => {
        it('encodes empty array', () => {
                const result = encodeCanonical([]);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[]');
                }
        });

        it('encodes array with primitives', () => {
                const result = encodeCanonical([1, 'two', true, null]);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[1,"two",true,null]');
                }
        });

        it('encodes nested arrays', () => {
                const result = encodeCanonical([1, [2, 3], 4]);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[1,[2,3],4]');
                }
        });

        it('handles undefined in arrays with omit policy', () => {
                const result = encodeCanonical([1, undefined, 3], { undefinedPolicy: 'omit' });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[1,null,3]');
                }
        });

        it('handles undefined in arrays with null policy', () => {
                const result = encodeCanonical([1, undefined, 3], { undefinedPolicy: 'null' });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[1,null,3]');
                }
        });

        it('rejects undefined in arrays with error policy', () => {
                const result = encodeCanonical([1, undefined, 3], { undefinedPolicy: 'error' });
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('undefined-disallowed');
                        expect(result.error.path).toBe('$[1]');
                }
        });

        it('propagates errors from nested values', () => {
                const result = encodeCanonical([1, NaN, 3]);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('non-finite-number');
                        expect(result.error.path).toBe('$[1]');
                }
        });
});

describe('encodeCanonical - objects', () => {
        it('encodes empty object', () => {
                const result = encodeCanonical({});
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('{}');
                }
        });

        it('encodes object with sorted keys', () => {
                const result = encodeCanonical({ z: 3, a: 1, m: 2 });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('{"a":1,"m":2,"z":3}');
                }
        });

        it('encodes nested objects', () => {
                const result = encodeCanonical({ outer: { inner: 'value' } });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('{"outer":{"inner":"value"}}');
                }
        });

        it('omits undefined properties by default', () => {
                const result = encodeCanonical({ a: 1, b: undefined, c: 3 });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('{"a":1,"c":3}');
                }
        });

        it('converts undefined to null with null policy', () => {
                const result = encodeCanonical(
                        { a: 1, b: undefined, c: 3 },
                        { undefinedPolicy: 'null' },
                );
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('{"a":1,"b":null,"c":3}');
                }
        });

        it('rejects undefined with error policy', () => {
                const result = encodeCanonical(
                        { a: 1, b: undefined },
                        { undefinedPolicy: 'error' },
                );
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('undefined-disallowed');
                        expect(result.error.path).toBe('$.b');
                }
        });

        it('propagates errors from nested values', () => {
                const result = encodeCanonical({ a: 1, b: { c: NaN } });
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('non-finite-number');
                        expect(result.error.path).toBe('$.b.c');
                }
        });
});

describe('encodeCanonical - circular references', () => {
        it('detects circular object references', () => {
                const obj: Record<string, unknown> = { a: 1 };
                obj.self = obj;

                const result = encodeCanonical(obj);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('circular-reference');
                        expect(result.error.path).toBe('$.self');
                }
        });

        it('detects circular array references', () => {
                const arr: unknown[] = [1, 2];
                arr.push(arr);

                const result = encodeCanonical(arr);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('circular-reference');
                        expect(result.error.path).toBe('$[2]');
                }
        });

        it('detects deep circular references', () => {
                const obj: Record<string, unknown> = { a: { b: {} } };
                (obj.a as Record<string, unknown>).b = obj;

                const result = encodeCanonical(obj);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('circular-reference');
                }
        });
});

describe('encodeCanonical - Date', () => {
        it('encodes Date as ISO string by default', () => {
                const date = new Date('2024-01-15T12:00:00.000Z');
                const result = encodeCanonical(date);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('"2024-01-15T12:00:00.000Z"');
                }
        });

        it('encodes Date as epoch-ms when policy is epoch-ms', () => {
                const date = new Date('2024-01-15T12:00:00.000Z');
                const result = encodeCanonical(date, { datePolicy: 'epoch-ms' });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        const epochMs = date.getTime();
                        expect(result.value).toBe(String(epochMs));
                }
        });

        it('rejects Date when policy is error', () => {
                const date = new Date();
                const result = encodeCanonical(date, { datePolicy: 'error' });
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('date-disallowed');
                }
        });

        it('rejects invalid Date', () => {
                const invalidDate = new Date('invalid');
                const result = encodeCanonical(invalidDate);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('invalid-date');
                }
        });
});

describe('encodeCanonical - Map', () => {
        it('encodes Map as sorted entries by default', () => {
                const map = new Map([
                        ['z', 3],
                        ['a', 1],
                        ['m', 2],
                ]);
                const result = encodeCanonical(map);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[["a",1],["m",2],["z",3]]');
                }
        });

        it('rejects Map when policy is error', () => {
                const map = new Map([['a', 1]]);
                const result = encodeCanonical(map, { mapPolicy: 'error' });
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('map-disallowed');
                }
        });

        it('handles numeric keys', () => {
                const map = new Map([
                        [2, 'two'],
                        [1, 'one'],
                ]);
                const result = encodeCanonical(map);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[["1","one"],["2","two"]]');
                }
        });

        it('handles boolean keys', () => {
                const map = new Map([
                        [true, 'yes'],
                        [false, 'no'],
                ]);
                const result = encodeCanonical(map);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[["false","no"],["true","yes"]]');
                }
        });

        it('rejects object keys', () => {
                const map = new Map([[{}, 'value']]);
                const result = encodeCanonical(map);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('unsupported-map-key');
                }
        });

        it('propagates errors from values', () => {
                const map = new Map([['key', NaN]]);
                const result = encodeCanonical(map);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('non-finite-number');
                }
        });
});

describe('encodeCanonical - Set', () => {
        it('encodes Set as sorted array by default', () => {
                const set = new Set([3, 1, 2]);
                const result = encodeCanonical(set);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[1,2,3]');
                }
        });

        it('sorts by canonical JSON representation', () => {
                const set = new Set(['b', 'a', 'c']);
                const result = encodeCanonical(set);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('["a","b","c"]');
                }
        });

        it('rejects Set when policy is error', () => {
                const set = new Set([1, 2]);
                const result = encodeCanonical(set, { setPolicy: 'error' });
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('set-disallowed');
                }
        });

        it('propagates errors from elements', () => {
                const set = new Set([1, NaN, 3]);
                const result = encodeCanonical(set);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('non-finite-number');
                }
        });
});

describe('encodeCanonical - binary data', () => {
        it('encodes Uint8Array as base64 by default', () => {
                const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
                const result = encodeCanonical(bytes);
                expect(result.ok).toBe(true);
                if (result.ok) {
                        if (typeof Buffer !== 'undefined') {
                                const decoded = Buffer.from(
                                        JSON.parse(result.value),
                                        'base64',
                                ).toString();
                                expect(decoded).toBe('Hello');
                        }
                }
        });

        it('encodes Uint8Array as array when policy is array', () => {
                const bytes = new Uint8Array([1, 2, 3]);
                const result = encodeCanonical(bytes, { binaryPolicy: 'array' });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[1,2,3]');
                }
        });

        it('rejects binary when policy is error', () => {
                const bytes = new Uint8Array([1, 2, 3]);
                const result = encodeCanonical(bytes, { binaryPolicy: 'error' });
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.reason).toBe('binary-disallowed');
                }
        });

        it('handles ArrayBuffer', () => {
                const buffer = new ArrayBuffer(3);
                const view = new Uint8Array(buffer);
                view[0] = 1;
                view[1] = 2;
                view[2] = 3;

                const result = encodeCanonical(buffer, { binaryPolicy: 'array' });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[1,2,3]');
                }
        });

        it('handles typed arrays', () => {
                const int8 = new Int8Array([1, 2, 3]);
                const result = encodeCanonical(int8, { binaryPolicy: 'array' });
                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe('[1,2,3]');
                }
        });
});

describe('encodeCanonical - determinism', () => {
        it('produces same output for objects with different key order', () => {
                const obj1 = { z: 3, a: 1, m: 2 };
                const obj2 = { a: 1, m: 2, z: 3 };

                const result1 = encodeCanonical(obj1);
                const result2 = encodeCanonical(obj2);

                expect(result1.ok).toBe(true);
                expect(result2.ok).toBe(true);
                if (result1.ok && result2.ok) {
                        expect(result1.value).toBe(result2.value);
                }
        });

        it('produces same output for Maps with different insertion order', () => {
                const map1 = new Map([
                        ['z', 3],
                        ['a', 1],
                ]);
                const map2 = new Map([
                        ['a', 1],
                        ['z', 3],
                ]);

                const result1 = encodeCanonical(map1);
                const result2 = encodeCanonical(map2);

                expect(result1.ok).toBe(true);
                expect(result2.ok).toBe(true);
                if (result1.ok && result2.ok) {
                        expect(result1.value).toBe(result2.value);
                }
        });

        it('produces same output for Sets with different insertion order', () => {
                const set1 = new Set([3, 1, 2]);
                const set2 = new Set([1, 2, 3]);

                const result1 = encodeCanonical(set1);
                const result2 = encodeCanonical(set2);

                expect(result1.ok).toBe(true);
                expect(result2.ok).toBe(true);
                if (result1.ok && result2.ok) {
                        expect(result1.value).toBe(result2.value);
                }
        });
});

describe('encodeCanonical - complex nested structures', () => {
        it('encodes deeply nested structures', () => {
                const complex = {
                        user: {
                                name: 'Alice',
                                age: 30,
                                tags: ['developer', 'typescript'],
                                metadata: {
                                        created: new Date('2024-01-01T00:00:00.000Z'),
                                        settings: new Map([
                                                ['theme', 'dark'],
                                                ['language', 'en'],
                                        ]),
                                },
                        },
                };

                const result = encodeCanonical(complex);
                expect(result.ok).toBe(true);
        });

        it('propagates errors from deep nesting', () => {
                const obj = {
                        level1: {
                                level2: {
                                        level3: {
                                                value: NaN,
                                        },
                                },
                        },
                };

                const result = encodeCanonical(obj);
                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error.path).toBe('$.level1.level2.level3.value');
                }
        });
});
