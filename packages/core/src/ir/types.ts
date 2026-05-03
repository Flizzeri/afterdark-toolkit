// packages/core/src/ir/types.ts

import type { SourceSpan, SymbolId } from '@adtk/shared';

import type { ParsedAnnotation } from '../annotation';
import type { IRMetadata } from '../metadata';

// PRIMITIVE TYPES

/**
 * TypeScript primitive type kinds.
 */
export type PrimitiveKind =
        | 'string'
        | 'number'
        | 'boolean'
        | 'bigint'
        | 'symbol'
        | 'undefined'
        | 'void'
        | 'never'
        | 'any'
        | 'unknown';

/**
 * A primitive type in the IR.
 *
 * @example
 * ```typescript
 * type Name = string;
 * // → { kind: 'primitive', primitiveKind: 'string', ... }
 * ```
 */
export interface IRPrimitive {
        readonly kind: 'primitive';
        readonly primitiveKind: PrimitiveKind;
        readonly metadata: IRMetadata;
}

// LITERAL TYPES

/**
 * Values that can appear in literal types.
 */
export type LiteralValue = string | number | boolean | bigint | null;

/**
 * Kinds of literal types (parallel to LiteralValue).
 */
export type LiteralKind = 'string' | 'number' | 'boolean' | 'bigint' | 'null';

/**
 * A literal type in the IR.
 *
 * @example
 * ```typescript
 * type Status = "active";
 * // → { kind: 'literal', literalKind: 'string', value: 'active', ... }
 * ```
 */
export interface IRLiteral {
        readonly kind: 'literal';
        readonly literalKind: LiteralKind;
        readonly value: LiteralValue;
        readonly metadata: IRMetadata;
}

// ARRAY & TUPLE TYPES

/**
 * A homogeneous array type.
 *
 * @example
 * ```typescript
 * type Names = string[];
 * // → { kind: 'array', element: IRPrimitive('string'), ... }
 * ```
 */
export interface IRArray {
        readonly kind: 'array';
        readonly element: IRNode;
        readonly metadata: IRMetadata;
}

/**
 * A single element in a tuple type with its source span.
 */
export interface IRTupleElement {
        readonly type: IRNode;
        readonly optional: boolean;
        readonly span: SourceSpan;
}

/**
 * A tuple type with fixed-length elements and optional rest element.
 *
 * @example
 * ```typescript
 * type Point = [number, number];
 * // → { kind: 'tuple', elements: [IRPrimitive('number'), IRPrimitive('number')], ... }
 *
 * type Args = [string, ...boolean[]];
 * // → { kind: 'tuple', elements: [IRPrimitive('string')], rest: IRArray(boolean), ... }
 * ```
 */
export interface IRTuple {
        readonly kind: 'tuple';
        readonly elements: readonly IRTupleElement[];
        readonly rest?: IRTupleElement;
        readonly metadata: IRMetadata;
}

// OBJECT TYPES

/**
 * A single property in an object type.
 */
export interface IRObjectProperty {
        readonly name: string;
        readonly type: IRNode;
        readonly optional: boolean;
        readonly readonly: boolean;
        readonly span: SourceSpan;
        readonly annotations: readonly ParsedAnnotation[];
        readonly documentation?: string;
}

/**
 * An index signature for dynamic object keys.
 *
 * @example
 * ```typescript
 * type Config = { [key: string]: number };
 * // → indexSignature: { keyType: 'string', valueType: IRPrimitive('number'), ... }
 * ```
 */
export interface IRIndexSignature {
        readonly keyType: 'string' | 'number' | 'symbol';
        readonly valueType: IRNode;
        readonly span: SourceSpan;
}

/**
 * An object type with named properties and optional index signature.
 *
 * @example
 * ```typescript
 * interface User {
 *   name: string;
 *   age?: number;
 * }
 * // → { kind: 'object', properties: [...], ... }
 * ```
 */
export interface IRObject {
        readonly kind: 'object';
        readonly properties: readonly IRObjectProperty[];
        readonly indexSignature?: IRIndexSignature;
        readonly metadata: IRMetadata;
}

// TEMPLATE LITERAL TYPES

/**
 * A part of a template literal - either static text or a type interpolation.
 */
