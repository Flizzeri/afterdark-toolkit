// tests/unit/ir/lower.test.ts

import type { SymbolId } from '@afterdarktk/shared';
import { describe, it, expect } from 'vitest';

import { lowerToIR } from '../../../src/ir/lower.js';
import type { ParsedAnnotation } from '../../../src/jsdoc/annotations.js';
import type { SourceSpan } from '../../../src/shared/diagnostics.js';
import type { ResolvedType } from '../../../src/types/types.js';

describe('IR Lowering', () => {
        const testSymbolId = 'Test.Symbol' as SymbolId;

        describe('Primitives', () => {
                it('should lower primitive types', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'string',
                                metadata: {
                                        symbolId: testSymbolId,
                                        annotations: [],
                                },
                        });
                });

                it('should preserve all primitive kinds', () => {
                        const kinds = [
                                'string',
                                'number',
                                'boolean',
                                'bigint',
                                'null',
                                'undefined',
                        ] as const;

                        for (const primitiveKind of kinds) {
                                const resolvedType: ResolvedType = {
                                        kind: 'primitive',
                                        primitiveKind,
                                };

                                const result = lowerToIR({
                                        symbolId: testSymbolId,
                                        resolvedType,
                                        annotations: [],
                                });

                                expect(result.kind).toBe('primitive');
                                if (result.kind === 'primitive') {
                                        expect(result.primitiveKind).toBe(primitiveKind);
                                }
                        }
                });
        });

        describe('Literals', () => {
                it('should lower string literals', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'literal',
                                literalKind: 'string',
                                value: 'hello',
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result).toEqual({
                                kind: 'literal',
                                literalKind: 'string',
                                value: 'hello',
                                metadata: {
                                        symbolId: testSymbolId,
                                        annotations: [],
                                },
                        });
                });

                it('should lower number literals', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'literal',
                                literalKind: 'number',
                                value: 42,
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('literal');
                        if (result.kind === 'literal') {
                                expect(result.value).toBe(42);
                        }
                });

                it('should lower boolean literals', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'literal',
                                literalKind: 'boolean',
                                value: true,
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('literal');
                        if (result.kind === 'literal') {
                                expect(result.value).toBe(true);
                        }
                });

                it('should lower bigint literals', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'literal',
                                literalKind: 'bigint',
                                value: 9007199254740991n,
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('literal');
                        if (result.kind === 'literal') {
                                expect(result.value).toBe(9007199254740991n);
                        }
                });
        });

        describe('Literal Unions', () => {
                it('should lower literal unions', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'literalUnion',
                                members: [
                                        { kind: 'literal', literalKind: 'string', value: 'a' },
                                        { kind: 'literal', literalKind: 'string', value: 'b' },
                                        { kind: 'literal', literalKind: 'string', value: 'c' },
                                ],
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('literalUnion');
                        if (result.kind === 'literalUnion') {
                                expect(result.members).toHaveLength(3);
                                expect(result.members[0].value).toBe('a');
                                expect(result.members[1].value).toBe('b');
                                expect(result.members[2].value).toBe('c');
                        }
                });
        });

        describe('Arrays', () => {
                it('should lower array types', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'array',
                                element: { kind: 'primitive', primitiveKind: 'string' },
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('array');
                        if (result.kind === 'array') {
                                expect(result.element.kind).toBe('primitive');
                                if (result.element.kind === 'primitive') {
                                        expect(result.element.primitiveKind).toBe('string');
                                }
                        }
                });

                it('should lower nested arrays', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'array',
                                element: {
                                        kind: 'array',
                                        element: { kind: 'primitive', primitiveKind: 'number' },
                                },
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('array');
                        if (result.kind === 'array') {
                                expect(result.element.kind).toBe('array');
                        }
                });
        });

        describe('Tuples', () => {
                it('should lower tuple types', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'tuple',
                                elements: [
                                        { kind: 'primitive', primitiveKind: 'string' },
                                        { kind: 'primitive', primitiveKind: 'number' },
                                        { kind: 'primitive', primitiveKind: 'boolean' },
                                ],
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('tuple');
                        if (result.kind === 'tuple') {
                                expect(result.elements).toHaveLength(3);
                                expect(result.elements[0].kind).toBe('primitive');
                                expect(result.elements[1].kind).toBe('primitive');
                                expect(result.elements[2].kind).toBe('primitive');
                        }
                });
        });

        describe('Objects', () => {
                it('should lower simple object types', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'object',
                                properties: [
                                        {
                                                name: 'id',
                                                type: {
                                                        kind: 'primitive',
                                                        primitiveKind: 'string',
                                                },
                                                optional: false,
                                                readonly: false,
                                        },
                                        {
                                                name: 'count',
                                                type: {
                                                        kind: 'primitive',
                                                        primitiveKind: 'number',
                                                },
                                                optional: true,
                                                readonly: false,
                                        },
                                ],
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('object');
                        if (result.kind === 'object') {
                                expect(result.properties).toHaveLength(2);
                                expect(result.properties[0].name).toBe('id');
                                expect(result.properties[0].optional).toBe(false);
                                expect(result.properties[1].name).toBe('count');
                                expect(result.properties[1].optional).toBe(true);
                        }
                });

                it('should preserve readonly flags', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'object',
                                properties: [
                                        {
                                                name: 'readonly',
                                                type: {
                                                        kind: 'primitive',
                                                        primitiveKind: 'string',
                                                },
                                                optional: false,
                                                readonly: true,
                                        },
                                        {
                                                name: 'mutable',
                                                type: {
                                                        kind: 'primitive',
                                                        primitiveKind: 'string',
                                                },
                                                optional: false,
                                                readonly: false,
                                        },
                                ],
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('object');
                        if (result.kind === 'object') {
                                expect(result.properties[0].readonly).toBe(true);
                                expect(result.properties[1].readonly).toBe(false);
                        }
                });

                it('should lower objects with index signatures', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'object',
                                properties: [],
                                indexSignature: {
                                        keyType: 'string',
                                        valueType: { kind: 'primitive', primitiveKind: 'number' },
                                },
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('object');
                        if (result.kind === 'object') {
                                expect(result.indexSignature).toBeDefined();
                                expect(result.indexSignature?.keyType).toBe('string');
                                expect(result.indexSignature?.valueType.kind).toBe('primitive');
                        }
                });
        });

        describe('Unions', () => {
                it('should lower union types', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'union',
                                members: [
                                        { kind: 'primitive', primitiveKind: 'string' },
                                        { kind: 'primitive', primitiveKind: 'number' },
                                ],
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('union');
                        if (result.kind === 'union') {
                                expect(result.members).toHaveLength(2);
                        }
                });

                it('should preserve discriminant hints', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'union',
                                members: [
                                        {
                                                kind: 'object',
                                                properties: [
                                                        {
                                                                name: 'type',
                                                                type: {
                                                                        kind: 'literal',
                                                                        literalKind: 'string',
                                                                        value: 'a',
                                                                },
                                                                optional: false,
                                                                readonly: false,
                                                        },
                                                ],
                                        },
                                        {
                                                kind: 'object',
                                                properties: [
                                                        {
                                                                name: 'type',
                                                                type: {
                                                                        kind: 'literal',
                                                                        literalKind: 'string',
                                                                        value: 'b',
                                                                },
                                                                optional: false,
                                                                readonly: false,
                                                        },
                                                ],
                                        },
                                ],
                                discriminant: {
                                        propertyName: 'type',
                                        values: ['a', 'b'],
                                },
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('union');
                        if (result.kind === 'union') {
                                expect(result.discriminant).toBeDefined();
                                expect(result.discriminant?.propertyName).toBe('type');
                                expect(result.discriminant?.values).toEqual(['a', 'b']);
                        }
                });
        });

        describe('Refs', () => {
                it('should lower ref types', () => {
                        const targetSymbol = 'Target.Symbol' as SymbolId;
                        const resolvedType: ResolvedType = {
                                kind: 'ref',
                                target: targetSymbol,
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('ref');
                        if (result.kind === 'ref') {
                                expect(result.target).toBe(targetSymbol);
                        }
                });
        });

        describe('Unsupported', () => {
                it('should lower unsupported types', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'unsupported',
                                reason: 'Function types are not supported',
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('unsupported');
                        if (result.kind === 'unsupported') {
                                expect(result.reason).toBe('Function types are not supported');
                        }
                });

                it('should preserve original text when provided', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'unsupported',
                                reason: 'Complex type',
                                originalText: '() => void',
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('unsupported');
                        if (result.kind === 'unsupported') {
                                expect(result.originalText).toBe('() => void');
                        }
                });
        });

        describe('Metadata', () => {
                it('should attach annotations to IR nodes', () => {
                        const annotations: ParsedAnnotation[] = [{ tag: 'pk' }, { tag: 'unique' }];

                        const resolvedType: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations,
                        });

                        expect(result.metadata.annotations).toEqual(annotations);
                });

                it('should attach source spans when provided', () => {
                        const span = {
                                filePath: '/test/file.ts',
                                startLine: 10,
                                startColumn: 5,
                                endLine: 12,
                                endColumn: 10,
                        } as SourceSpan;

                        const resolvedType: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'number',
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                                span,
                        });

                        expect(result.metadata.span).toEqual(span);
                });
        });

        describe('Complex nested structures', () => {
                it('should lower deeply nested types', () => {
                        const resolvedType: ResolvedType = {
                                kind: 'object',
                                properties: [
                                        {
                                                name: 'data',
                                                type: {
                                                        kind: 'array',
                                                        element: {
                                                                kind: 'object',
                                                                properties: [
                                                                        {
                                                                                name: 'id',
                                                                                type: {
                                                                                        kind: 'primitive',
                                                                                        primitiveKind:
                                                                                                'string',
                                                                                },
                                                                                optional: false,
                                                                                readonly: false,
                                                                        },
                                                                        {
                                                                                name: 'tags',
                                                                                type: {
                                                                                        kind: 'array',
                                                                                        element: {
                                                                                                kind: 'primitive',
                                                                                                primitiveKind:
                                                                                                        'string',
                                                                                        },
                                                                                },
                                                                                optional: true,
                                                                                readonly: false,
                                                                        },
                                                                ],
                                                        },
                                                },
                                                optional: false,
                                                readonly: false,
                                        },
                                ],
                        };

                        const result = lowerToIR({
                                symbolId: testSymbolId,
                                resolvedType,
                                annotations: [],
                        });

                        expect(result.kind).toBe('object');
                        if (result.kind === 'object') {
                                const dataProp = result.properties[0];
                                expect(dataProp.type.kind).toBe('array');

                                if (dataProp.type.kind === 'array') {
                                        expect(dataProp.type.element.kind).toBe('object');
                                }
                        }
                });
        });
});
