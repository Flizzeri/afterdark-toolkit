// packages/core/src/utils/synthetic.test.ts

import { DiagnosticCollector } from '@adtk/shared';
import { describe, it, expect } from 'vitest';

import { createSyntheticSymbolId } from './synthetic.js';
import type { IRNode } from '../ir';

describe('createSyntheticSymbolId', () => {
        // ============================================================================
        // DETERMINISM & STABILITY
        // ============================================================================

        describe('Determinism', () => {
                it('generates identical IDs for same inputs', () => {
                        const diagnostics1 = new DiagnosticCollector();
                        const diagnostics2 = new DiagnosticCollector();

                        const id1 = createSyntheticSymbolId('primitive', 'string', diagnostics1);
                        const id2 = createSyntheticSymbolId('primitive', 'string', diagnostics2);

                        expect(id1).toBe(id2);
                });

                it('is stable across multiple calls', () => {
                        const diagnostics = new DiagnosticCollector();
                        const ids: string[] = [];

                        // Generate the same ID 100 times
                        for (let i = 0; i < 100; i++) {
                                ids.push(
                                        createSyntheticSymbolId('primitive', 'number', diagnostics),
                                );
                        }

                        // All should be identical
                        const uniqueIds = new Set(ids);
                        expect(uniqueIds.size).toBe(1);
                });

                it('is stable across different diagnostic collectors', () => {
                        const ids: string[] = [];

                        for (let i = 0; i < 10; i++) {
                                const diagnostics = new DiagnosticCollector();
                                ids.push(
                                        createSyntheticSymbolId('literal', '"hello"', diagnostics),
                                );
                        }

                        const uniqueIds = new Set(ids);
                        expect(uniqueIds.size).toBe(1);
                });
        });

        // ============================================================================
        // UNIQUENESS
        // ============================================================================

        describe('Uniqueness', () => {
                it('generates different IDs for different primitive types', () => {
                        const diagnostics = new DiagnosticCollector();

                        const stringId = createSyntheticSymbolId(
                                'primitive',
                                'string',
                                diagnostics,
                        );
                        const numberId = createSyntheticSymbolId(
                                'primitive',
                                'number',
                                diagnostics,
                        );
                        const booleanId = createSyntheticSymbolId(
                                'primitive',
                                'boolean',
                                diagnostics,
                        );

                        expect(stringId).not.toBe(numberId);
                        expect(stringId).not.toBe(booleanId);
                        expect(numberId).not.toBe(booleanId);
                });

                it('generates different IDs for different literal values', () => {
                        const diagnostics = new DiagnosticCollector();

                        const hello = createSyntheticSymbolId('literal', '"hello"', diagnostics);
                        const world = createSyntheticSymbolId('literal', '"world"', diagnostics);
                        const num42 = createSyntheticSymbolId('literal', '42', diagnostics);

                        expect(hello).not.toBe(world);
                        expect(hello).not.toBe(num42);
                        expect(world).not.toBe(num42);
                });

                it('generates different IDs for different categories', () => {
                        const diagnostics = new DiagnosticCollector();

                        const primitive = createSyntheticSymbolId(
                                'primitive',
                                'string',
                                diagnostics,
                        );
                        const literal = createSyntheticSymbolId('literal', 'string', diagnostics);
                        const array = createSyntheticSymbolId('array', 'string', diagnostics);

                        expect(primitive).not.toBe(literal);
                        expect(primitive).not.toBe(array);
                        expect(literal).not.toBe(array);
                });

                it('generates different IDs for similar but distinct values', () => {
                        const diagnostics = new DiagnosticCollector();

                        const zero = createSyntheticSymbolId('literal', '0', diagnostics);
                        const negativeZero = createSyntheticSymbolId('literal', '-0', diagnostics);
                        const falsy = createSyntheticSymbolId('literal', 'false', diagnostics);

                        expect(zero).not.toBe(negativeZero);
                        expect(zero).not.toBe(falsy);
                        expect(negativeZero).not.toBe(falsy);
                });

                it('handles hash collisions gracefully', () => {
                        // While SHA-256 collisions are astronomically unlikely,
                        // the function should still produce different IDs for different inputs
                        const diagnostics = new DiagnosticCollector();
                        const ids = new Set<string>();

                        // Generate IDs for many different values
                        for (let i = 0; i < 1000; i++) {
                                const id = createSyntheticSymbolId(
                                        'literal',
                                        `value${i}`,
                                        diagnostics,
                                );
                                ids.add(id);
                        }

                        // All should be unique
                        expect(ids.size).toBe(1000);
                });
        });

        // ============================================================================
        // ID FORMAT
        // ============================================================================

        describe('ID Format', () => {
                it('follows expected format: value#<intrinsic:category>#hash', () => {
                        const diagnostics = new DiagnosticCollector();
                        const id = createSyntheticSymbolId('primitive', 'string', diagnostics);

                        // Should match: string#<intrinsic:primitive>#<8-char-hash>
                        expect(id).toMatch(/^string#<intrinsic:primitive>#[a-f0-9]{8}$/);
                });

                it('includes the value in the ID', () => {
                        const diagnostics = new DiagnosticCollector();

                        const stringId = createSyntheticSymbolId(
                                'primitive',
                                'string',
                                diagnostics,
                        );
                        const numberId = createSyntheticSymbolId(
                                'primitive',
                                'number',
                                diagnostics,
                        );

                        expect(stringId).toContain('string#');
                        expect(numberId).toContain('number#');
                });

                it('includes the category in the ID', () => {
                        const diagnostics = new DiagnosticCollector();

                        const primitiveId = createSyntheticSymbolId(
                                'primitive',
                                'string',
                                diagnostics,
                        );
                        const literalId = createSyntheticSymbolId(
                                'literal',
                                '"hello"',
                                diagnostics,
                        );

                        expect(primitiveId).toContain('<intrinsic:primitive>');
                        expect(literalId).toContain('<intrinsic:literal>');
                });

                it('includes an 8-character hash', () => {
                        const diagnostics = new DiagnosticCollector();
                        const id = createSyntheticSymbolId('primitive', 'string', diagnostics);

                        // Extract hash (last component after #)
                        const parts = id.split('#');
                        const hash = parts[parts.length - 1];

                        expect(hash).toHaveLength(8);
                        expect(hash).toMatch(/^[a-f0-9]{8}$/);
                });
        });

        // ============================================================================
        // ALL IR NODE KINDS
        // ============================================================================

        describe('All IR Node Kinds', () => {
                const allKinds: Array<IRNode['kind']> = [
                        'primitive',
                        'literal',
                        'array',
                        'tuple',
                        'object',
                        'templateLiteral',
                        'union',
                        'intersection',
                        'ref',
                        'unsupported',
                ];

                it('generates valid IDs for all IR node kinds', () => {
                        const diagnostics = new DiagnosticCollector();

                        for (const kind of allKinds) {
                                const id = createSyntheticSymbolId(kind, 'test-value', diagnostics);

                                expect(id).toBeTruthy();
                                expect(id).toContain(`<intrinsic:${kind}>`);
                                expect(diagnostics.hasErrors()).toBe(false);
                        }
                });

                it('generates unique IDs for each kind', () => {
                        const diagnostics = new DiagnosticCollector();
                        const ids = new Set<string>();

                        for (const kind of allKinds) {
                                const id = createSyntheticSymbolId(kind, 'same-value', diagnostics);
                                ids.add(id);
                        }

                        expect(ids.size).toBe(allKinds.length);
                });
        });

        // ============================================================================
        // SPECIAL VALUES
        // ============================================================================

        describe('Special Values', () => {
                it('handles empty string', () => {
                        const diagnostics = new DiagnosticCollector();
                        const id = createSyntheticSymbolId('literal', '', diagnostics);

                        expect(id).toBeTruthy();
                        expect(diagnostics.hasErrors()).toBe(false);
                });

                it('handles very long strings', () => {
                        const diagnostics = new DiagnosticCollector();
                        const longString = 'x'.repeat(10000);
                        const id = createSyntheticSymbolId('literal', longString, diagnostics);

                        expect(id).toBeTruthy();
                        expect(diagnostics.hasErrors()).toBe(false);
                });

                it('handles strings with special characters', () => {
                        const diagnostics = new DiagnosticCollector();

                        const specialValues = [
                                'string with spaces',
                                'string\nwith\nnewlines',
                                'string\twith\ttabs',
                                'string with "quotes"',
                                "string with 'quotes'",
                                'string with #hash',
                                'string with |pipe|',
                                'string with <brackets>',
                                'string with {braces}',
                                'unicode: 你好世界',
                                'emoji: 🎉🚀💯',
                        ];

                        for (const value of specialValues) {
                                const id = createSyntheticSymbolId('literal', value, diagnostics);

                                expect(id).toBeTruthy();
                                expect(diagnostics.hasErrors()).toBe(false);
                        }
                });

                it('handles numeric strings', () => {
                        const diagnostics = new DiagnosticCollector();

                        const id1 = createSyntheticSymbolId('literal', '42', diagnostics);
                        const id2 = createSyntheticSymbolId('literal', '3.14', diagnostics);
                        const id3 = createSyntheticSymbolId('literal', '-0', diagnostics);
                        const id4 = createSyntheticSymbolId('literal', 'Infinity', diagnostics);
                        const id5 = createSyntheticSymbolId('literal', 'NaN', diagnostics);

                        expect(id1).not.toBe(id2);
                        expect(id2).not.toBe(id3);
                        expect(id3).not.toBe(id4);
                        expect(id4).not.toBe(id5);
                });

                it('handles boolean strings', () => {
                        const diagnostics = new DiagnosticCollector();

                        const trueId = createSyntheticSymbolId('literal', 'true', diagnostics);
                        const falseId = createSyntheticSymbolId('literal', 'false', diagnostics);

                        expect(trueId).not.toBe(falseId);
                        expect(trueId).toContain('true#');
                        expect(falseId).toContain('false#');
                });

                it('handles null string', () => {
                        const diagnostics = new DiagnosticCollector();
                        const id = createSyntheticSymbolId('literal', 'null', diagnostics);

                        expect(id).toContain('null#');
                        expect(diagnostics.hasErrors()).toBe(false);
                });

                it('handles bigint strings', () => {
                        const diagnostics = new DiagnosticCollector();

                        const id1 = createSyntheticSymbolId(
                                'literal',
                                '9007199254740991n',
                                diagnostics,
                        );
                        const id2 = createSyntheticSymbolId(
                                'literal',
                                '-9007199254740991n',
                                diagnostics,
                        );

                        expect(id1).not.toBe(id2);
                });
        });

        // ============================================================================
        // HASH CONSISTENCY
        // ============================================================================

        describe('Hash Consistency', () => {
                it('produces consistent hashes for same value', () => {
                        const diagnostics = new DiagnosticCollector();

                        const ids = Array.from({ length: 100 }, () =>
                                createSyntheticSymbolId('primitive', 'string', diagnostics),
                        );

                        // Extract hashes
                        const hashes = ids.map((id) => {
                                const parts = id.split('#');
                                return parts[parts.length - 1];
                        });

                        // All hashes should be identical
                        const uniqueHashes = new Set(hashes);
                        expect(uniqueHashes.size).toBe(1);
                });

                it('produces different hashes for different values', () => {
                        const diagnostics = new DiagnosticCollector();

                        const values = ['a', 'b', 'c', 'd', 'e'];
                        const hashes = values.map((value) => {
                                const id = createSyntheticSymbolId('literal', value, diagnostics);
                                const parts = id.split('#');
                                return parts[parts.length - 1];
                        });

                        // All hashes should be different
                        const uniqueHashes = new Set(hashes);
                        expect(uniqueHashes.size).toBe(values.length);
                });

                it('uses only first 8 characters of hash', () => {
                        const diagnostics = new DiagnosticCollector();
                        const id = createSyntheticSymbolId('primitive', 'test', diagnostics);

                        const parts = id.split('#');
                        const hash = parts[parts.length - 1];

                        expect(hash).toHaveLength(8);
                });
        });

        // ============================================================================
        // COMPLEX TYPE REPRESENTATIONS
        // ============================================================================

        describe('Complex Type Representations', () => {
                it('handles complex object type strings', () => {
                        const diagnostics = new DiagnosticCollector();
                        const objectStr = '{ name: string; age: number; nested: { id: string } }';
                        const id = createSyntheticSymbolId('object', objectStr, diagnostics);

                        expect(id).toBeTruthy();
                        expect(diagnostics.hasErrors()).toBe(false);
                });

                it('handles union type strings', () => {
                        const diagnostics = new DiagnosticCollector();
                        const unionStr = 'string | number | boolean';
                        const id = createSyntheticSymbolId('union', unionStr, diagnostics);

                        expect(id).toBeTruthy();
                        expect(id).toContain('string | number | boolean#');
                });

                it('handles template literal type strings', () => {
                        const diagnostics = new DiagnosticCollector();
                        const templateStr = '`/${string}`';
                        const id = createSyntheticSymbolId(
                                'templateLiteral',
                                templateStr,
                                diagnostics,
                        );

                        expect(id).toBeTruthy();
                        expect(diagnostics.hasErrors()).toBe(false);
                });

                it('handles array type strings', () => {
                        const diagnostics = new DiagnosticCollector();

                        const id1 = createSyntheticSymbolId('array', 'string[]', diagnostics);
                        const id2 = createSyntheticSymbolId('array', 'Array<string>', diagnostics);

                        // Different string representations should have different IDs
                        expect(id1).not.toBe(id2);
                });

                it('handles tuple type strings', () => {
                        const diagnostics = new DiagnosticCollector();
                        const tupleStr = '[string, number, boolean]';
                        const id = createSyntheticSymbolId('tuple', tupleStr, diagnostics);

                        expect(id).toBeTruthy();
                        expect(diagnostics.hasErrors()).toBe(false);
                });
        });

        // ============================================================================
        // INTRINSIC MARKER
        // ============================================================================

        describe('Intrinsic Marker', () => {
                it('includes <intrinsic:category> marker', () => {
                        const diagnostics = new DiagnosticCollector();
                        const id = createSyntheticSymbolId('primitive', 'string', diagnostics);

                        expect(id).toContain('<intrinsic:primitive>');
                });

                it('allows easy identification of synthetic IDs', () => {
                        const diagnostics = new DiagnosticCollector();

                        const syntheticId = createSyntheticSymbolId(
                                'primitive',
                                'string',
                                diagnostics,
                        );
                        const userDefinedId = 'MyType#src/types.ts#abc12345';

                        expect(syntheticId).toContain('<intrinsic:');
                        expect(userDefinedId).not.toContain('<intrinsic:');
                });

                it('includes category in intrinsic marker', () => {
                        const diagnostics = new DiagnosticCollector();

                        const primitiveId = createSyntheticSymbolId(
                                'primitive',
                                'value',
                                diagnostics,
                        );
                        const literalId = createSyntheticSymbolId('literal', 'value', diagnostics);
                        const arrayId = createSyntheticSymbolId('array', 'value', diagnostics);

                        expect(primitiveId).toMatch(/<intrinsic:primitive>/);
                        expect(literalId).toMatch(/<intrinsic:literal>/);
                        expect(arrayId).toMatch(/<intrinsic:array>/);
                });
        });

        // ============================================================================
        // DIAGNOSTIC INTEGRATION
        // ============================================================================

        describe('Diagnostic Integration', () => {
                it('does not add diagnostics on success', () => {
                        const diagnostics = new DiagnosticCollector();

                        createSyntheticSymbolId('primitive', 'string', diagnostics);

                        expect(diagnostics.hasErrors()).toBe(false);
                        expect(diagnostics.hasWarnings()).toBe(false);
                });

                it('works with empty diagnostic collector', () => {
                        const diagnostics = new DiagnosticCollector();

                        const id = createSyntheticSymbolId('literal', '"test"', diagnostics);

                        expect(id).toBeTruthy();
                        expect(diagnostics.getAll().length).toBe(0);
                });

                it('works with diagnostic collector containing other diagnostics', () => {
                        const diagnostics = new DiagnosticCollector();

                        // Add some unrelated diagnostics
                        diagnostics.addWarning('ADTK-TEST-0001', 'Unrelated warning', [], {
                                description: 'Test',
                        });

                        const id = createSyntheticSymbolId('primitive', 'number', diagnostics);

                        expect(id).toBeTruthy();
                        expect(diagnostics.getWarnings().length).toBe(1); // Only the one we added
                });
        });

        // ============================================================================
        // REGRESSION TESTS
        // ============================================================================

        describe('Regression Tests', () => {
                it('does not confuse similar values with different categories', () => {
                        const diagnostics = new DiagnosticCollector();

                        // These should all be different even though value is "string"
                        const ids = [
                                createSyntheticSymbolId('primitive', 'string', diagnostics),
                                createSyntheticSymbolId('literal', 'string', diagnostics),
                                createSyntheticSymbolId('array', 'string', diagnostics),
                                createSyntheticSymbolId('object', 'string', diagnostics),
                        ];

                        const uniqueIds = new Set(ids);
                        expect(uniqueIds.size).toBe(4);
                });

                it('handles values that look like symbol IDs', () => {
                        const diagnostics = new DiagnosticCollector();

                        const id = createSyntheticSymbolId(
                                'literal',
                                'User#src/types.ts#abc123',
                                diagnostics,
                        );

                        expect(id).toBeTruthy();
                        expect(id).toContain('<intrinsic:literal>');
                        expect(diagnostics.hasErrors()).toBe(false);
                });

                it('handles values with hash characters', () => {
                        const diagnostics = new DiagnosticCollector();

                        const id = createSyntheticSymbolId(
                                'literal',
                                'value#with#hashes',
                                diagnostics,
                        );

                        expect(id).toBeTruthy();
                        expect(diagnostics.hasErrors()).toBe(false);
                });
        });
});
