// packages/shared/src/encoding/utils.test.ts

import { describe, it, expect } from 'vitest';

import {
        DEFAULT_CANONICAL_CONFIG,
        createError,
        isBinaryLike,
        toUint8Array,
        uint8ToBase64,
        keyToStableString,
        serializeCanonical,
} from './utils.js';

describe('createError', () => {
        it('creates error without value', () => {
                const error = createError(
                        'circular-reference',
                        '$.foo',
                        'Circular reference detected',
                );

                expect(error).toEqual({
                        reason: 'circular-reference',
                        path: '$.foo',
                        message: 'Circular reference detected',
                });
        });

        it('creates error with value', () => {
                const error = createError('non-finite-number', '$.age', 'Non-finite number', NaN);

                expect(error).toEqual({
                        reason: 'non-finite-number',
                        path: '$.age',
                        message: 'Non-finite number',
                        value: 'NaN',
                });
        });

        it('stringifies complex values', () => {
                const error = createError('unsupported-type', '$.obj', 'Unsupported', {
                        foo: 'bar',
                });

                expect(error.value).toBe('[object Object]');
        });
});

describe('isBinaryLike', () => {
        it('recognizes Uint8Array', () => {
                expect(isBinaryLike(new Uint8Array([1, 2, 3]))).toBe(true);
        });

        it('recognizes ArrayBuffer', () => {
                expect(isBinaryLike(new ArrayBuffer(10))).toBe(true);
        });

        it('recognizes typed arrays', () => {
                expect(isBinaryLike(new Int8Array([1, 2]))).toBe(true);
                expect(isBinaryLike(new Uint16Array([1, 2]))).toBe(true);
                expect(isBinaryLike(new Float32Array([1.5, 2.5]))).toBe(true);
        });

        it('recognizes DataView', () => {
                const buffer = new ArrayBuffer(8);
                expect(isBinaryLike(new DataView(buffer))).toBe(true);
        });

        it('recognizes Buffer if available', () => {
                if (typeof Buffer !== 'undefined') {
                        expect(isBinaryLike(Buffer.from([1, 2, 3]))).toBe(true);
                }
        });

        it('rejects non-binary values', () => {
                expect(isBinaryLike(null)).toBe(false);
                expect(isBinaryLike(undefined)).toBe(false);
                expect(isBinaryLike(42)).toBe(false);
                expect(isBinaryLike('hello')).toBe(false);
                expect(isBinaryLike({})).toBe(false);
                expect(isBinaryLike([])).toBe(false);
        });
});

describe('toUint8Array', () => {
        it('returns Uint8Array as-is', () => {
                const u8 = new Uint8Array([1, 2, 3]);
                expect(toUint8Array(u8)).toBe(u8);
        });

        it('converts ArrayBuffer', () => {
                const buffer = new ArrayBuffer(3);
                const view = new Uint8Array(buffer);
                view[0] = 1;
                view[1] = 2;
                view[2] = 3;

                const result = toUint8Array(buffer);
                expect(result).toBeInstanceOf(Uint8Array);
                expect(Array.from(result!)).toEqual([1, 2, 3]);
        });

        it('converts typed arrays', () => {
                const int8 = new Int8Array([1, 2, 3]);
                const result = toUint8Array(int8);

                expect(result).toBeInstanceOf(Uint8Array);
                expect(result!.length).toBe(3);
        });

        it('converts DataView', () => {
                const buffer = new ArrayBuffer(3);
                const view = new DataView(buffer);
                view.setUint8(0, 1);
                view.setUint8(1, 2);
                view.setUint8(2, 3);

                const result = toUint8Array(view);
                expect(result).toBeInstanceOf(Uint8Array);
                expect(Array.from(result!)).toEqual([1, 2, 3]);
        });

        it('converts Buffer if available', () => {
                if (typeof Buffer !== 'undefined') {
                        const buffer = Buffer.from([1, 2, 3]);
                        const result = toUint8Array(buffer);

                        expect(result).toBeInstanceOf(Uint8Array);
                        expect(Array.from(result!)).toEqual([1, 2, 3]);
                }
        });

        it('returns null for non-binary values', () => {
                expect(toUint8Array(null)).toBe(null);
                expect(toUint8Array(42)).toBe(null);
                expect(toUint8Array('hello')).toBe(null);
                expect(toUint8Array({})).toBe(null);
        });
});

describe('uint8ToBase64', () => {
        it('encodes empty array', () => {
                const result = uint8ToBase64(new Uint8Array([]));
                expect(result).toBe('');
        });

        it('encodes simple bytes', () => {
                const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
                const result = uint8ToBase64(bytes);

                // Decode to verify
                if (typeof Buffer !== 'undefined') {
                        expect(Buffer.from(result, 'base64').toString()).toBe('Hello');
                }
        });

        it('encodes binary data', () => {
                const bytes = new Uint8Array([0, 1, 2, 255, 254, 253]);
                const result = uint8ToBase64(bytes);

                expect(result).toBeTruthy();
                expect(typeof result).toBe('string');
        });
});

