// packages/core/src/ir/entity-index.ts

import type { SymbolId, EntityName } from '@afterdarktk/shared';

import type { IRProgram, IREntity } from './nodes.js';

export interface EntityIndex {
        readonly entityByName: ReadonlyMap<EntityName, IREntity>;
        readonly entityBySymbol: ReadonlyMap<SymbolId, IREntity>;
        readonly symbolsByEntity: ReadonlyMap<EntityName, SymbolId>;
}

/**
 * Builds convenience lookup tables for IR consumers.
 * Pure transformation with no validation or mutation.
 */
export function buildEntityIndex(program: IRProgram): EntityIndex {
        const entityByName = new Map<EntityName, IREntity>();
        const entityBySymbol = new Map<SymbolId, IREntity>();
        const symbolsByEntity = new Map<EntityName, SymbolId>();

        for (const [symbolId, entity] of program.entities) {
                entityByName.set(entity.name, entity);
                entityBySymbol.set(symbolId, entity);
                symbolsByEntity.set(entity.name, symbolId);
        }

        return {
                entityByName,
                entityBySymbol,
                symbolsByEntity,
        };
}

Object.freeze(buildEntityIndex);
