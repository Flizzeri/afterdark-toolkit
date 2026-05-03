// packages/core/src/extraction/array.ts

import { ok, err, type Result } from '@adtk/shared';
import type * as ts from 'typescript';

import type { IRArray } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { extractMetadata } from '../metadata';

export function extractArray(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRArray, ExtractionError> {
        if (!isArrayType(type, context)) {
                return err({
                        type: 'internal-error',
                        message: 'extractArray called on non-array type',
                });
        }

        const typeRef = type as ts.TypeReference;
        const typeArgs = context.checker.getTypeArguments(typeRef);

        if (typeArgs.length === 0) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.addError(
                        'ADTK-CORE-0100',
                        'Array type missing element type argument',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Array type '${typeText}' has no type arguments`,
                                        issue: 'Array types must have exactly one type argument specifying the element type',
                                        help: 'Use Array<T> or T[] syntax with a specific element type',
                                },
                        ],
                        {
                                description:
                                        'Arrays must specify their element type. Generic Array without type arguments is not supported.',
                                notes: [
                                        'Valid examples: string[], Array<number>, Array<User>',
                                        'Invalid: Array (without type argument)',
                                        `Found type: ${typeText}`,
                                ],
                        },
                );

                return err({
                        type: 'unsupported-type',
                        reason: 'Array without type argument',
                        typeText,
                });
        }

        if (typeArgs.length > 1) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.addError(
                        'ADTK-CORE-0101',
                        'Array type has multiple type arguments',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Array type '${typeText}' has ${typeArgs.length} type arguments`,
                                        issue: 'Array types must have exactly one type argument',
                                        help: 'Arrays are homogeneous - use a union for multiple element types: Array<string | number>',
                                },
                        ],
                        {
                                description: `Array type has ${typeArgs.length} type arguments, expected exactly 1.`,
                                notes: [
                                        'Arrays hold elements of a single type',
                                        'For multiple types, use a union: Array<T | U>',
                                        'For fixed-length heterogeneous arrays, use tuples: [string, number]',
                                        `Found type: ${typeText}`,
                                ],
                        },
                );

                return err({
                        type: 'unsupported-type',
                        reason: 'Array with multiple type arguments',
                        typeText,
                });
        }

        const elementType = typeArgs[0];
        const elementResult = context.extractType(elementType, node);

        if (!elementResult.ok) {
                return elementResult;
        }

        const metadata = extractMetadata(
                type,
                node,
                context.sourceFile,
                context,
                'array',
                context.checker.typeToString(type),
        );

        return ok({
                kind: 'array',
                element: elementResult.value,
                metadata,
        });
}

export function isArrayType(type: ts.Type, context: ExtractionContext): boolean {
        return context.checker.isArrayType(type);
}
