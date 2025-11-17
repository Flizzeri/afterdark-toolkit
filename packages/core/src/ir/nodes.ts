// src/ir/nodes.ts

import type { ParsedAnnotation } from '../jsdoc/annotations.js';
import type { SymbolId, EntityName } from '../shared/primitives.js';
import type { SourceSpan } from '../types/types.js';

export interface IRMetadata {
        readonly symbolId: SymbolId;
        readonly span?: SourceSpan;
        readonly annotations: readonly ParsedAnnotation[];
}

export type PrimitiveKind = 'string' | 'number' | 'boolean' | 'bigint' | 'null' | 'undefined';

export interface IRPrimitive {
        readonly kind: 'primitive';
        readonly primitiveKind: PrimitiveKind;
        readonly metadata: IRMetadata;
}

export type LiteralValue = string | number | boolean | bigint;

export interface IRLiteral {
        readonly kind: 'literal';
        readonly literalKind: 'string' | 'number' | 'boolean' | 'bigint';
        readonly value: LiteralValue;
        readonly metadata: IRMetadata;
}

export interface IRLiteralUnion {
        readonly kind: 'literalUnion';
        readonly members: readonly IRLiteral[];
        readonly metadata: IRMetadata;
}

export interface IRArray {
        readonly kind: 'array';
        readonly element: IRNode;
        readonly metadata: IRMetadata;
}

export interface IRTuple {
        readonly kind: 'tuple';
        readonly elements: readonly IRNode[];
        readonly metadata: IRMetadata;
}

export interface IRObjectProperty {
        readonly name: string;
        readonly type: IRNode;
        readonly optional: boolean;
        readonly readonly: boolean;
        readonly span?: SourceSpan;
        readonly annotations: readonly ParsedAnnotation[];
}

export interface IRObject {
        readonly kind: 'object';
        readonly properties: readonly IRObjectProperty[];
        readonly indexSignature?: {
                readonly keyType: 'string' | 'number';
                readonly valueType: IRNode;
        };
        readonly metadata: IRMetadata;
}

export interface DiscriminantHint {
        readonly propertyName: string;
        readonly values: readonly LiteralValue[];
}

export interface IRUnion {
        readonly kind: 'union';
        readonly members: readonly IRNode[];
        readonly discriminant?: DiscriminantHint;
        readonly metadata: IRMetadata;
}

export interface IRRef {
        readonly kind: 'ref';
        readonly target: SymbolId;
        readonly metadata: IRMetadata;
}

export interface IRUnsupported {
        readonly kind: 'unsupported';
        readonly reason: string;
        readonly originalText?: string;
        readonly metadata: IRMetadata;
}

export type IRNode =
        | IRPrimitive
        | IRLiteral
        | IRLiteralUnion
        | IRArray
        | IRTuple
        | IRObject
        | IRUnion
        | IRRef
        | IRUnsupported;

export interface IREntity {
        readonly symbolId: SymbolId;
        readonly name: EntityName;
        readonly node: IRNode;
        readonly span?: SourceSpan;
        readonly annotations: readonly ParsedAnnotation[];
}

export interface IRProgram {
        readonly entities: ReadonlyMap<SymbolId, IREntity>;
        readonly nodes: ReadonlyMap<SymbolId, IRNode>;
}
