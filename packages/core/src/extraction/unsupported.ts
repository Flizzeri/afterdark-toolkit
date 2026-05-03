// packages/core/src/extraction/unsupported.ts

import { ok, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRUnsupported } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { extractMetadata } from '../metadata';

// Shared builder constructing the IRUnsupported node

function buildUnsupported(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
        reason: string,
): Result<IRUnsupported, ExtractionError> {
        const originalText = context.checker.typeToString(type);

        const metadata = extractMetadata(
                type,
                node,
                context.sourceFile,
                context,
                'unsupported',
                originalText,
        );

        return ok({ kind: 'unsupported', reason, originalText, metadata });
}

// 1. Type parameter

export function isTypeParameterType(type: ts.Type): boolean {
        return !!(type.flags & ts.TypeFlags.TypeParameter);
}

export function extractTypeParameter(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);

        context.diagnostics.addWarning(
                'ADTK-CORE-1001',
                'Unresolved type parameter',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `Type parameter '${typeText}' is not instantiated`,
                                issue: 'Type parameters cannot be represented in the IR without a concrete argument',
                                help: 'Ensure the type is used with a concrete type argument, or restrict this type to non-generic definitions',
                        },
                ],
                {
                        description: `The type parameter '${typeText}' has no concrete value at extraction time.`,
                        notes: [
                                'Type parameters are only supported when fully instantiated',
                                'Consider using a concrete type instead of a generic parameter',
                        ],
                },
        );

        return buildUnsupported(type, node, context, 'type-parameter');
}

// 2. Conditional type

export function isConditionalType(type: ts.Type): boolean {
        return !!(type.flags & ts.TypeFlags.Conditional);
}

export function extractConditional(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);

        context.diagnostics.addWarning(
                'ADTK-CORE-1002',
                'Conditional type not supported',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `Conditional type '${typeText}' cannot be statically resolved`,
                                issue: 'Conditional types require runtime information to evaluate',
                                help: 'Replace with a concrete union or a specific type',
                        },
                ],
                {
                        description: `The conditional type '${typeText}' cannot be evaluated at extraction time.`,
                        notes: [
                                'Conditional types (T extends U ? X : Y) are not representable in the IR',
                                'Consider pre-resolving the condition into an explicit union type',
                        ],
                },
        );

        return buildUnsupported(type, node, context, 'conditional');
}

// 3. Index type
export function isIndexType(type: ts.Type): boolean {
        return !!(type.flags & ts.TypeFlags.Index);
}

export function extractIndex(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);

        context.diagnostics.addWarning(
                'ADTK-CORE-1003',
                'keyof type not supported',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `'${typeText}' is a keyof type that cannot be statically resolved`,
                                issue: 'keyof requires a concrete type argument to enumerate its keys',
                                help: 'Provide a concrete type argument or use an explicit string literal union',
                        },
                ],
                {
                        description: `The index type '${typeText}' (keyof) cannot be extracted to IR.`,
                        notes: [
                                'keyof types are only supported when they resolve to a known string literal union',
                                'For example, keyof { id: number; name: string } resolves and is supported',
                        ],
                },
        );

        return buildUnsupported(type, node, context, 'index');
}

// 4. Indexed access type

export function isIndexedAccessType(type: ts.Type): boolean {
        return !!(type.flags & ts.TypeFlags.IndexedAccess);
}

export function extractIndexedAccess(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);

        context.diagnostics.addWarning(
                'ADTK-CORE-1004',
                'Indexed access type not supported',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `'${typeText}' is an indexed access type that cannot be statically resolved`,
                                issue: 'The object or key type contains an unresolved type parameter',
                                help: 'Use a concrete type or resolve the indexed access to a specific type',
                        },
                ],
                {
                        description: `The indexed access type '${typeText}' cannot be extracted to IR.`,
                        notes: [
                                'Indexed access types (T[K]) are only supported when both T and K are concrete',
                                'For example, User["id"] resolves and is supported; T["id"] is not',
                        ],
                },
        );

        return buildUnsupported(type, node, context, 'indexed-access');
}

// 5. Substitution type  (internal TS type used during type inference)

export function isSubstitutionType(type: ts.Type): boolean {
        return !!(type.flags & ts.TypeFlags.Substitution);
}

export function extractSubstitution(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);

        context.diagnostics.addWarning(
                'ADTK-CORE-1005',
                'Substitution type not supported',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `'${typeText}' is an internal substitution type`,
                                issue: 'Substitution types are intermediate representations used during type inference',
                                help: 'This type typically appears inside conditional types; simplify the surrounding type',
                        },
                ],
                {
                        description: `The substitution type '${typeText}' is an internal TypeScript construct.`,
                        notes: [
                                'Substitution types arise from infer clauses and type narrowing inside conditionals',
                                'They are not representable in the IR',
                        ],
                },
        );

        return buildUnsupported(type, node, context, 'substitution');
}

// 6. Callable object

export function isCallableType(type: ts.Type, context: ExtractionContext): boolean {
        return context.checker.getSignaturesOfType(type, ts.SignatureKind.Call).length > 0;
}

