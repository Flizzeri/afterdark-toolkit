// packages/shared/tests/unit/encode.test.ts

import { describe, it, expect } from 'vitest';

import { encodeCanonical } from '../../src/canonical/encode.js';
import { isOk, isErr } from '../../src/utils/utilities.js';

describe('Canonical Encoding', () => {
        describe('Primitives', () => {
                it('encodes null', () => {
                        const result = encodeCanonical(null);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('null');
                        }
                });

                it('encodes boolean values', () => {
                        const trueResult = encodeCanonical(true);
                        expect(isOk(trueResult)).toBe(true);
                        if (isOk(trueResult)) {
                                expect(trueResult.value).toBe('true');
                        }

                        const falseResult = encodeCanonical(false);
                        expect(isOk(falseResult)).toBe(true);
                        if (isOk(falseResult)) {
                                expect(falseResult.value).toBe('false');
                        }
                });

                it('encodes string values', () => {
                        const result = encodeCanonical('hello');
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('"hello"');
                        }
                });

                it('encodes string with special characters', () => {
                        const result = encodeCanonical('hello\nworld\t"quoted"');
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toContain('\\n');
                                expect(result.value).toContain('\\t');
                                expect(result.value).toContain('\\"');
                        }
                });

                it('encodes number values', () => {
                        const result = encodeCanonical(42);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('42');
                        }
                });

                it('encodes negative numbers', () => {
                        const result = encodeCanonical(-42);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('-42');
                        }
                });

                it('encodes decimal numbers', () => {
                        const result = encodeCanonical(3.14159);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('3.14159');
                        }
                });

                it('coerces -0 to 0 by default', () => {
                        const result = encodeCanonical(-0);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('0');
                        }
                });
        });

        describe('Special Numbers', () => {
                it('rejects NaN by default', () => {
                        const result = encodeCanonical(NaN);
                        expect(isErr(result)).toBe(true);
                        if (isErr(result)) {
                                expect(result.diagnostics[0].code).toBe('ADTK-ENCODING-9002');
                        }
                });

                it('encodes NaN as string when configured', () => {
                        const result = encodeCanonical(NaN, { specialNumberPolicy: 'string' });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('"NaN"');
                        }
                });

                it('encodes NaN as null when configured', () => {
                        const result = encodeCanonical(NaN, { specialNumberPolicy: 'null' });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('null');
                        }
                });

                it('rejects Infinity by default', () => {
                        const result = encodeCanonical(Infinity);
                        expect(isErr(result)).toBe(true);
                });

                it('encodes Infinity as string when configured', () => {
                        const result = encodeCanonical(Infinity, { specialNumberPolicy: 'string' });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('"Infinity"');
                        }
                });

                it('rejects -Infinity by default', () => {
                        const result = encodeCanonical(-Infinity);
                        expect(isErr(result)).toBe(true);
                });

                it('encodes -Infinity as string when configured', () => {
                        const result = encodeCanonical(-Infinity, {
                                specialNumberPolicy: 'string',
                        });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('"-Infinity"');
                        }
                });
        });

        describe('BigInt', () => {
                it('encodes BigInt as string by default', () => {
                        const result = encodeCanonical(9007199254740991n);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('"9007199254740991"');
                        }
                });

                it('rejects BigInt when configured', () => {
                        const result = encodeCanonical(42n, { bigintPolicy: 'error' });
                        expect(isErr(result)).toBe(true);
                        if (isErr(result)) {
                                expect(result.diagnostics[0].code).toBe('ADTK-ENCODING-9003');
                        }
                });

                it('encodes BigInt as number when safe', () => {
                        const result = encodeCanonical(42n, { bigintPolicy: 'number' });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('42');
                        }
                });

                it('rejects BigInt as number when unsafe', () => {
                        const result = encodeCanonical(9007199254740992n, {
                                bigintPolicy: 'number',
                        });
                        expect(isErr(result)).toBe(true);
                });
        });

        describe('Arrays', () => {
                it('encodes empty arrays', () => {
                        const result = encodeCanonical([]);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('[]');
                        }
                });

                it('encodes simple arrays', () => {
                        const result = encodeCanonical([1, 2, 3]);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('[1,2,3]');
                        }
                });

                it('encodes mixed-type arrays', () => {
                        const result = encodeCanonical([1, 'two', true, null]);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('[1,"two",true,null]');
                        }
                });

                it('encodes nested arrays', () => {
                        const result = encodeCanonical([
                                [1, 2],
                                [3, 4],
                        ]);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('[[1,2],[3,4]]');
                        }
                });

                it('handles undefined in arrays with omit policy', () => {
                        const result = encodeCanonical([1, undefined, 3], {
                                undefinedPolicy: 'omit',
                        });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('[1,null,3]');
                        }
                });

                it('handles undefined in arrays with null policy', () => {
                        const result = encodeCanonical([1, undefined, 3], {
                                undefinedPolicy: 'null',
                        });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('[1,null,3]');
                        }
                });

                it('rejects undefined in arrays with error policy', () => {
                        const result = encodeCanonical([1, undefined, 3], {
                                undefinedPolicy: 'error',
                        });
                        expect(isErr(result)).toBe(true);
                });
        });

        describe('Objects', () => {
                it('encodes empty objects', () => {
                        const result = encodeCanonical({});
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('{}');
                        }
                });

                it('encodes simple objects with sorted keys', () => {
                        const result = encodeCanonical({ z: 3, a: 1, m: 2 });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('{"a":1,"m":2,"z":3}');
                        }
                });

                it('encodes nested objects with sorted keys', () => {
                        const result = encodeCanonical({
                                z: { nested: 'value' },
                                a: { another: 'value' },
                        });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                const parsed = JSON.parse(result.value);
                                expect(Object.keys(parsed)).toEqual(['a', 'z']);
                        }
                });

                it('omits undefined fields by default', () => {
                        const result = encodeCanonical({ a: 1, b: undefined, c: 3 });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('{"a":1,"c":3}');
                        }
                });

                it('encodes undefined fields as null when configured', () => {
                        const result = encodeCanonical(
                                { a: 1, b: undefined, c: 3 },
                                { undefinedPolicy: 'null' },
                        );
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('{"a":1,"b":null,"c":3}');
                        }
                });

                it('rejects undefined fields with error policy', () => {
                        const result = encodeCanonical(
                                { a: 1, b: undefined },
                                { undefinedPolicy: 'error' },
                        );
                        expect(isErr(result)).toBe(true);
                });

                it('encodes deeply nested objects', () => {
                        const result = encodeCanonical({
                                level1: {
                                        level2: {
                                                level3: {
                                                        value: 'deep',
                                                },
                                        },
                                },
                        });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toContain('"value":"deep"');
                        }
                });
        });

        describe('Date', () => {
                it('encodes Date as ISO string by default', () => {
                        const date = new Date('2024-01-01T00:00:00.000Z');
                        const result = encodeCanonical(date);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('"2024-01-01T00:00:00.000Z"');
                        }
                });

                it('encodes Date as epoch milliseconds when configured', () => {
                        const date = new Date('2024-01-01T00:00:00.000Z');
                        const result = encodeCanonical(date, { datePolicy: 'epoch-ms' });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe(String(date.getTime()));
                        }
                });

                it('rejects Date when configured', () => {
                        const date = new Date();
                        const result = encodeCanonical(date, { datePolicy: 'error' });
                        expect(isErr(result)).toBe(true);
                });

                it('rejects invalid Date', () => {
                        const date = new Date('invalid');
                        const result = encodeCanonical(date);
                        expect(isErr(result)).toBe(true);
                });
        });

        describe('Map', () => {
                it('encodes Map as sorted entries by default', () => {
                        const map = new Map([
                                ['z', 3],
                                ['a', 1],
                                ['m', 2],
                        ]);
                        const result = encodeCanonical(map);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                const parsed = JSON.parse(result.value);
                                expect(parsed).toEqual([
                                        ['a', 1],
                                        ['m', 2],
                                        ['z', 3],
                                ]);
                        }
                });

                it('rejects Map when configured', () => {
                        const map = new Map([['key', 'value']]);
                        const result = encodeCanonical(map, { mapPolicy: 'error' });
                        expect(isErr(result)).toBe(true);
                });

                it('encodes Map with number keys', () => {
                        const map = new Map([
                                [3, 'three'],
                                [1, 'one'],
                                [2, 'two'],
                        ]);
                        const result = encodeCanonical(map);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                const parsed = JSON.parse(result.value);
                                expect(parsed[0][0]).toBe('1');
                                expect(parsed[1][0]).toBe('2');
                                expect(parsed[2][0]).toBe('3');
                        }
                });

                it('rejects Map with unsupported key types', () => {
                        const map = new Map([[{}, 'value']]);
                        const result = encodeCanonical(map);
                        expect(isErr(result)).toBe(true);
                });
        });

        describe('Set', () => {
                it('encodes Set as sorted array by default', () => {
                        const set = new Set([3, 1, 2]);
                        const result = encodeCanonical(set);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                const parsed = JSON.parse(result.value);
                                expect(parsed).toEqual([1, 2, 3]);
                        }
                });

                it('rejects Set when configured', () => {
                        const set = new Set([1, 2, 3]);
                        const result = encodeCanonical(set, { setPolicy: 'error' });
                        expect(isErr(result)).toBe(true);
                });

                it('encodes Set with strings in sorted order', () => {
                        const set = new Set(['zebra', 'apple', 'mango']);
                        const result = encodeCanonical(set);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                const parsed = JSON.parse(result.value);
                                expect(parsed).toEqual(['apple', 'mango', 'zebra']);
                        }
                });
        });

        describe('Binary Data', () => {
                it('encodes Uint8Array as base64 by default', () => {
                        const bytes = new Uint8Array([1, 2, 3]);
                        const result = encodeCanonical(bytes);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(typeof JSON.parse(result.value)).toBe('string');
                        }
                });

                it('encodes Uint8Array as array when configured', () => {
                        const bytes = new Uint8Array([1, 2, 3]);
                        const result = encodeCanonical(bytes, { binaryPolicy: 'array' });
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe('[1,2,3]');
                        }
                });

                it('rejects binary data when configured', () => {
                        const bytes = new Uint8Array([1, 2, 3]);
                        const result = encodeCanonical(bytes, { binaryPolicy: 'error' });
                        expect(isErr(result)).toBe(true);
                });
        });

        describe('Unsupported Types', () => {
                it('rejects functions', () => {
                        const result = encodeCanonical(() => {});
                        expect(isErr(result)).toBe(true);
                });

                it('rejects symbols', () => {
                        const result = encodeCanonical(Symbol('test'));
                        expect(isErr(result)).toBe(true);
                });
        });

        describe('Circular References', () => {
                it('detects and rejects circular object references', () => {
                        interface SelfRef {
                                a: number;
                                self?: SelfRef;
                        }
                        const obj: SelfRef = { a: 1 };
                        obj.self = obj;
                        const result = encodeCanonical(obj);
                        expect(isErr(result)).toBe(true);
                        if (isErr(result)) {
                                expect(result.diagnostics[0].message).toContain('circular');
                        }
                });

                it('detects and rejects circular array references', () => {
                        type RecArr = Array<number | RecArr>;
                        const arr: RecArr = [1, 2];
                        arr.push(arr);
                        const result = encodeCanonical(arr);
                        expect(isErr(result)).toBe(true);
                });
        });

        describe('Determinism', () => {
                it('produces identical output for identical objects', () => {
                        const obj = { z: 3, a: 1, m: 2, nested: { x: 4, b: 2 } };
                        const result1 = encodeCanonical(obj);
                        const result2 = encodeCanonical(obj);

                        expect(isOk(result1) && isOk(result2)).toBe(true);
                        if (isOk(result1) && isOk(result2)) {
                                expect(result1.value).toBe(result2.value);
                        }
                });

                it('produces identical output regardless of property insertion order', () => {
                        const obj1 = { a: 1, b: 2, c: 3 };
                        const obj2 = { c: 3, b: 2, a: 1 };

                        const result1 = encodeCanonical(obj1);
                        const result2 = encodeCanonical(obj2);

                        expect(isOk(result1) && isOk(result2)).toBe(true);
                        if (isOk(result1) && isOk(result2)) {
                                expect(result1.value).toBe(result2.value);
                        }
                });

                it('produces sorted keys at all levels', () => {
                        const obj = {
                                z: { z2: 1, a2: 2 },
                                a: { z1: 3, a1: 4 },
                        };
                        const result = encodeCanonical(obj);

                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toBe(
                                        '{"a":{"a1":4,"z1":3},"z":{"a2":2,"z2":1}}',
                                );
                        }
                });
        });

        describe('Complex Nested Structures', () => {
                it('encodes complex IR-like structures', () => {
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
                                        {
                                                name: 'count',
                                                type: {
                                                        kind: 'primitive',
                                                        primitiveKind: 'number',
                                                },
                                                optional: true,
                                        },
                                ],
                        };

                        const result = encodeCanonical(irNode);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                const parsed = JSON.parse(result.value);
                                expect(parsed.kind).toBe('object');
                                expect(parsed.properties).toHaveLength(2);
                        }
                });

                it('handles mixed arrays and objects', () => {
                        const complex = {
                                items: [{ id: 1 }, { id: 2 }],
                                metadata: {
                                        count: 2,
                                        tags: ['a', 'b'],
                                },
                        };

                        const result = encodeCanonical(complex);
                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                const parsed = JSON.parse(result.value);
                                expect(Object.keys(parsed)).toEqual(['items', 'metadata']);
                                expect(Object.keys(parsed.metadata)).toEqual(['count', 'tags']);
                        }
                });
        });

        describe('Configuration Combinations', () => {
                it('handles multiple policy configurations', () => {
                        const data = {
                                bigint: 42n,
                                special: NaN,
                                date: new Date('2024-01-01'),
                                undef: undefined,
                        };

                        const result = encodeCanonical(data, {
                                bigintPolicy: 'string',
                                specialNumberPolicy: 'null',
                                datePolicy: 'epoch-ms',
                                undefinedPolicy: 'null',
                        });

                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                const parsed = JSON.parse(result.value);
                                expect(typeof parsed.bigint).toBe('string');
                                expect(parsed.special).toBe(null);
                                expect(typeof parsed.date).toBe('number');
                                expect(parsed.undef).toBe(null);
                        }
                });
        });
});
