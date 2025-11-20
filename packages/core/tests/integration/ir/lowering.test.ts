// packages/core/tests/integration/ir/lowering.test.ts

import type { SymbolId, EntityName } from '@afterdarktk/shared';
import { describe, it, expect } from 'vitest';

import { buildEntityIndex } from '../../../src/ir/entity-index.js';
import { lowerToIR } from '../../../src/ir/lower.js';
import type { IRProgram, IREntity } from '../../../src/ir/nodes.js';
import type { ParsedAnnotation } from '../../../src/jsdoc/annotations.js';
import type { ResolvedType } from '../../../src/types/types.js';

describe('IR Lowering Integration', () => {
        it('should lower a complete entity with annotations', () => {
                const symbolId = 'User.Symbol' as SymbolId;
                const annotations: ParsedAnnotation[] = [
                        { tag: 'entity', name: 'users' },
                        { tag: 'version', semver: '1.0.0' },
                ];

                const resolvedType: ResolvedType = {
                        kind: 'object',
                        properties: [
                                {
                                        name: 'id',
                                        type: { kind: 'primitive', primitiveKind: 'string' },
                                        optional: false,
                                        readonly: false,
                                },
                                {
                                        name: 'email',
                                        type: { kind: 'primitive', primitiveKind: 'string' },
                                        optional: false,
                                        readonly: false,
                                },
                                {
                                        name: 'age',
                                        type: { kind: 'primitive', primitiveKind: 'number' },
                                        optional: true,
                                        readonly: false,
                                },
                        ],
                };

                const irNode = lowerToIR({
                        symbolId,
                        resolvedType,
                        annotations,
                });

                expect(irNode.kind).toBe('object');
                expect(irNode.metadata.symbolId).toBe(symbolId);
                expect(irNode.metadata.annotations).toEqual(annotations);

                if (irNode.kind === 'object') {
                        expect(irNode.properties).toHaveLength(3);
                        expect(irNode.properties[0].name).toBe('id');
                        expect(irNode.properties[1].name).toBe('email');
                        expect(irNode.properties[2].name).toBe('age');
                        expect(irNode.properties[2].optional).toBe(true);
                }
        });

        it('should handle discriminated unions with refs', () => {
                const baseSymbolId = 'Shape.Symbol' as SymbolId;
                const circleSymbolId = 'Circle.Symbol' as SymbolId;
                const squareSymbolId = 'Square.Symbol' as SymbolId;

                const resolvedType: ResolvedType = {
                        kind: 'union',
                        members: [
                                { kind: 'ref', target: circleSymbolId },
                                { kind: 'ref', target: squareSymbolId },
                        ],
                        discriminant: {
                                propertyName: 'kind',
                                values: ['circle', 'square'],
                        },
                };

                const irNode = lowerToIR({
                        symbolId: baseSymbolId,
                        resolvedType,
                        annotations: [],
                });

                expect(irNode.kind).toBe('union');
                if (irNode.kind === 'union') {
                        expect(irNode.members).toHaveLength(2);
                        expect(irNode.members[0].kind).toBe('ref');
                        expect(irNode.members[1].kind).toBe('ref');
                        expect(irNode.discriminant).toBeDefined();
                        expect(irNode.discriminant?.propertyName).toBe('kind');
                }
        });

        it('should build a complete IRProgram with entity index', () => {
                const userSymbolId = 'User.Symbol' as SymbolId;
                const postSymbolId = 'Post.Symbol' as SymbolId;

                const userType: ResolvedType = {
                        kind: 'object',
                        properties: [
                                {
                                        name: 'id',
                                        type: { kind: 'primitive', primitiveKind: 'string' },
                                        optional: false,
                                        readonly: false,
                                },
                                {
                                        name: 'name',
                                        type: { kind: 'primitive', primitiveKind: 'string' },
                                        optional: false,
                                        readonly: false,
                                },
                        ],
                };

                const postType: ResolvedType = {
                        kind: 'object',
                        properties: [
                                {
                                        name: 'id',
                                        type: { kind: 'primitive', primitiveKind: 'string' },
                                        optional: false,
                                        readonly: false,
                                },
                                {
                                        name: 'authorId',
                                        type: { kind: 'primitive', primitiveKind: 'string' },
                                        optional: false,
                                        readonly: false,
                                },
                                {
                                        name: 'title',
                                        type: { kind: 'primitive', primitiveKind: 'string' },
                                        optional: false,
                                        readonly: false,
                                },
                        ],
                };

                const userNode = lowerToIR({
                        symbolId: userSymbolId,
                        resolvedType: userType,
                        annotations: [{ tag: 'entity', name: 'users' }],
                });

                const postNode = lowerToIR({
                        symbolId: postSymbolId,
                        resolvedType: postType,
                        annotations: [
                                { tag: 'entity', name: 'posts' },
                                {
                                        tag: 'fk',
                                        target: 'users',
                                        field: 'id',
                                        onDelete: 'cascade',
                                },
                        ],
                });

                const userEntity: IREntity = {
                        symbolId: userSymbolId,
                        name: 'User' as EntityName,
                        node: userNode,
                        annotations: [{ tag: 'entity', name: 'users' }],
                };

                const postEntity: IREntity = {
                        symbolId: postSymbolId,
                        name: 'Post' as EntityName,
                        node: postNode,
                        annotations: [
                                { tag: 'entity', name: 'posts' },
                                {
                                        tag: 'fk',
                                        target: 'users',
                                        field: 'id',
                                        onDelete: 'cascade',
                                },
                        ],
                };

                const program: IRProgram = {
                        entities: new Map([
                                [userSymbolId, userEntity],
                                [postSymbolId, postEntity],
                        ]),
                        nodes: new Map([
                                [userSymbolId, userNode],
                                [postSymbolId, postNode],
                        ]),
                };

                const index = buildEntityIndex(program);

                expect(index.entityByName.size).toBe(2);
                expect(index.entityByName.get('User' as EntityName)).toBe(userEntity);
                expect(index.entityByName.get('Post' as EntityName)).toBe(postEntity);

                const user = index.entityByName.get('User' as EntityName);
                const post = index.entityByName.get('Post' as EntityName);

                expect(user?.node.kind).toBe('object');
                expect(post?.node.kind).toBe('object');

                if (post?.node.kind === 'object') {
                        expect(post.node.properties).toHaveLength(3);
                }
        });

        it('should preserve nested structure through lowering', () => {
                const symbolId = 'Config.Symbol' as SymbolId;

                const resolvedType: ResolvedType = {
                        kind: 'object',
                        properties: [
                                {
                                        name: 'database',
                                        type: {
                                                kind: 'object',
                                                properties: [
                                                        {
                                                                name: 'host',
                                                                type: {
                                                                        kind: 'primitive',
                                                                        primitiveKind: 'string',
                                                                },
                                                                optional: false,
                                                                readonly: false,
                                                        },
                                                        {
                                                                name: 'port',
                                                                type: {
                                                                        kind: 'primitive',
                                                                        primitiveKind: 'number',
                                                                },
                                                                optional: false,
                                                                readonly: false,
                                                        },
                                                ],
                                        },
                                        optional: false,
                                        readonly: false,
                                },
                                {
                                        name: 'features',
                                        type: {
                                                kind: 'array',
                                                element: {
                                                        kind: 'literalUnion',
                                                        members: [
                                                                {
                                                                        kind: 'literal',
                                                                        literalKind: 'string',
                                                                        value: 'cache',
                                                                },
                                                                {
                                                                        kind: 'literal',
                                                                        literalKind: 'string',
                                                                        value: 'analytics',
                                                                },
                                                        ],
                                                },
                                        },
                                        optional: true,
                                        readonly: false,
                                },
                        ],
                };

                const irNode = lowerToIR({
                        symbolId,
                        resolvedType,
                        annotations: [],
                });

                expect(irNode.kind).toBe('object');
                if (irNode.kind === 'object') {
                        expect(irNode.properties).toHaveLength(2);

                        const dbProp = irNode.properties[0];
                        expect(dbProp.type.kind).toBe('object');

                        if (dbProp.type.kind === 'object') {
                                expect(dbProp.type.properties).toHaveLength(2);
                        }

                        const featuresProp = irNode.properties[1];
                        expect(featuresProp.type.kind).toBe('array');

                        if (featuresProp.type.kind === 'array') {
                                expect(featuresProp.type.element.kind).toBe('literalUnion');
                        }
                }
        });

        it('should handle Record types with index signatures', () => {
                const symbolId = 'Config.Symbol' as SymbolId;

                const resolvedType: ResolvedType = {
                        kind: 'object',
                        properties: [],
                        indexSignature: {
                                keyType: 'string',
                                valueType: {
                                        kind: 'union',
                                        members: [
                                                { kind: 'primitive', primitiveKind: 'string' },
                                                { kind: 'primitive', primitiveKind: 'number' },
                                        ],
                                },
                        },
                };

                const irNode = lowerToIR({
                        symbolId,
                        resolvedType,
                        annotations: [],
                });

                expect(irNode.kind).toBe('object');
                if (irNode.kind === 'object') {
                        expect(irNode.properties).toHaveLength(0);
                        expect(irNode.indexSignature).toBeDefined();
                        expect(irNode.indexSignature?.keyType).toBe('string');
                        expect(irNode.indexSignature?.valueType.kind).toBe('union');
                }
        });
});