export type TemplateLiteralPart =
        | { readonly kind: 'text'; readonly value: string }
        | { readonly kind: 'type'; readonly type: IRNode; readonly span: SourceSpan };

/**
 * A template literal type.
 *
 * @example
 * ```typescript
 * type Path = `/${string}`;
 * // → {
 * //     kind: 'templateLiteral',
 * //     parts: [
 * //       { kind: 'text', value: '/' },
 * //       { kind: 'type', type: IRPrimitive('string'), ... }
 * //     ],
 * //     ...
 * //   }
 * ```
 */
export interface IRTemplateLiteral {
        readonly kind: 'templateLiteral';
        readonly parts: readonly TemplateLiteralPart[];
        readonly metadata: IRMetadata;
}

// UNION & INTERSECTION TYPES

/**
 * A hint for discriminated unions to enable optimized validation.
 *
 * @remarks
 * When all members of a union share a common literal-typed property,
 * this hint allows validators to switch on that property instead of
 * trying each member sequentially.
 */
export interface DiscriminantHint {
        readonly propertyName: string;
        readonly values: readonly LiteralValue[];
        readonly span: SourceSpan;
}

/**
 * A member of a union type with its source span.
 */
export interface IRUnionMember {
        readonly type: IRNode;
        readonly span: SourceSpan;
}

/**
 * A union of multiple types.
 *
 * @example
 * ```typescript
 * type ID = string | number;
 * // → { kind: 'union', members: [IRPrimitive('string'), IRPrimitive('number')], ... }
 *
 * type Result = { status: "ok" } | { status: "error" };
 * // → { kind: 'union', discriminant: { propertyName: 'status', values: ['ok', 'error'] }, ... }
 * ```
 */
export interface IRUnion {
        readonly kind: 'union';
        readonly members: readonly IRUnionMember[];
        readonly discriminant?: DiscriminantHint;
        readonly metadata: IRMetadata;
}

/**
 * A member of an intersection type with its source span.
 */
export interface IRIntersectionMember {
        readonly type: IRNode;
        readonly span: SourceSpan;
}

/**
 * An intersection of multiple types.
 *
 * @example
 * ```typescript
 * type Admin = User & { role: "admin" };
 * // → { kind: 'intersection', members: [IRRef('User'), IRObject({ role: ... })], ... }
 * ```
 */
export interface IRIntersection {
        readonly kind: 'intersection';
        readonly members: readonly IRIntersectionMember[];
        readonly metadata: IRMetadata;
}

// REFERENCE & UNSUPPORTED

/**
 * A reference to another named type (not yet resolved).
 *
 * @remarks
 * IRRef nodes are created during initial extraction and represent type
 * aliases or references to other symbols. These are resolved in a separate
 * phase to produce flattened IR.
 *
 * @example
 * ```typescript
 * type Admin = User;
 * // → { kind: 'ref', target: 'User#types.ts#abc123', ... }
 * ```
 */
export interface IRRef {
        readonly kind: 'ref';
        readonly target: SymbolId;
        readonly metadata: IRMetadata;
}

/**
 * A type that cannot be represented in the IR.
 *
 * @remarks
 * TypeScript has many advanced type features (conditional types, mapped types,
 * template literal manipulations, etc.) that cannot be precisely represented
 * in our IR. These are preserved as IRUnsupported with a reason and the
 * original source text for debugging.
 *
 * @example
 * ```typescript
 * type Complex = T extends U ? V : W;
 * // → { kind: 'unsupported', reason: 'Conditional types not supported', ... }
 * ```
 */
export interface IRUnsupported {
        readonly kind: 'unsupported';
        readonly reason: string;
        readonly originalText: string;
        readonly metadata: IRMetadata;
}

// IR NODE UNION

/**
 * The complete union of all IR node types.
 *
 * @remarks
 * This is the core type that represents any node in the intermediate
 * representation. Pattern matching on the `kind` discriminant allows
 * TypeScript to narrow to specific node types.
 */
export type IRNode =
        | IRPrimitive
        | IRLiteral
        | IRArray
        | IRTuple
        | IRObject
        | IRTemplateLiteral
        | IRUnion
        | IRIntersection
        | IRRef
        | IRUnsupported;
