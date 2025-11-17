// tests/unit/ir/entity-index.test.ts

import { describe, it, expect } from 'vitest';

import { buildEntityIndex } from '../../../src/ir/entity-index.js';
import type { IRProgram, IREntity, IRNode } from '../../../src/ir/nodes.js';
import type { SymbolId, EntityName } from '../../../src/shared/primitives.js';

describe('Entity Index Builder', () => {
        it('should build empty index for empty program', () => {
                const program: IRProgram = {
                        entities: new Map(),
                        nodes: new Map(),
                };

                const index = buildEntityIndex(program);

                expect(index.entityByName.size).toBe(0);
                expect(index.entityBySymbol.size).toBe(0);
                expect(index.symbolsByEntity.size).toBe(0);
        });

        it('should index entities by name', () => {
                const symbolId1 = 'User.Symbol' as SymbolId;
                const symbolId2 = 'Post.Symbol' as SymbolId;

                const userNode: IRNode = {
                        kind: 'object',
                        properties: [],
                        metadata: {
                                symbolId: symbolId1,
                                annotations: [],
                        },
                };

                const postNode: IRNode = {
                        kind: 'object',
                        properties: [],
                        metadata: {
                                symbolId: symbolId2,
                                annotations: [],
                        },
                };

                const userEntity: IREntity = {
                        symbolId: symbolId1,
                        name: 'User' as EntityName,
                        node: userNode,
                        annotations: [{ tag: 'entity' }],
                };

                const postEntity: IREntity = {
                        symbolId: symbolId2,
                        name: 'Post' as EntityName,
                        node: postNode,
                        annotations: [{ tag: 'entity' }],
                };

                const program: IRProgram = {
                        entities: new Map([
                                [symbolId1, userEntity],
                                [symbolId2, postEntity],
                        ]),
                        nodes: new Map([
                                [symbolId1, userNode],
                                [symbolId2, postNode],
                        ]),
                };

                const index = buildEntityIndex(program);

                expect(index.entityByName.size).toBe(2);
                expect(index.entityByName.get('User' as EntityName)).toBe(userEntity);
                expect(index.entityByName.get('Post' as EntityName)).toBe(postEntity);
        });

        it('should index entities by symbol', () => {
                const symbolId = 'User.Symbol' as SymbolId;
                const node: IRNode = {
                        kind: 'object',
                        properties: [],
                        metadata: {
                                symbolId,
                                annotations: [],
                        },
                };

                const entity: IREntity = {
                        symbolId,
                        name: 'User' as EntityName,
                        node,
                        annotations: [{ tag: 'entity' }],
                };

                const program: IRProgram = {
                        entities: new Map([[symbolId, entity]]),
                        nodes: new Map([[symbolId, node]]),
                };

                const index = buildEntityIndex(program);

                expect(index.entityBySymbol.size).toBe(1);
                expect(index.entityBySymbol.get(symbolId)).toBe(entity);
        });

        it('should create symbol-to-entity-name mapping', () => {
                const symbolId = 'User.Symbol' as SymbolId;
                const entityName = 'User' as EntityName;
                const node: IRNode = {
                        kind: 'object',
                        properties: [],
                        metadata: {
                                symbolId,
                                annotations: [],
                        },
                };

                const entity: IREntity = {
                        symbolId,
                        name: entityName,
                        node,
                        annotations: [{ tag: 'entity' }],
                };

                const program: IRProgram = {
                        entities: new Map([[symbolId, entity]]),
                        nodes: new Map([[symbolId, node]]),
                };

                const index = buildEntityIndex(program);

                expect(index.symbolsByEntity.size).toBe(1);
                expect(index.symbolsByEntity.get(entityName)).toBe(symbolId);
        });

        it('should handle multiple entities correctly', () => {
                const entities: Array<[SymbolId, EntityName]> = [
                        ['User.Symbol' as SymbolId, 'User' as EntityName],
                        ['Post.Symbol' as SymbolId, 'Post' as EntityName],
                        ['Comment.Symbol' as SymbolId, 'Comment' as EntityName],
                        ['Tag.Symbol' as SymbolId, 'Tag' as EntityName],
                ];

                const entitiesMap = new Map<SymbolId, IREntity>();
                const nodesMap = new Map<SymbolId, IRNode>();

                for (const [symbolId, name] of entities) {
                        const node: IRNode = {
                                kind: 'object',
                                properties: [],
                                metadata: {
                                        symbolId,
                                        annotations: [],
                                },
                        };

                        const entity: IREntity = {
                                symbolId,
                                name,
                                node,
                                annotations: [{ tag: 'entity' }],
                        };

                        entitiesMap.set(symbolId, entity);
                        nodesMap.set(symbolId, node);
                }

                const program: IRProgram = {
                        entities: entitiesMap,
                        nodes: nodesMap,
                };

                const index = buildEntityIndex(program);

                expect(index.entityByName.size).toBe(4);
                expect(index.entityBySymbol.size).toBe(4);
                expect(index.symbolsByEntity.size).toBe(4);

                for (const [symbolId, name] of entities) {
                        expect(index.entityByName.has(name)).toBe(true);
                        expect(index.entityBySymbol.has(symbolId)).toBe(true);
                        expect(index.symbolsByEntity.get(name)).toBe(symbolId);
                }
        });

        it('should preserve entity references', () => {
                const symbolId = 'User.Symbol' as SymbolId;
                const node: IRNode = {
                        kind: 'object',
                        properties: [],
                        metadata: {
                                symbolId,
                                annotations: [],
                        },
                };

                const entity: IREntity = {
                        symbolId,
                        name: 'User' as EntityName,
                        node,
                        annotations: [{ tag: 'entity' }],
                };

                const program: IRProgram = {
                        entities: new Map([[symbolId, entity]]),
                        nodes: new Map([[symbolId, node]]),
                };

                const index = buildEntityIndex(program);

                expect(index.entityByName.get('User' as EntityName)).toBe(entity);
                expect(index.entityBySymbol.get(symbolId)).toBe(entity);
        });

        it('should be deterministic across multiple builds', () => {
                const symbolId = 'User.Symbol' as SymbolId;
                const node: IRNode = {
                        kind: 'object',
                        properties: [],
                        metadata: {
                                symbolId,
                                annotations: [],
                        },
                };

                const entity: IREntity = {
                        symbolId,
                        name: 'User' as EntityName,
                        node,
                        annotations: [{ tag: 'entity' }],
                };

                const program: IRProgram = {
                        entities: new Map([[symbolId, entity]]),
                        nodes: new Map([[symbolId, node]]),
                };

                const index1 = buildEntityIndex(program);
                const index2 = buildEntityIndex(program);

                expect(index1.entityByName.size).toBe(index2.entityByName.size);
                expect(index1.entityBySymbol.size).toBe(index2.entityBySymbol.size);
                expect(index1.symbolsByEntity.size).toBe(index2.symbolsByEntity.size);

                expect(index1.entityByName.get('User' as EntityName)).toBe(
                        index2.entityByName.get('User' as EntityName),
                );
        });
});
