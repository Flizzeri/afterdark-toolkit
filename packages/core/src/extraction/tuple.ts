// packages/core/src/extraction/tuple.ts

import { ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRTuple, IRTupleElement } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { CoreDiagnostics } from '../diagnostics';
import { extractMetadata } from '../metadata';

export function extractTuple(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRTuple, ExtractionError> {
        if (!isTupleType(type, context) && !ts.isTupleTypeNode(node)) {
                return err({
                        type: 'internal-error',
                        message: 'extractTuple called on non-tuple type',
                });
        }

        // CRITICAL: Check if we have a tuple type node to extract from.
        // This preserves the structure as written in source and ensures each
        // element's AST node is passed to extractType, enabling layer-1 alias
        // redirect for annotated element types like [Email, PhoneNumber].
        if (ts.isTupleTypeNode(node)) {
                return extractTupleFromAstNode(type, node, context);
        }

        // Fallback: drive from checker type arguments.
        // This handles tuples produced by mapped/conditional types where we
        // don't have a TupleTypeNode, but do have a resolved TupleType.
        return extractTupleFromCheckerType(type, node, context);
}

function extractTupleFromAstNode(
        type: ts.Type,
        node: ts.TupleTypeNode,
        context: ExtractionContext,
): Result<IRTuple, ExtractionError> {
        const elements: IRTupleElement[] = [];
        let restElement: IRTupleElement | undefined;
        let foundRest = false;

        for (const elementNode of node.elements) {
                // Unwrap modifiers to get the actual type node and flags
                const { typeNode, isOptional, isRest } = unwrapTupleElement(elementNode);

                if (isRest && foundRest) {
                        const typeText = context.checker.typeToString(type);
                        const span = context.sourceFile.getSpan(node);

                        context.diagnostics.add(
                                CoreDiagnostics.TUPLE_ELEMENT_AFTER_REST.new(span, typeText),
                        );

                        return err({
                                type: 'unsupported-type',
                                reason: 'Elements after rest element',
                                typeText,
                        });
                }

                const memberType = context.checker.getTypeAtLocation(typeNode);
                const memberResult = context.extractType(memberType, typeNode);

                if (!memberResult.ok) {
                        return memberResult;
                }

                const element: IRTupleElement = {
                        type: memberResult.value,
                        optional: isOptional,
                        span: context.sourceFile.getSpan(elementNode),
                };

                if (isRest) {
                        restElement = element;
                        foundRest = true;
                } else {
                        elements.push(element);
                }
        }

        const metadata = extractMetadata(
                type,
                node,
                context.sourceFile,
                context,
                'tuple',
                context.checker.typeToString(type),
        );

        return ok({
                kind: 'tuple',
                elements,
                ...(restElement && { rest: restElement }),
                metadata,
        });
}

/**
 * Unwraps a tuple element node to get the underlying type node and modifiers.
 *
 * Tuple elements can be wrapped in:
 * - OptionalTypeNode: `string?`
 * - RestTypeNode: `...string[]`
 * - NamedTupleMember: `name: string`, `name?: string`, `...name: string[]`
 */
function unwrapTupleElement(node: ts.TypeNode): {
        typeNode: ts.TypeNode;
        isOptional: boolean;
        isRest: boolean;
} {
        if (ts.isNamedTupleMember(node)) {
                const isRest = !!node.dotDotDotToken;
                const isOptional = !!node.questionToken;
                // For named rest members (...name: T[]), the type is already the array type
                return { typeNode: node.type, isOptional, isRest };
        }

        if (ts.isRestTypeNode(node)) {
                return { typeNode: node.type, isOptional: false, isRest: true };
        }

        if (ts.isOptionalTypeNode(node)) {
                return { typeNode: node.type, isOptional: true, isRest: false };
        }

        return { typeNode: node, isOptional: false, isRest: false };
}

// ---------------------------------------------------------------------------
// Checker-type fallback path (original implementation)
// ---------------------------------------------------------------------------

function extractTupleFromCheckerType(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRTuple, ExtractionError> {
        const typeRef = type as ts.TypeReference;
        const target = typeRef.target as ts.TupleType;
        const typeArgs = context.checker.getTypeArguments(typeRef);

        if (!target.elementFlags) {
                const typeText = context.checker.typeToString(type);
                const span = context.sourceFile.getSpan(node);
                context.diagnostics.add(
                        CoreDiagnostics.TUPLE_MISSING_ELEMENT_FLAGS.new(span, typeText),
                );

                return err({
                        type: 'unsupported-type',
                        reason: 'Tuple without element flags',
                        typeText,
                });
        }

        const elements: IRTupleElement[] = [];
        let restElement: IRTupleElement | undefined;
        let foundRest = false;

        for (let i = 0; i < typeArgs.length; i++) {
                const elementType = typeArgs[i];
                const elementFlag = target.elementFlags[i];

                if (elementFlag === undefined) {
                        const typeText = context.checker.typeToString(type);
                        const span = context.sourceFile.getSpan(node);
                        context.diagnostics.add(
                                CoreDiagnostics.TUPLE_MISSING_ELEMENT_FLAGS.new(span, typeText),
                        );

                        return err({
                                type: 'unsupported-type',
                                reason: 'Tuple element missing flag',
                                typeText,
                        });
                }

                const isRest = !!(elementFlag & ts.ElementFlags.Rest);
                const isOptional = !!(elementFlag & ts.ElementFlags.Optional);
                const isVariadic = !!(elementFlag & ts.ElementFlags.Variadic);

                if (isVariadic) {
                        const typeText = context.checker.typeToString(type);
                        const span = context.sourceFile.getSpan(node);

                        context.diagnostics.add(
                                CoreDiagnostics.TUPLE_VARIADIC_NOT_SUPPORTED.new(span, typeText, i),
                        );

                        return err({
                                type: 'unsupported-type',
                                reason: 'Variadic tuple element',
                                typeText,
                        });
                }

                if (foundRest && !isRest) {
                        const typeText = context.checker.typeToString(type);
                        const span = context.sourceFile.getSpan(node);

                        context.diagnostics.add(
                                CoreDiagnostics.TUPLE_ELEMENT_AFTER_REST.new(span, typeText),
                        );

                        return err({
                                type: 'unsupported-type',
                                reason: 'Elements after rest element',
                                typeText,
                        });
                }

                const elementResult = context.extractType(elementType, node);

                if (!elementResult.ok) {
                        return elementResult;
                }

                const element: IRTupleElement = {
                        type: elementResult.value,
                        optional: isOptional,
                        span: context.sourceFile.getSpan(node),
                };

                if (isRest) {
                        restElement = element;
                        foundRest = true;
                } else {
                        elements.push(element);
                }
        }

        const metadata = extractMetadata(
                type,
                node,
                context.sourceFile,
                context,
                'tuple',
                context.checker.typeToString(type),
        );

        return ok({
                kind: 'tuple',
                elements,
                ...(restElement && { rest: restElement }),
                metadata,
        });
}

export function isTupleType(type: ts.Type, context: ExtractionContext): boolean {
        if (context.checker.isTupleType(type)) {
                return true;
        }

        // TODO check
        if (type.aliasSymbol) {
                const declaration = type.aliasSymbol.declarations?.[0];
                if (declaration && ts.isTypeAliasDeclaration(declaration)) {
                        const aliasedType = context.checker.getTypeFromTypeNode(declaration.type);
                        return context.checker.isTupleType(aliasedType);
                }
        }

        return false;
}
