// packages/core/src/extraction/unsupported.ts

import { ok, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRUnsupported } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { CoreDiagnostics } from '../diagnostics.js';
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

        context.diagnostics.add(
                CoreDiagnostics.UNSUPPORTED_TYPE_PARAMETER.new(
                        context.sourceFile.getSpan(node),
                        typeText,
                ),
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

        context.diagnostics.add(
                CoreDiagnostics.UNSUPPORTED_CONDITIONAL.new(
                        context.sourceFile.getSpan(node),
                        typeText,
                ),
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

        context.diagnostics.add(
                CoreDiagnostics.UNSUPPORTED_KEYOF.new(context.sourceFile.getSpan(node), typeText),
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

        context.diagnostics.add(
                CoreDiagnostics.UNSUPPORTED_INDEXED_ACCESS.new(
                        context.sourceFile.getSpan(node),
                        typeText,
                ),
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

        context.diagnostics.add(
                CoreDiagnostics.UNSUPPORTED_SUBSTITUTION.new(
                        context.sourceFile.getSpan(node),
                        typeText,
                ),
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

        context.diagnostics.add(
                CoreDiagnostics.UNSUPPORTED_CALLABLE.new(
                        context.sourceFile.getSpan(node),
                        typeText,
                ),
        );

        return buildUnsupported(type, node, context, 'callable');
}

// 7. Constructable object

export function isConstructableType(type: ts.Type, context: ExtractionContext): boolean {
        return context.checker.getSignaturesOfType(type, ts.SignatureKind.Construct).length > 0;
}

export function extractConstructable(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);

        context.diagnostics.add(
                CoreDiagnostics.UNSUPPORTED_CONSTRUCTABLE.new(
                        context.sourceFile.getSpan(node),
                        typeText,
                ),
        );

        return buildUnsupported(type, node, context, 'constructable');
}

// 8. Abstract mapped type

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

        context.diagnostics.add(
                CoreDiagnostics.UNSUPPORTED_ABSTRACT_MAPPED.new(
                        context.sourceFile.getSpan(node),
                        typeText,
                ),
        );

        return buildUnsupported(type, node, context, 'abstract-mapped');
}

// 9. Generic object

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

        context.diagnostics.add(
                CoreDiagnostics.UNSUPPORTED_GENERIC_OBJECT.new(
                        context.sourceFile.getSpan(node),
                        typeText,
                        freeProps,
                ),
        );

        return buildUnsupported(type, node, context, 'generic-object');
}

// 10. Unknown fallback

export function extractUnknownType(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnsupported, ExtractionError> {
        const typeText = context.checker.typeToString(type);

        context.diagnostics.add(
                CoreDiagnostics.UNSUPPORTED_UNKNOWN_TYPE.new(
                        context.sourceFile.getSpan(node),
                        typeText,
                        type.flags,
                ),
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
