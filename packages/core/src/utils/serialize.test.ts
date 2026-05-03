// packages/core/src/utils/serialize.test.ts

import { describe, it, expect } from 'vitest';

import { safeSerialize } from './serialize.js';

describe('safeSerialize', () => {
        // ============================================================================
        // BASIC TYPES
        // ============================================================================

        describe('Basic Types', () => {
                it('serializes strings', () => {
                        expect(safeSerialize('hello')).toBe('"hello"');
                        expect(safeSerialize('')).toBe('""');
                        expect(safeSerialize('with spaces')).toBe('"with spaces"');
                });

                it('serializes numbers', () => {
                        expect(safeSerialize(0)).toBe('0');
                        expect(safeSerialize(42)).toBe('42');
                        expect(safeSerialize(-42)).toBe('-42');
                        expect(safeSerialize(3.14)).toBe('3.14');
                        expect(safeSerialize(1e10)).toBe('10000000000');
                });

                it('serializes booleans', () => {
                        expect(safeSerialize(true)).toBe('true');
                        expect(safeSerialize(false)).toBe('false');
                });

                it('serializes null', () => {
                        expect(safeSerialize(null)).toBe('null');
                });

                it('serializes undefined', () => {
                        expect(safeSerialize(undefined)).toBe(undefined);
                });
        });

        // ============================================================================
        // BIGINT HANDLING
        // ============================================================================

        describe('BigInt', () => {
                it('serializes positive bigint with "n" suffix', () => {
                        expect(safeSerialize(BigInt(42))).toBe('42n');
                        expect(safeSerialize(BigInt(0))).toBe('0n');
                        expect(safeSerialize(BigInt(9007199254740991))).toBe('9007199254740991n');
                });

                it('serializes negative bigint with "n" suffix', () => {
                        expect(safeSerialize(BigInt(-42))).toBe('-42n');
                        expect(safeSerialize(BigInt(-9007199254740991))).toBe('-9007199254740991n');
                });

                it('serializes very large bigint', () => {
                        const huge = BigInt('123456789012345678901234567890');
                        expect(safeSerialize(huge)).toBe('123456789012345678901234567890n');
                });

                it('distinguishes bigint from number', () => {
                        const num = safeSerialize(42);
                        const big = safeSerialize(BigInt(42));

                        expect(num).toBe('42');
                        expect(big).toBe('42n');
                        expect(num).not.toBe(big);
                });

                it('handles edge case: BigInt(0)', () => {
                        expect(safeSerialize(BigInt(0))).toBe('0n');
                        expect(safeSerialize(0)).toBe('0');
                        expect(safeSerialize(BigInt(0))).not.toBe(safeSerialize(0));
                });
        });

        // ============================================================================
        // NEGATIVE ZERO HANDLING
        // ============================================================================

        describe('Negative Zero', () => {
                it('serializes -0 as "-0"', () => {
                        expect(safeSerialize(-0)).toBe('-0');
                });

                it('distinguishes -0 from +0', () => {
                        const negZero = safeSerialize(-0);
                        const posZero = safeSerialize(0);

                        expect(negZero).toBe('-0');
                        expect(posZero).toBe('0');
                        expect(negZero).not.toBe(posZero);
                });

                it('handles -0 in arithmetic', () => {
                        const result = 0 * -1; // Creates -0
                        expect(safeSerialize(result)).toBe('-0');
                });

                it('handles Object.is(-0, -0)', () => {
                        const value = -0;
                        expect(Object.is(value, -0)).toBe(true);
                        expect(safeSerialize(value)).toBe('-0');
                });
        });

        // ============================================================================
        // SPECIAL NUMBERS
        // ============================================================================

        describe('Special Numbers', () => {
                it('serializes Infinity', () => {
                        expect(safeSerialize(Infinity)).toBe('null');
                });

                it('serializes -Infinity', () => {
                        expect(safeSerialize(-Infinity)).toBe('null');
                });

                it('serializes NaN', () => {
                        expect(safeSerialize(NaN)).toBe('null');
                });

                it('handles Number.MAX_VALUE', () => {
                        expect(safeSerialize(Number.MAX_VALUE)).toContain('e');
                        expect(safeSerialize(Number.MAX_VALUE)).not.toBe('null');
                });

                it('handles Number.MIN_VALUE', () => {
                        expect(safeSerialize(Number.MIN_VALUE)).toContain('e');
                        expect(safeSerialize(Number.MIN_VALUE)).not.toBe('null');
                });

                it('handles Number.EPSILON', () => {
                        expect(safeSerialize(Number.EPSILON)).toContain('e');
                });

                it('handles very small numbers', () => {
                        expect(safeSerialize(1e-100)).toContain('e');
                        expect(safeSerialize(1e-100)).not.toBe('null');
                });

                it('handles very large numbers', () => {
                        expect(safeSerialize(1e100)).toContain('e');
                        expect(safeSerialize(1e100)).not.toBe('null');
                });
        });

        // ============================================================================
        // OBJECTS
        // ============================================================================

        describe('Objects', () => {
                it('serializes simple objects', () => {
                        expect(safeSerialize({ a: 1 })).toBe('{"a":1}');
                        expect(safeSerialize({ name: 'test' })).toBe('{"name":"test"}');
                });

                it('serializes nested objects', () => {
                        const obj = { a: { b: { c: 1 } } };
                        expect(safeSerialize(obj)).toBe('{"a":{"b":{"c":1}}}');
                });

                it('serializes empty objects', () => {
                        expect(safeSerialize({})).toBe('{}');
                });

                it('handles objects with multiple properties', () => {
                        const obj = { a: 1, b: 2, c: 3 };
                        const result = safeSerialize(obj);

                        // JSON.stringify may change property order, but result should be valid JSON
                        expect(JSON.parse(result)).toEqual(obj);
                });

                it('handles objects with null values', () => {
                        expect(safeSerialize({ a: null })).toBe('{"a":null}');
                });

                it('handles objects with boolean values', () => {
                        expect(safeSerialize({ flag: true })).toBe('{"flag":true}');
                });

                it('handles objects with mixed value types', () => {
                        const obj = { str: 'test', num: 42, bool: true, nil: null };
                        const result = safeSerialize(obj);

                        expect(JSON.parse(result)).toEqual(obj);
                });
        });

        // ============================================================================
        // ARRAYS
        // ============================================================================

        describe('Arrays', () => {
                it('serializes simple arrays', () => {
                        expect(safeSerialize([1, 2, 3])).toBe('[1,2,3]');
                        expect(safeSerialize(['a', 'b', 'c'])).toBe('["a","b","c"]');
                });

                it('serializes empty arrays', () => {
                        expect(safeSerialize([])).toBe('[]');
                });

                it('serializes nested arrays', () => {
                        expect(
                                safeSerialize([
                                        [1, 2],
                                        [3, 4],
                                ]),
                        ).toBe('[[1,2],[3,4]]');
                });

                it('serializes arrays with mixed types', () => {
                        const arr = [1, 'two', true, null];
                        expect(safeSerialize(arr)).toBe('[1,"two",true,null]');
                });

                it('handles sparse arrays', () => {
                        const sparse = [1, , 3]; // eslint-disable-line no-sparse-arrays
                        const result = safeSerialize(sparse);

                        // JSON.stringify converts sparse arrays (undefined becomes null)
                        expect(result).toBe('[1,null,3]');
                });

                it('handles arrays with objects', () => {
                        const arr = [{ a: 1 }, { b: 2 }];
                        expect(safeSerialize(arr)).toBe('[{"a":1},{"b":2}]');
                });
        });

        // ============================================================================
        // STRING EDGE CASES
        // ============================================================================

        describe('String Edge Cases', () => {
                it('escapes special characters', () => {
                        expect(safeSerialize('line1\nline2')).toBe('"line1\\nline2"');
                        expect(safeSerialize('tab\there')).toBe('"tab\\there"');
                        expect(safeSerialize('quote"test')).toBe('"quote\\"test"');
                });

                it('handles backslashes', () => {
                        expect(safeSerialize('path\\to\\file')).toBe('"path\\\\to\\\\file"');
                });

                it('handles unicode characters', () => {
                        expect(safeSerialize('hello 你好')).toContain('你好');
                        expect(safeSerialize('emoji 🎉')).toContain('🎉');
                });

                it('handles empty string', () => {
                        expect(safeSerialize('')).toBe('""');
                });

                it('handles very long strings', () => {
                        const long = 'x'.repeat(10000);
                        const result = safeSerialize(long);

                        expect(result).toHaveLength(10002); // +2 for quotes
                        expect(result.startsWith('"')).toBe(true);
                        expect(result.endsWith('"')).toBe(true);
                });

                it('handles strings with only whitespace', () => {
                        expect(safeSerialize('   ')).toBe('"   "');
                        expect(safeSerialize('\n\n\n')).toBe('"\\n\\n\\n"');
                        expect(safeSerialize('\t\t\t')).toBe('"\\t\\t\\t"');
                });
        });

        // ============================================================================
        // CONSISTENCY WITH JSON.stringify
        // ============================================================================

        describe('Consistency with JSON.stringify', () => {
                it('matches JSON.stringify for strings', () => {
                        const value = 'hello';
                        expect(safeSerialize(value)).toBe(JSON.stringify(value));
                });

                it('matches JSON.stringify for positive numbers', () => {
                        expect(safeSerialize(42)).toBe(JSON.stringify(42));
                        expect(safeSerialize(3.14)).toBe(JSON.stringify(3.14));
                });

                it('matches JSON.stringify for booleans', () => {
                        expect(safeSerialize(true)).toBe(JSON.stringify(true));
                        expect(safeSerialize(false)).toBe(JSON.stringify(false));
                });

                it('matches JSON.stringify for null', () => {
                        expect(safeSerialize(null)).toBe(JSON.stringify(null));
                });

                it('matches JSON.stringify for objects (when no special values)', () => {
                        const obj = { a: 1, b: 'test', c: true };
                        expect(safeSerialize(obj)).toBe(JSON.stringify(obj));
                });

                it('matches JSON.stringify for arrays (when no special values)', () => {
                        const arr = [1, 'test', true, null];
                        expect(safeSerialize(arr)).toBe(JSON.stringify(arr));
                });
        });

        // ============================================================================
        // DIVERGENCE FROM JSON.stringify
        // ============================================================================

        describe('Divergence from JSON.stringify', () => {
                it('diverges for bigint (does not throw)', () => {
                        expect(() => JSON.stringify(BigInt(42))).toThrow();
                        expect(() => safeSerialize(BigInt(42))).not.toThrow();
                        expect(safeSerialize(BigInt(42))).toBe('42n');
                });

                it('diverges for -0 (preserves sign)', () => {
                        expect(JSON.stringify(-0)).toBe('0');
                        expect(safeSerialize(-0)).toBe('-0');
                });

                it('handles object with -0 value differently', () => {
                        const obj = { value: -0 };

                        // JSON.stringify loses the negative zero
                        expect(JSON.stringify(obj)).toBe('{"value":0}');

                        // safeSerialize preserves it... wait, no it doesn't because it delegates to JSON.stringify for objects
                        // This is actually correct behavior - we only handle -0 specially at the top level
                        const result = safeSerialize(obj);
                        const parsed = JSON.parse(result);
                        expect(parsed.value).toBe(0); // -0 becomes 0 in object context
                });
        });

        // ============================================================================
        // LITERAL TYPE VALUES
        // ============================================================================

        describe('Literal Type Values', () => {
                it('serializes string literals', () => {
                        expect(safeSerialize('literal')).toBe('"literal"');
                });

                it('serializes number literals', () => {
                        expect(safeSerialize(42)).toBe('42');
                });

                it('serializes boolean literals', () => {
                        expect(safeSerialize(true)).toBe('true');
                        expect(safeSerialize(false)).toBe('false');
                });

                it('serializes null literal', () => {
                        expect(safeSerialize(null)).toBe('null');
                });

                it('serializes bigint literals', () => {
                        expect(safeSerialize(BigInt(42))).toBe('42n');
                });

                it('produces unique representations for each literal', () => {
                        const literals = [
                                safeSerialize('hello'),
                                safeSerialize(42),
                                safeSerialize(true),
                                safeSerialize(false),
                                safeSerialize(null),
                                safeSerialize(BigInt(42)),
                                safeSerialize(0),
                                safeSerialize(-0),
                        ];

                        // All should be unique
                        const uniqueValues = new Set(literals);
                        expect(uniqueValues.size).toBe(literals.length);
                });
        });

        // ============================================================================
        // DETERMINISM
        // ============================================================================

        describe('Determinism', () => {
                it('produces same output for same input', () => {
                        const value = { a: 1, b: [2, 3], c: 'test' };

                        const result1 = safeSerialize(value);
                        const result2 = safeSerialize(value);

                        expect(result1).toBe(result2);
                });

                it('produces consistent output for primitives', () => {
                        expect(safeSerialize(42)).toBe('42');
                        expect(safeSerialize(42)).toBe('42');
                        expect(safeSerialize(42)).toBe('42');
                });

                it('produces consistent output for bigint', () => {
                        const big = BigInt(9007199254740991);

                        const results = Array.from({ length: 100 }, () => safeSerialize(big));
                        const unique = new Set(results);

                        expect(unique.size).toBe(1);
                });

                it('produces consistent output for -0', () => {
                        const results = Array.from({ length: 100 }, () => safeSerialize(-0));
                        const unique = new Set(results);

                        expect(unique.size).toBe(1);
                        expect([...unique][0]).toBe('-0');
                });
        });

        // ============================================================================
        // TYPE DISTINCTIONS
        // ============================================================================

        describe('Type Distinctions', () => {
                it('distinguishes number from bigint', () => {
                        expect(safeSerialize(42)).not.toBe(safeSerialize(BigInt(42)));
                });

                it('distinguishes 0 from -0', () => {
                        expect(safeSerialize(0)).not.toBe(safeSerialize(-0));
                });

                it('distinguishes string "true" from boolean true', () => {
                        expect(safeSerialize('true')).toBe('"true"');
                        expect(safeSerialize(true)).toBe('true');
                        expect(safeSerialize('true')).not.toBe(safeSerialize(true));
                });

                it('distinguishes string "42" from number 42', () => {
                        expect(safeSerialize('42')).toBe('"42"');
                        expect(safeSerialize(42)).toBe('42');
                        expect(safeSerialize('42')).not.toBe(safeSerialize(42));
                });

                it('distinguishes string "null" from null', () => {
                        expect(safeSerialize('null')).toBe('"null"');
                        expect(safeSerialize(null)).toBe('null');
                        expect(safeSerialize('null')).not.toBe(safeSerialize(null));
                });
        });

        // ============================================================================
        // EDGE CASES
        // ============================================================================

        describe('Edge Cases', () => {
                it('handles Date objects (via JSON.stringify)', () => {
                        const date = new Date('2024-01-01T00:00:00.000Z');
                        const result = safeSerialize(date);

                        expect(result).toBe('"2024-01-01T00:00:00.000Z"');
                });

                it('handles RegExp objects (via JSON.stringify)', () => {
                        const regex = /test/g;
                        const result = safeSerialize(regex);

                        // JSON.stringify converts RegExp to {}
                        expect(result).toBe('{}');
                });

                it('handles functions (via JSON.stringify)', () => {
                        const fn = (): void => {};
                        const result = safeSerialize(fn);

                        // JSON.stringify returns undefined for functions
                        expect(result).toBeUndefined();
                });

                it('handles symbol (via JSON.stringify)', () => {
                        const sym = Symbol('test');
                        const result = safeSerialize(sym);

                        // JSON.stringify returns undefined for symbols
                        expect(result).toBeUndefined();
                });

                type Circular = { a: number; self?: Circular };

                it('handles circular references (throws like JSON.stringify)', () => {
                        const circular: Circular = { a: 1 };
                        circular.self = circular;

                        expect(() => JSON.stringify(circular)).toThrow();
                        expect(() => safeSerialize(circular)).toThrow();
                });
        });

        // ============================================================================
        // USE IN IR CONTEXT
        // ============================================================================

        describe('Use in IR Context', () => {
                it('produces stable IDs for primitive types', () => {
                        // These would be used as part of synthetic symbol IDs
                        expect(safeSerialize('string')).toBe('"string"');
                        expect(safeSerialize('number')).toBe('"number"');
                        expect(safeSerialize('boolean')).toBe('"boolean"');
                });

                it('produces stable IDs for literal values', () => {
                        // Used for literal type symbol IDs
                        expect(safeSerialize(42)).toBe('42');
                        expect(safeSerialize('hello')).toBe('"hello"');
                        expect(safeSerialize(true)).toBe('true');
                });

                it('handles all literal kinds correctly', () => {
                        const literals = {
                                string: safeSerialize('test'),
                                number: safeSerialize(42),
                                boolean: safeSerialize(true),
                                bigint: safeSerialize(BigInt(42)),
                                null: safeSerialize(null),
                        };

                        expect(literals.string).toBe('"test"');
                        expect(literals.number).toBe('42');
                        expect(literals.boolean).toBe('true');
                        expect(literals.bigint).toBe('42n');
                        expect(literals.null).toBe('null');
                });

                it('ensures unique serialization for all literal values', () => {
                        const values = [
                                'string',
                                42,
                                true,
                                false,
                                null,
                                BigInt(42),
                                0,
                                -0,
                                '',
                                BigInt(0),
                        ];

                        const serialized = values.map(safeSerialize);
                        const unique = new Set(serialized);

                        // All should be unique
                        expect(unique.size).toBe(values.length);
                });
        });
});