export function extractCallable(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);

        context.diagnostics.addWarning(
                'ADTK-CORE-1006',
                'Callable type not supported',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `'${typeText}' is a function type`,
                                issue: 'Function types cannot be represented as data schemas',
                                help: 'Remove the function type or wrap it in an object property if the signature is needed as metadata',
                        },
                ],
                {
                        description: `The callable type '${typeText}' has call signatures and cannot be extracted to IR.`,
                        notes: [
                                'Function types are not representable as IR nodes',
                                'If this is a method on an interface, consider converting to a property with a function type',
                        ],
                },
        );

        return buildUnsupported(type, node, context, 'callable');
}

// 6. Constructable object

export function isConstructableType(type: ts.Type, context: ExtractionContext): boolean {
        return context.checker.getSignaturesOfType(type, ts.SignatureKind.Construct).length > 0;
}

export function extractConstructable(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);

        context.diagnostics.addWarning(
                'ADTK-CORE-1007',
                'Constructor type not supported',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `'${typeText}' is a constructor type`,
                                issue: 'Constructor types cannot be represented as data schemas',
                                help: 'Use the instance type instead of the constructor type',
                        },
                ],
                {
                        description: `The constructor type '${typeText}' has construct signatures and cannot be extracted to IR.`,
                        notes: [
                                'Constructor types (new (...) => T) are not representable as IR nodes',
                                'Extract the instance type T instead',
                        ],
                },
        );

        return buildUnsupported(type, node, context, 'constructable');
}

// 7. Abstract mapped type

export function isAbstractMappedType(type: ts.Type, context: ExtractionContext): boolean {
        if (!(type.flags & ts.TypeFlags.Object)) return false;
        if (!((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Mapped)) return false;
        return (
                context.checker.getPropertiesOfType(type).length === 0 &&
                context.checker.getIndexTypeOfType(type, ts.IndexKind.String) === undefined &&
                context.checker.getIndexTypeOfType(type, ts.IndexKind.Number) === undefined
        );
}

export function extractAbstractMapped(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);

        context.diagnostics.addWarning(
                'ADTK-CORE-1008',
                'Abstract mapped type not supported',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `'${typeText}' is a mapped type with unresolved type parameters`,
                                issue: 'The mapped type cannot be evaluated without a concrete type argument',
                                help: 'Provide a concrete type argument to instantiate the mapped type',
                        },
                ],
                {
                        description: `The mapped type '${typeText}' has no resolvable properties at extraction time.`,
                        notes: [
                                'Mapped types like Partial<T> are only supported when T is a concrete type',
                                'For example, Partial<{ x: number }> is supported; Partial<T> is not',
                        ],
                },
        );

        return buildUnsupported(type, node, context, 'abstract-mapped');
}

// 8. Generic object

export function isGenericObjectType(type: ts.Type, context: ExtractionContext): boolean {
        if (!(type.flags & ts.TypeFlags.Object)) return false;
        const props = context.checker.getPropertiesOfType(type);
        return (
                props.length > 0 &&
                props.some((p) => hasFreeTypeParameter(context.checker.getTypeOfSymbol(p)))
        );
}

export function extractGenericObject(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);
        const props = context.checker.getPropertiesOfType(type);
        const freeProps = props
                .filter((p) => hasFreeTypeParameter(context.checker.getTypeOfSymbol(p)))
                .map((p) => p.name);

        context.diagnostics.addWarning(
                'ADTK-CORE-1009',
                'Generic object type not supported',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `'${typeText}' has properties with unresolved type parameters: ${freeProps.join(', ')}`,
                                issue: 'Object types with free type parameters cannot be fully extracted',
                                help: 'Provide concrete type arguments or restrict this type to non-generic definitions',
                        },
                ],
                {
                        description: `The object type '${typeText}' contains properties whose types are unresolved type parameters.`,
                        notes: [
                                `Properties with free type parameters: ${freeProps.join(', ')}`,
                                'Generic objects are only supported when fully instantiated with concrete types',
                        ],
                },
        );

        return buildUnsupported(type, node, context, 'generic-object');
}

// 9. Unknown fallback

export function extractUnknownType(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);

        context.diagnostics.addWarning(
                'ADTK-CORE-1010',
                'Unknown type encountered',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `The type '${typeText}' could not be classified`,
                                issue: 'No extraction path exists for this type',
                                help: 'Report this as a bug if you believe this type should be supported',
                        },
                ],
                {
                        description: `The type '${typeText}' has an unrecognised structure (flags: ${type.flags}).`,
                        notes: [
                                `TypeScript type flags: ${type.flags}`,
                                'This may indicate a new TypeScript type construct not yet handled by the extractor',
                        ],
                },
        );

        return buildUnsupported(type, node, context, 'unknown');
}

function hasFreeTypeParameter(type: ts.Type): boolean {
        if (type.flags & ts.TypeFlags.TypeParameter) return true;
        if (type.flags & ts.TypeFlags.Union)
                return (type as ts.UnionType).types.some(hasFreeTypeParameter);
        if (type.flags & ts.TypeFlags.Intersection)
                return (type as ts.IntersectionType).types.some(hasFreeTypeParameter);
        return false;
}
