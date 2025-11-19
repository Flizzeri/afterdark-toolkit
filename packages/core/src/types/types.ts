// src/types/types.ts

import type { SymbolId, SourceSpan } from '@afterdarktk/shared';

export type PrimitiveKind = 'string' | 'number' | 'boolean' | 'bigint' | 'null' | 'undefined';

export interface TypeMetadata {
        readonly originSymbol?: SymbolId;
        readonly span?: SourceSpan;
}

export interface ResolvedPrimitive {
        readonly kind: 'primitive';
        readonly primitiveKind: PrimitiveKind;
        readonly metadata?: TypeMetadata;
}

export type LiteralValue = string | number | boolean | bigint;

export interface ResolvedLiteral {
        readonly kind: 'literal';
        readonly literalKind: 'string' | 'number' | 'boolean' | 'bigint';
        readonly value: LiteralValue;
        readonly metadata?: TypeMetadata;
}

export interface ResolvedLiteralUnion {
        readonly kind: 'literalUnion';
        readonly members: readonly ResolvedLiteral[];
        readonly metadata?: TypeMetadata;
}

export interface ResolvedArray {
        readonly kind: 'array';
        readonly element: ResolvedType;
        readonly metadata?: TypeMetadata;
}

export interface ResolvedTuple {
        readonly kind: 'tuple';
        readonly elements: readonly ResolvedType[];
        readonly metadata?: TypeMetadata;
}

export interface ResolvedObjectProperty {
        readonly name: string;
        readonly type: ResolvedType;
        readonly optional: boolean;
        readonly readonly: boolean;
        readonly span?: SourceSpan;
}

export interface ResolvedObject {
        readonly kind: 'object';
        readonly properties: readonly ResolvedObjectProperty[];
        readonly indexSignature?: {
                readonly keyType: 'string' | 'number';
                readonly valueType: ResolvedType;
        };
        readonly metadata?: TypeMetadata;
}

export interface DiscriminantHint {
        readonly propertyName: string;
        readonly values: readonly LiteralValue[];
}

export interface ResolvedUnion {
        readonly kind: 'union';
        readonly members: readonly ResolvedType[];
        readonly discriminant?: DiscriminantHint;
        readonly metadata?: TypeMetadata;
}

export interface ResolvedRef {
        readonly kind: 'ref';
        readonly target: SymbolId;
        readonly metadata?: TypeMetadata;
}

export interface ResolvedUnsupported {
        readonly kind: 'unsupported';
        readonly reason: string;
        readonly originalText?: string;
        readonly metadata?: TypeMetadata;
}

export type ResolvedType =
        | ResolvedPrimitive
        | ResolvedLiteral
        | ResolvedLiteralUnion
        | ResolvedArray
        | ResolvedTuple
        | ResolvedObject
        | ResolvedUnion
        | ResolvedRef
        | ResolvedUnsupported;
