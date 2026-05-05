// packages/core/src/extraction/array.ts

import { ok, err, type Result } from '@adtk/shared';
import type * as ts from 'typescript';

import type { IRArray } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { CoreDiagnostics } from '../diagnostics';
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
                const span = context.sourceFile.getSpan(node);
                context.diagnostics.add(CoreDiagnostics.ARRAY_NO_TYPE_ARGUMENT.new(span, typeText));

                return err({
                        type: 'unsupported-type',
                        reason: 'Array without type argument',
                        typeText,
                });
        }

        if (typeArgs.length > 1) {
                const typeText = context.checker.typeToString(type);
                const span = context.sourceFile.getSpan(node);
                context.diagnostics.add(
                        CoreDiagnostics.ARRAY_MULTIPLE_TYPE_ARGUMENTS.new(
                                span,
                                typeText,
                                typeArgs.length,
                        ),
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