describe('keyToStableString', () => {
        it('converts string keys', () => {
                expect(keyToStableString('foo', DEFAULT_CANONICAL_CONFIG)).toBe('foo');
        });

        it('converts boolean keys', () => {
                expect(keyToStableString(true, DEFAULT_CANONICAL_CONFIG)).toBe('true');
                expect(keyToStableString(false, DEFAULT_CANONICAL_CONFIG)).toBe('false');
        });

        it('converts number keys', () => {
                expect(keyToStableString(42, DEFAULT_CANONICAL_CONFIG)).toBe('42');
                expect(keyToStableString(3.14, DEFAULT_CANONICAL_CONFIG)).toBe('3.14');
        });

        it('handles -0 with coercion', () => {
                expect(keyToStableString(-0, DEFAULT_CANONICAL_CONFIG)).toBe('0');
        });

        it('handles -0 without coercion', () => {
                const cfg = { ...DEFAULT_CANONICAL_CONFIG, coerceNegativeZeroToZero: false };
                expect(keyToStableString(-0, cfg)).toBe('-0');
        });

        it('handles NaN based on policy', () => {
                expect(
                        keyToStableString(NaN, {
                                ...DEFAULT_CANONICAL_CONFIG,
                                specialNumberPolicy: 'error',
                        }),
                ).toBe(undefined);
                expect(
                        keyToStableString(NaN, {
                                ...DEFAULT_CANONICAL_CONFIG,
                                specialNumberPolicy: 'string',
                        }),
                ).toBe('NaN');
                expect(
                        keyToStableString(NaN, {
                                ...DEFAULT_CANONICAL_CONFIG,
                                specialNumberPolicy: 'null',
                        }),
                ).toBe('null');
        });

        it('handles Infinity based on policy', () => {
                expect(
                        keyToStableString(Infinity, {
                                ...DEFAULT_CANONICAL_CONFIG,
                                specialNumberPolicy: 'error',
                        }),
                ).toBe(undefined);
                expect(
                        keyToStableString(Infinity, {
                                ...DEFAULT_CANONICAL_CONFIG,
                                specialNumberPolicy: 'string',
                        }),
                ).toBe('Infinity');
                expect(
                        keyToStableString(Infinity, {
                                ...DEFAULT_CANONICAL_CONFIG,
                                specialNumberPolicy: 'null',
                        }),
                ).toBe('null');
        });

        it('converts bigint to string by default', () => {
                expect(keyToStableString(42n, DEFAULT_CANONICAL_CONFIG)).toBe('42');
                expect(keyToStableString(9007199254740991n, DEFAULT_CANONICAL_CONFIG)).toBe(
                        '9007199254740991',
                );
        });

        it('rejects bigint when policy is error', () => {
                const cfg = { ...DEFAULT_CANONICAL_CONFIG, bigintPolicy: 'error' as const };
                expect(keyToStableString(42n, cfg)).toBe(undefined);
        });

        it('converts bigint to number when safe', () => {
                const cfg = { ...DEFAULT_CANONICAL_CONFIG, bigintPolicy: 'number' as const };
                expect(keyToStableString(42n, cfg)).toBe('42');
        });

        it('rejects unsafe bigint when converting to number', () => {
                const cfg = { ...DEFAULT_CANONICAL_CONFIG, bigintPolicy: 'number' as const };
                const unsafeBigInt = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
                expect(keyToStableString(unsafeBigInt, cfg)).toBe(undefined);
        });

        it('rejects object keys', () => {
                expect(keyToStableString({}, DEFAULT_CANONICAL_CONFIG)).toBe(undefined);
                expect(keyToStableString([], DEFAULT_CANONICAL_CONFIG)).toBe(undefined);
        });

        it('rejects function keys', () => {
                expect(keyToStableString(() => {}, DEFAULT_CANONICAL_CONFIG)).toBe(undefined);
        });

        it('rejects symbol keys', () => {
                expect(keyToStableString(Symbol('test'), DEFAULT_CANONICAL_CONFIG)).toBe(undefined);
        });
});

describe('serializeCanonical', () => {
        it('serializes null', () => {
                expect(serializeCanonical(null)).toBe('null');
        });

        it('serializes booleans', () => {
                expect(serializeCanonical(true)).toBe('true');
                expect(serializeCanonical(false)).toBe('false');
        });

        it('serializes numbers', () => {
                expect(serializeCanonical(42)).toBe('42');
                expect(serializeCanonical(3.14)).toBe('3.14');
                expect(serializeCanonical(0)).toBe('0');
        });

        it('serializes strings', () => {
                expect(serializeCanonical('hello')).toBe('"hello"');
                expect(serializeCanonical('with "quotes"')).toBe('"with \\"quotes\\""');
        });

        it('serializes empty array', () => {
                expect(serializeCanonical([])).toBe('[]');
        });

        it('serializes array with primitives', () => {
                expect(serializeCanonical([1, 'two', true, null])).toBe('[1,"two",true,null]');
        });

        it('serializes nested arrays', () => {
                expect(serializeCanonical([1, [2, 3], 4])).toBe('[1,[2,3],4]');
        });

        it('serializes empty object', () => {
                expect(serializeCanonical({})).toBe('{}');
        });

        it('serializes object with sorted keys', () => {
                const obj = { z: 1, a: 2, m: 3 };
                expect(serializeCanonical(obj)).toBe('{"a":2,"m":3,"z":1}');
        });

        it('serializes nested objects', () => {
                const obj = { outer: { inner: 'value' } };
                expect(serializeCanonical(obj)).toBe('{"outer":{"inner":"value"}}');
        });

        it('serializes mixed structures', () => {
                const obj = {
                        bool: true,
                        num: 42,
                        str: 'hello',
                        arr: [1, 2],
                        obj: { nested: true },
                };
                expect(serializeCanonical(obj)).toBe(
                        '{"arr":[1,2],"bool":true,"num":42,"obj":{"nested":true},"str":"hello"}',
                );
        });

        it('produces deterministic output', () => {
                const obj1 = { b: 2, a: 1 };
                const obj2 = { a: 1, b: 2 };
                expect(serializeCanonical(obj1)).toBe(serializeCanonical(obj2));
        });
});
