// src/ir/lower.ts

import type { SymbolId, SourceSpan } from '@afterdarktk/shared';

import type {
        IRNode,
        IRMetadata,
        IRPrimitive,
        IRLiteral,
        IRLiteralUnion,
        IRArray,
        IRTuple,
        IRObject,
        IRObjectProperty,
        IRUnion,
        IRRef,
        IRUnsupported,
} from './nodes.js';
import type { ParsedAnnotation } from '../jsdoc/annotations.js';
import type { ResolvedType } from '../types/types.js';

export interface LowerInput {
        readonly symbolId: SymbolId;
        readonly resolvedType: ResolvedType;
        readonly annotations: readonly ParsedAnnotation[];
        readonly span?: SourceSpan;
}

/**
 * Lowers a ResolvedType with validated annotations into an IR node.
 * This is a pure transformation with no TypeScript compiler interaction.
 */
export function lowerToIR(input: LowerInput): IRNode {
        const metadata: IRMetadata = {
                symbolId: input.symbolId,
                annotations: input.annotations,
                ...(input.span && { span: input.span }),
        };

        return lowerType(input.resolvedType, metadata);
}

function lowerType(type: ResolvedType, metadata: IRMetadata): IRNode {
        switch (type.kind) {
                case 'primitive':
                        return lowerPrimitive(type, metadata);

                case 'literal':
                        return lowerLiteral(type, metadata);

                case 'literalUnion':
                        return lowerLiteralUnion(type, metadata);

                case 'array':
                        return lowerArray(type, metadata);

                case 'tuple':
                        return lowerTuple(type, metadata);

                case 'object':
                        return lowerObject(type, metadata);

                case 'union':
                        return lowerUnion(type, metadata);

                case 'ref':
                        return lowerRef(type, metadata);

                case 'unsupported':
                        return lowerUnsupported(type, metadata);
        }
}

function lowerPrimitive(
        type: ResolvedType & { kind: 'primitive' },
        metadata: IRMetadata,
): IRPrimitive {
        return {
                kind: 'primitive',
                primitiveKind: type.primitiveKind,
                metadata,
        };
}

function lowerLiteral(type: ResolvedType & { kind: 'literal' }, metadata: IRMetadata): IRLiteral {
        return {
                kind: 'literal',
                literalKind: type.literalKind,
                value: type.value,
                metadata,
        };
}

function lowerLiteralUnion(
        type: ResolvedType & { kind: 'literalUnion' },
        metadata: IRMetadata,
): IRLiteralUnion {
        const members = type.members.map((member) =>
                lowerLiteral(member, {
                        symbolId: metadata.symbolId,
                        annotations: [],
                }),
        );

        return {
                kind: 'literalUnion',
                members,
                metadata,
        };
}

function lowerArray(type: ResolvedType & { kind: 'array' }, metadata: IRMetadata): IRArray {
        const element = lowerType(type.element, {
                symbolId: metadata.symbolId,
                annotations: [],
        });

        return {
                kind: 'array',
                element,
                metadata,
        };
}

function lowerTuple(type: ResolvedType & { kind: 'tuple' }, metadata: IRMetadata): IRTuple {
        const elements = type.elements.map((elem) =>
                lowerType(elem, {
                        symbolId: metadata.symbolId,
                        annotations: [],
                }),
        );

        return {
                kind: 'tuple',
                elements,
                metadata,
        };
}

function lowerObject(type: ResolvedType & { kind: 'object' }, metadata: IRMetadata): IRObject {
        const properties: IRObjectProperty[] = type.properties.map((prop) => {
                const propType = lowerType(prop.type, {
                        symbolId: metadata.symbolId,
                        annotations: [],
                });

                return {
                        name: prop.name,
                        type: propType,
                        optional: prop.optional,
                        readonly: prop.readonly,
                        ...(prop.span && { span: prop.span }),
                        annotations: [],
                };
        });

        const result: IRObject = {
                kind: 'object',
                properties,
                metadata,
        };

        if (type.indexSignature) {
                const valueType = lowerType(type.indexSignature.valueType, {
                        symbolId: metadata.symbolId,
                        annotations: [],
                });

                return {
                        ...result,
                        indexSignature: {
                                keyType: type.indexSignature.keyType,
                                valueType,
                        },
                };
        }

        return result;
}

function lowerUnion(type: ResolvedType & { kind: 'union' }, metadata: IRMetadata): IRUnion {
        const members = type.members.map((member) =>
                lowerType(member, {
                        symbolId: metadata.symbolId,
                        annotations: [],
                }),
        );

        return {
                kind: 'union',
                members,
                ...(type.discriminant && { discriminant: type.discriminant }),
                metadata,
        };
}

function lowerRef(type: ResolvedType & { kind: 'ref' }, metadata: IRMetadata): IRRef {
        return {
                kind: 'ref',
                target: type.target,
                metadata,
        };
}

function lowerUnsupported(
        type: ResolvedType & { kind: 'unsupported' },
        metadata: IRMetadata,
): IRUnsupported {
        return {
                kind: 'unsupported',
                reason: type.reason,
                ...(type.originalText && { originalText: type.originalText }),
                metadata,
        };
}

Object.freeze(lowerToIR);
