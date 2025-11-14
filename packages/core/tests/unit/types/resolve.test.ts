// tests/unit/types/resolve.test.ts

import path from 'node:path';

import { Project } from 'ts-morph';
import { describe, it, expect, beforeAll } from 'vitest';

import { isOk, isErr } from '../../../src/shared/result.js';
import { resolveSymbolType } from '../../../src/types/resolve.js';
import type {
        ResolvedType,
        ResolvedObject,
        ResolvedLiteralUnion,
} from '../../../src/types/types.js';

describe('Type Resolution', () => {
        let project: Project;

        beforeAll(() => {
                const fixturePath = path.join(__dirname, '../../fixtures/types/tsconfig.json');
                project = new Project({
                        tsConfigFilePath: fixturePath,
                });
        });

        function getExportedType(name: string): ResolvedType {
                const sourceFile = project.getSourceFileOrThrow('test-types.ts');
                const typeAlias = sourceFile.getTypeAliasOrThrow(name);
                const symbol = typeAlias.getSymbol();
                if (!symbol) throw new Error(`No symbol for ${name}`);

                const result = resolveSymbolType(symbol);
                if (!isOk(result)) {
                        throw new Error(
                                `Failed to resolve ${name}: ${JSON.stringify(result.diagnostics)}`,
                        );
                }

                return result.value;
        }

        function getExportedInterface(name: string): ResolvedType {
                const sourceFile = project.getSourceFileOrThrow('test-types.ts');
                const iface = sourceFile.getInterfaceOrThrow(name);
                const symbol = iface.getSymbol();
                if (!symbol) throw new Error(`No symbol for ${name}`);

                const result = resolveSymbolType(symbol);
                if (!isOk(result)) {
                        throw new Error(
                                `Failed to resolve ${name}: ${JSON.stringify(result.diagnostics)}`,
                        );
                }

                return result.value;
        }

        function expectError(name: string, isInterface = false): void {
                const sourceFile = project.getSourceFileOrThrow('test-types.ts');
                const decl = isInterface
                        ? sourceFile.getInterfaceOrThrow(name)
                        : sourceFile.getTypeAliasOrThrow(name);
                const symbol = decl.getSymbol();
                if (!symbol) throw new Error(`No symbol for ${name}`);

                const result = resolveSymbolType(symbol);
                expect(isErr(result)).toBe(true);
        }

        describe('Primitives', () => {
                it('resolves string', () => {
                        const resolved = getExportedType('StringType');
                        expect(resolved).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'string',
                        });
                });

                it('resolves number', () => {
                        const resolved = getExportedType('NumberType');
                        expect(resolved).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'number',
                        });
                });

                it('resolves boolean', () => {
                        const resolved = getExportedType('BooleanType');
                        expect(resolved).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'boolean',
                        });
                });

                it('resolves bigint', () => {
                        const resolved = getExportedType('BigIntType');
                        expect(resolved).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'bigint',
                        });
                });

                it('resolves null', () => {
                        const resolved = getExportedType('NullType');
                        expect(resolved).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'null',
                        });
                });

                it('resolves undefined', () => {
                        const resolved = getExportedType('UndefinedType');
                        expect(resolved).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'undefined',
                        });
                });
        });

        describe('Literals', () => {
                it('resolves string literal with kind', () => {
                        const resolved = getExportedType('StringLiteral');
                        expect(resolved).toMatchObject({
                                kind: 'literal',
                                literalKind: 'string',
                                value: 'hello',
                        });
                });

                it('resolves number literal with kind', () => {
                        const resolved = getExportedType('NumberLiteral');
                        expect(resolved).toMatchObject({
                                kind: 'literal',
                                literalKind: 'number',
                                value: 42,
                        });
                });

                it('resolves boolean literal with kind', () => {
                        const resolved = getExportedType('BooleanLiteral');
                        expect(resolved).toMatchObject({
                                kind: 'literal',
                                literalKind: 'boolean',
                                value: true,
                        });
                });
        });

        describe('Literal Unions', () => {
                it('normalizes string literal union with sorted members', () => {
                        const resolved = getExportedType('Status') as ResolvedLiteralUnion;
                        expect(resolved.kind).toBe('literalUnion');
                        expect(resolved.members).toHaveLength(3);

                        // Members should be ResolvedLiteral objects, not raw values
                        expect(resolved.members.every((m) => m.kind === 'literal')).toBe(true);

                        // Should be sorted
                        const values = resolved.members.map((m) => m.value);
                        expect(values).toEqual(['active', 'inactive', 'pending']);
                });

                it('normalizes number literal union', () => {
                        const resolved = getExportedType('Priority') as ResolvedLiteralUnion;
                        expect(resolved.kind).toBe('literalUnion');
                        expect(resolved.members).toHaveLength(3);

                        const values = resolved.members.map((m) => m.value);
                        expect(values).toEqual([1, 2, 3]);
                });
        });

        describe('Arrays', () => {
                it('resolves simple array', () => {
                        const resolved = getExportedType('StringArray');
                        expect(resolved.kind).toBe('array');
                        if (resolved.kind === 'array') {
                                expect(resolved.element).toEqual({
                                        kind: 'primitive',
                                        primitiveKind: 'string',
                                });
                        }
                });

                it('resolves nested array', () => {
                        const resolved = getExportedType('NestedArray');
                        expect(resolved.kind).toBe('array');
                        if (resolved.kind === 'array') {
                                expect(resolved.element.kind).toBe('array');
                        }
                });
        });

        describe('Tuples', () => {
                it('resolves pair tuple', () => {
                        const resolved = getExportedType('Pair');
                        expect(resolved.kind).toBe('tuple');
                        if (resolved.kind === 'tuple') {
                                expect(resolved.elements).toHaveLength(2);
                                expect(resolved.elements[0]).toEqual({
                                        kind: 'primitive',
                                        primitiveKind: 'string',
                                });
                                expect(resolved.elements[1]).toEqual({
                                        kind: 'primitive',
                                        primitiveKind: 'number',
                                });
                        }
                });
        });

        describe('Objects', () => {
                it('resolves simple object with sorted properties', () => {
                        const resolved = getExportedInterface('SimpleObject') as ResolvedObject;
                        expect(resolved.kind).toBe('object');
                        expect(resolved.properties).toHaveLength(2);

                        // Properties should be sorted by name
                        expect(resolved.properties[0]?.name).toBe('age');
                        expect(resolved.properties[1]?.name).toBe('name');

                        expect(resolved.properties[0]?.type).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'number',
                        });
                        expect(resolved.properties[1]?.type).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'string',
                        });
                });

                it('detects optional properties correctly', () => {
                        const resolved = getExportedInterface('OptionalProps') as ResolvedObject;
                        expect(resolved.kind).toBe('object');

                        const requiredProp = resolved.properties.find((p) => p.name === 'required');
                        expect(requiredProp?.optional).toBe(false);

                        const optionalProp = resolved.properties.find((p) => p.name === 'optional');
                        expect(optionalProp?.optional).toBe(true);
                });

                it('detects readonly properties correctly', () => {
                        const resolved = getExportedInterface('ReadonlyProps') as ResolvedObject;
                        expect(resolved.kind).toBe('object');

                        const idProp = resolved.properties.find((p) => p.name === 'id');
                        expect(idProp?.readonly).toBe(true);

                        const nameProp = resolved.properties.find((p) => p.name === 'name');
                        expect(nameProp?.readonly).toBe(false);
                });

                it('preserves index signatures', () => {
                        const resolved = getExportedInterface('WithStringIndex') as ResolvedObject;
                        expect(resolved.kind).toBe('object');
                        expect(resolved.indexSignature).toBeDefined();
                        expect(resolved.indexSignature?.keyType).toBe('string');
                });
        });

        describe('Records', () => {
                it('resolves Record<string, T> as object with index signature', () => {
                        const resolved = getExportedType('StringRecord') as ResolvedObject;
                        expect(resolved.kind).toBe('object');
                        expect(resolved.properties).toHaveLength(0);
                        expect(resolved.indexSignature).toBeDefined();
                        expect(resolved.indexSignature?.keyType).toBe('string');
                        expect(resolved.indexSignature?.valueType).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'number',
                        });
                });

                it('resolves Record<number, T> as object with index signature', () => {
                        const resolved = getExportedType('NumberRecord') as ResolvedObject;
                        expect(resolved.kind).toBe('object');
                        expect(resolved.indexSignature?.keyType).toBe('number');
                });
        });

        describe('Unions', () => {
                it('resolves simple union with sorted members', () => {
                        const resolved = getExportedType('StringOrNumber');
                        expect(resolved.kind).toBe('union');
                        if (resolved.kind === 'union') {
                                expect(resolved.members).toHaveLength(2);
                                // Should be sorted by kind
                                expect(resolved.members[0]?.kind).toBe('primitive');
                                expect(resolved.members[1]?.kind).toBe('primitive');
                        }
                });

                it('detects discriminants in object unions', () => {
                        const resolved = getExportedType('Shape');
                        expect(resolved.kind).toBe('union');
                        if (resolved.kind === 'union') {
                                expect(resolved.discriminant).toBeDefined();
                                expect(resolved.discriminant?.propertyName).toBe('kind');
                                expect(resolved.discriminant?.values).toHaveLength(3);
                        }
                });
        });

        describe('Intersections', () => {
                it('flattens simple intersection to object', () => {
                        const resolved = getExportedType('PersonWithEmail') as ResolvedObject;
                        expect(resolved.kind).toBe('object');
                        expect(resolved.properties).toHaveLength(3);

                        // Should have properties from both types, sorted
                        const names = resolved.properties.map((p) => p.name);
                        expect(names).toEqual(['age', 'email', 'name']);
                });

                it('flattens multi-way intersection', () => {
                        const resolved = getExportedType('MultiIntersection') as ResolvedObject;
                        expect(resolved.kind).toBe('object');
                        expect(resolved.properties).toHaveLength(3);

                        const names = resolved.properties.map((p) => p.name);
                        expect(names).toEqual(['a', 'b', 'c']);
                });

                it('rejects conflicting intersections', () => {
                        expectError('ConflictingIntersection');
                });
        });

        describe('Recursive Types', () => {
                it('resolves recursive tree with ref', () => {
                        const resolved = getExportedInterface('TreeNode') as ResolvedObject;
                        expect(resolved.kind).toBe('object');

                        const childrenProp = resolved.properties.find((p) => p.name === 'children');
                        expect(childrenProp).toBeDefined();
                        expect(childrenProp?.type.kind).toBe('array');

                        if (childrenProp?.type.kind === 'array') {
                                expect(childrenProp.type.element.kind).toBe('ref');
                        }
                });

                it('resolves recursive linked list', () => {
                        const resolved = getExportedInterface('LinkedList') as ResolvedObject;
                        expect(resolved.kind).toBe('object');

                        const nextProp = resolved.properties.find((p) => p.name === 'next');
                        expect(nextProp).toBeDefined();
                        expect(nextProp?.type.kind).toBe('union');
                });
        });

        describe('Template Literals', () => {
                it('resolves template literal to string primitive', () => {
                        const resolved = getExportedType('Greeting');
                        expect(resolved).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'string',
                        });
                });
        });

        describe('Unsupported Constructs', () => {
                it('rejects function types', () => {
                        expectError('FunctionType');
                });

                it('rejects any type', () => {
                        const resolved = getExportedType('AnyType');
                        expect(resolved.kind).toBe('unsupported');
                        if (resolved.kind === 'unsupported') {
                                expect(resolved.reason).toContain('any');
                        }
                });

                it('rejects unknown type', () => {
                        const resolved = getExportedType('UnknownType');
                        expect(resolved.kind).toBe('unsupported');
                });

                it('rejects never type', () => {
                        const resolved = getExportedType('NeverType');
                        expect(resolved.kind).toBe('unsupported');
                });

                it('rejects void type', () => {
                        const resolved = getExportedType('VoidType');
                        expect(resolved.kind).toBe('unsupported');
                        if (resolved.kind === 'unsupported') {
                                expect(resolved.reason).toContain('void');
                        }
                });
        });
});
