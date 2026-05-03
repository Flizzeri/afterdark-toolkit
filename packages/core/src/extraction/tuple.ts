// packages/core/src/extraction/tuple.ts

import { ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRTuple, IRTupleElement } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
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

                        context.diagnostics.addError(
                                'ADTK-CORE-0203',
                                'Tuple has elements after rest element',
                                [
                                        {
                                                span: context.sourceFile.getSpan(elementNode),
                                                message: `Tuple element appears after rest element`,
                                                issue: 'Rest elements must be the final element in a tuple',
                                                help: 'Move the rest element to the end of the tuple',
                                        },
                                ],
                                {
                                        description: `The tuple type '${typeText}' has non-rest elements following a rest element.`,
                                        notes: [
                                                'Rest elements must be the last element in a tuple',
                                                'Valid: [string, number, ...boolean[]]',
                                                'Invalid: [string, ...boolean[], number]',
                                        ],
                                },
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

                context.diagnostics.addError(
                        'ADTK-CORE-0200',
                        'Tuple type missing element flags',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Tuple type '${typeText}' has no element flags`,
                                        issue: 'Cannot determine which elements are optional or rest elements',
                                },
                        ],
                        {
                                description:
                                        'Tuple type has unexpected internal structure - element flags are missing.',
                                notes: [
                                        'This is likely a TypeScript compiler version incompatibility',
                                        'Element flags indicate which elements are required, optional, or rest',
                                        `Found type: ${typeText}`,
                                ],
                        },
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

                        context.diagnostics.addError(
                                'ADTK-CORE-0201',
                                'Tuple element missing flag',
                                [
                                        {
                                                span: context.sourceFile.getSpan(node),
                                                message: `Tuple element at index ${i} has no element flag`,
                                                issue: 'Cannot determine if element is required, optional, or rest',
                                        },
                                ],
                                {
                                        description: `Element ${i} in tuple type '${typeText}' is missing its element flag.`,
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                                `Total elements: ${typeArgs.length}`,
                                                `Element flags length: ${target.elementFlags.length}`,
                                        ],
                                },
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

                        context.diagnostics.addError(
                                'ADTK-CORE-0202',
                                'Variadic tuple elements are not supported',
                                [
                                        {
                                                span: context.sourceFile.getSpan(node),
                                                message: `Tuple element at index ${i} is variadic`,
                                                issue: 'Variadic tuple elements cannot be represented in the IR',
                                                help: 'Use a rest element instead: [...T[]]',
                                        },
                                ],
                                {
                                        description: `The tuple type '${typeText}' contains a variadic element at position ${i}.`,
                                        notes: [
                                                'Variadic elements are advanced TypeScript features for type-level operations',
                                                'The IR supports rest elements but not variadic elements',
                                                'Example of rest element: [string, ...number[]]',
                                                'Example of variadic (not supported): [...T, ...U]',
                                        ],
                                },
                        );

                        return err({
                                type: 'unsupported-type',
                                reason: 'Variadic tuple element',
                                typeText,
                        });
                }

                if (foundRest && !isRest) {
                        const typeText = context.checker.typeToString(type);

                        context.diagnostics.addError(
                                'ADTK-CORE-0203',
                                'Tuple has elements after rest element',
                                [
                                        {
                                                span: context.sourceFile.getSpan(node),
                                                message: `Tuple element at index ${i} appears after rest element`,
                                                issue: 'Rest elements must be the final element in a tuple',
                                                help: 'Move the rest element to the end of the tuple',
                                        },
                                ],
                                {
                                        description: `The tuple type '${typeText}' has non-rest elements following a rest element.`,
                                        notes: [
                                                'Rest elements must be the last element in a tuple',
                                                'Valid: [string, number, ...boolean[]]',
                                                'Invalid: [string, ...boolean[], number]',
                                                `Rest element found at index ${elements.length}`,
                                                `Non-rest element found at index ${i}`,
                                        ],
                                },
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
