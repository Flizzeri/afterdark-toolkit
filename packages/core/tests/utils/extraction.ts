// packages/core/tests/extraction/helpers.ts

import type { DiagnosticCollector } from '@adtk/shared';

import {
        IRNodeGuard,
        type IRNode,
        type IRPrimitive,
        type IRLiteral,
        type IRArray,
        type IRTuple,
        type IRObject,
        type IRTemplateLiteral,
        type IRUnion,
        type IRIntersection,
        type IRRef,
        type IRUnsupported,
        type IRObjectProperty,
        type ExtractionOptions,
} from '@adtk/core';

import { resolveFixture, findSymbol, resolveSymbolIds, extractFixture } from './helpers.js';

// Re-export guards for use in tests
export { IRNodeGuard };

// Core helper: extract a named symbol from a fixture and return its IR node

export function extractIR(
        fixture: string,
        symbolName: string,
        options: Partial<ExtractionOptions> = {},
): { ir: IRNode; diagnostics: DiagnosticCollector } {
        const ids = resolveSymbolIds(fixture, [symbolName]);
        const symbolId = ids.get(symbolName)!;
        const { program } = resolveFixture(fixture);
        const { result, diagnostics } = extractFixture(program, [symbolId], options);
        const sym = findSymbol(result, symbolName);
        if (Array.isArray(sym)) throw new Error(`Multiple matches for "${symbolName}"`);
        return { ir: sym.ir, diagnostics };
}

// Type-narrowing getters — throw with a helpful message if the kind is wrong

export function asPrimitive(ir: IRNode, ctx?: string): IRPrimitive {
        if (!IRNodeGuard.isPrimitive(ir))
                throw new Error(`Expected primitive, got "${ir.kind}"${ctx ? ` (${ctx})` : ''}`);
        return ir;
}

export function asLiteral(ir: IRNode, ctx?: string): IRLiteral {
        if (!IRNodeGuard.isLiteral(ir))
                throw new Error(`Expected literal, got "${ir.kind}"${ctx ? ` (${ctx})` : ''}`);
        return ir;
}

export function asArray(ir: IRNode, ctx?: string): IRArray {
        if (!IRNodeGuard.isArray(ir))
                throw new Error(`Expected array, got "${ir.kind}"${ctx ? ` (${ctx})` : ''}`);
        return ir;
}

export function asTuple(ir: IRNode, ctx?: string): IRTuple {
        if (!IRNodeGuard.isTuple(ir))
                throw new Error(`Expected tuple, got "${ir.kind}"${ctx ? ` (${ctx})` : ''}`);
        return ir;
}

export function asObject(ir: IRNode, ctx?: string): IRObject {
        if (!IRNodeGuard.isObject(ir))
                throw new Error(`Expected object, got "${ir.kind}"${ctx ? ` (${ctx})` : ''}`);
        return ir;
}

export function asTemplateLiteral(ir: IRNode, ctx?: string): IRTemplateLiteral {
        if (!IRNodeGuard.isTemplateLiteral(ir))
                throw new Error(
                        `Expected templateLiteral, got "${ir.kind}"${ctx ? ` (${ctx})` : ''}`,
                );
        return ir;
}

export function asUnion(ir: IRNode, ctx?: string): IRUnion {
        if (!IRNodeGuard.isUnion(ir))
                throw new Error(`Expected union, got "${ir.kind}"${ctx ? ` (${ctx})` : ''}`);
        return ir;
}

export function asIntersection(ir: IRNode, ctx?: string): IRIntersection {
        if (!IRNodeGuard.isIntersection(ir))
                throw new Error(`Expected intersection, got "${ir.kind}"${ctx ? ` (${ctx})` : ''}`);
        return ir;
}

export function asRef(ir: IRNode, ctx?: string): IRRef {
        if (!IRNodeGuard.isRef(ir))
                throw new Error(`Expected ref, got "${ir.kind}"${ctx ? ` (${ctx})` : ''}`);
        return ir;
}

export function asUnsupported(ir: IRNode, ctx?: string): IRUnsupported {
        if (!IRNodeGuard.isUnsupported(ir))
                throw new Error(`Expected unsupported, got "${ir.kind}"${ctx ? ` (${ctx})` : ''}`);
        return ir;
}

// Property helpers

export function getProp(obj: IRObject, name: string): IRObjectProperty {
        const prop = obj.properties.find((p) => p.name === name);
        if (!prop) {
                const names = obj.properties.map((p) => p.name).join(', ');
                throw new Error(`Property "${name}" not found. Available: ${names}`);
        }
        return prop;
}
