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

                it('resolves boolean literal true with kind', () => {
                        const resolved = getExportedType('BooleanLiteral');
                        expect(resolved).toMatchObject({
                                kind: 'literal',
                                literalKind: 'boolean',
                                value: true,
                        });
                });

                it('resolves boolean literal false with kind', () => {
                        const resolved = getExportedType('FalseLiteral');
                        expect(resolved).toMatchObject({
                                kind: 'literal',
                                literalKind: 'boolean',
                                value: false,
                        });
                });

                it('resolves bigint literal with kind', () => {
                        const resolved = getExportedType('BigIntLiteral');
                        expect(resolved.kind).toBe('literal');
                        if (resolved.kind === 'literal') {
                                expect(resolved.literalKind).toBe('bigint');
                                expect(typeof resolved.value).toBe('bigint');
                                expect(resolved.value).toBe(9007199254740991n);
                        }
                });

                it('resolves negative bigint literal', () => {
                        const resolved = getExportedType('NegativeBigIntLiteral');
                        expect(resolved.kind).toBe('literal');
                        if (resolved.kind === 'literal') {
                                expect(resolved.literalKind).toBe('bigint');
                                expect(typeof resolved.value).toBe('bigint');
                        }
                });
        });

        describe('Enum Literals', () => {
                it('resolves numeric enum member as number literal', () => {
                        const resolved = getExportedType('NumericEnumMember');
                        expect(resolved.kind).toBe('literal');
                        if (resolved.kind === 'literal') {
                                expect(resolved.literalKind).toBe('number');
                                expect(resolved.value).toBe(1);
                        }
                });

                it('resolves string enum member as string literal', () => {
                        const resolved = getExportedType('StringEnumMember');
                        expect(resolved.kind).toBe('literal');
                        if (resolved.kind === 'literal') {
                                expect(resolved.literalKind).toBe('string');
                                expect(resolved.value).toBe('RED');
                        }
                });
        });

        describe('Literal Unions', () => {
                it('normalizes string literal union with sorted members', () => {
                        const resolved = getExportedType('Status') as ResolvedLiteralUnion;
                        expect(resolved.kind).toBe('literalUnion');
                        expect(resolved.members).toHaveLength(3);

                        expect(resolved.members.every((m) => m.kind === 'literal')).toBe(true);

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

                it('normalizes mixed literal union', () => {
                        const resolved = getExportedType('MixedLiterals') as ResolvedLiteralUnion;
                        expect(resolved.kind).toBe('literalUnion');
                        expect(resolved.members.length).toBeGreaterThan(0);
                        expect(resolved.members.every((m) => m.kind === 'literal')).toBe(true);
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

                it('resolves Array<T> syntax', () => {
                        const resolved = getExportedType('NumberArray');
                        expect(resolved.kind).toBe('array');
                        if (resolved.kind === 'array') {
                                expect(resolved.element).toEqual({
                                        kind: 'primitive',
                                        primitiveKind: 'number',
                                });
                        }
                });

                it('resolves nested arrays', () => {
                        const resolved = getExportedType('NestedArray');
                        expect(resolved.kind).toBe('array');
                        if (resolved.kind === 'array') {
                                expect(resolved.element.kind).toBe('array');
                        }
                });
        });

        describe('Tuples', () => {
                it('resolves simple tuple', () => {
                        const resolved = getExportedType('SimpleTuple');
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

                it('resolves mixed tuple', () => {
                        const resolved = getExportedType('MixedTuple');
                        expect(resolved.kind).toBe('tuple');
                        if (resolved.kind === 'tuple') {
                                expect(resolved.elements).toHaveLength(3);
                        }
                });

                it('resolves empty tuple', () => {
                        const resolved = getExportedType('EmptyTuple');
                        expect(resolved.kind).toBe('tuple');
                        if (resolved.kind === 'tuple') {
                                expect(resolved.elements).toHaveLength(0);
                        }
                });
        });

        describe('Objects', () => {
                it('resolves interface with sorted properties', () => {
                        const resolved = getExportedInterface('SimpleObject') as ResolvedObject;
                        expect(resolved.kind).toBe('object');
                        expect(resolved.properties).toHaveLength(2);

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

                it('preserves string index signatures', () => {
                        const resolved = getExportedInterface('WithStringIndex') as ResolvedObject;
                        expect(resolved.kind).toBe('object');
                        expect(resolved.indexSignature).toBeDefined();
                        expect(resolved.indexSignature?.keyType).toBe('string');
                        expect(resolved.indexSignature?.valueType).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'number',
                        });
                });

                it('preserves number index signatures', () => {
                        const resolved = getExportedInterface('WithNumberIndex') as ResolvedObject;
                        expect(resolved.kind).toBe('object');
                        expect(resolved.indexSignature).toBeDefined();
                        expect(resolved.indexSignature?.keyType).toBe('number');
                });

                it('handles mixed properties with index signature', () => {
                        const resolved = getExportedInterface('MixedWithIndex') as ResolvedObject;
                        expect(resolved.kind).toBe('object');
                        expect(resolved.properties.length).toBeGreaterThan(0);
                        expect(resolved.indexSignature).toBeDefined();
                });

                it('resolves nested objects', () => {
                        const resolved = getExportedInterface('NestedObject') as ResolvedObject;
                        expect(resolved.kind).toBe('object');

                        const outerProp = resolved.properties.find((p) => p.name === 'outer');
                        expect(outerProp).toBeDefined();
                        expect(outerProp?.type.kind).toBe('object');

                        if (outerProp?.type.kind === 'object') {
                                const innerProp = outerProp.type.properties.find(
                                        (p) => p.name === 'inner',
                                );
                                expect(innerProp?.type.kind).toBe('object');
                        }
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
                                expect(resolved.members[0]?.kind).toBe('primitive');
                                expect(resolved.members[1]?.kind).toBe('primitive');
                        }
                });

                it('allows nullable string (string | null)', () => {
                        const resolved = getExportedType('NullableString');
                        expect(resolved.kind).toBe('union');
                        if (resolved.kind === 'union') {
                                expect(resolved.members).toHaveLength(2);
                                const hasNull = resolved.members.some(
                                        (m) => m.kind === 'primitive' && m.primitiveKind === 'null',
                                );
                                expect(hasNull).toBe(true);
                        }
                });

                it('allows optional string (string | undefined)', () => {
                        const resolved = getExportedType('OptionalString');
                        expect(resolved.kind).toBe('union');
                        if (resolved.kind === 'union') {
                                const hasUndefined = resolved.members.some(
                                        (m) =>
                                                m.kind === 'primitive' &&
                                                m.primitiveKind === 'undefined',
                                );
                                expect(hasUndefined).toBe(true);
                        }
                });

                it('allows nullable object (object | null)', () => {
                        const resolved = getExportedType('NullableObject');
                        expect(resolved.kind).toBe('union');
                        if (resolved.kind === 'union') {
                                expect(resolved.members).toHaveLength(2);
                                const hasObject = resolved.members.some((m) => m.kind === 'object');
                                const hasNull = resolved.members.some(
                                        (m) => m.kind === 'primitive' && m.primitiveKind === 'null',
                                );
                                expect(hasObject).toBe(true);
                                expect(hasNull).toBe(true);
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

                it('handles complex discriminated union', () => {
                        const resolved = getExportedType('ComplexUnion');
                        expect(resolved.kind).toBe('union');
                        if (resolved.kind === 'union') {
                                expect(resolved.members.length).toBeGreaterThan(0);
                                expect(resolved.discriminant?.propertyName).toBe('type');
                        }
                });

                it('allows union with null alongside objects', () => {
                        const resolved = getExportedType('NullableUnion');
                        expect(resolved.kind).toBe('union');
                        if (resolved.kind === 'union') {
                                const objectMembers = resolved.members.filter(
                                        (m) => m.kind === 'object',
                                );
                                const nullMembers = resolved.members.filter(
                                        (m) => m.kind === 'primitive' && m.primitiveKind === 'null',
                                );
                                expect(objectMembers.length).toBeGreaterThan(0);
                                expect(nullMembers.length).toBe(1);
                        }
                });

                it('rejects heterogeneous unions', () => {
                        expectError('HeterogeneousUnion');
                });
        });

        describe('Intersections', () => {
                it('flattens simple intersection to object', () => {
                        const resolved = getExportedType('PersonWithEmail') as ResolvedObject;
                        expect(resolved.kind).toBe('object');
                        expect(resolved.properties).toHaveLength(3);

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

                it('rejects conflicting index signatures in intersection', () => {
                        expectError('ConflictingIndexSignatures');
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

                it('resolves recursive union type', () => {
                        const resolved = getExportedType('RecursiveUnion');
                        expect(resolved.kind).toBe('union');
                        if (resolved.kind === 'union') {
                                const hasObject = resolved.members.some((m) => m.kind === 'object');
                                const hasNull = resolved.members.some(
                                        (m) => m.kind === 'primitive' && m.primitiveKind === 'null',
                                );
                                expect(hasObject).toBe(true);
                                expect(hasNull).toBe(true);
                        }
                });

                it('handles circular references between interfaces', () => {
                        const resolvedA = getExportedInterface('CircularA') as ResolvedObject;
                        expect(resolvedA.kind).toBe('object');

                        const bProp = resolvedA.properties.find((p) => p.name === 'b');
                        expect(bProp).toBeDefined();

                        const resolvedB = getExportedInterface('CircularB') as ResolvedObject;
                        expect(resolvedB.kind).toBe('object');
                });
        });

        describe('Template Literals', () => {
                it('resolves template literal to literal union', () => {
                        const resolved = getExportedType('Greeting');
                        // Template literals resolve to their constituent literal values
                        expect(resolved.kind).toBe('literalUnion');
                        if (resolved.kind === 'literalUnion') {
                                expect(resolved.members.length).toBeGreaterThan(0);
                        }
                });
        });

        describe('Type Aliases', () => {
                it('resolves simple type alias', () => {
                        const resolved = getExportedType('AliasedString');
                        expect(resolved).toEqual({
                                kind: 'primitive',
                                primitiveKind: 'string',
                        });
                });

                it('resolves chained type aliases', () => {
                        const resolved = getExportedType('DoubleAliased');
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

                it('rejects constructor types', () => {
                        expectError('ConstructorType');
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

                it('rejects callable interfaces', () => {
                        expectError('CallableInterface', true);
                });
        });
});
