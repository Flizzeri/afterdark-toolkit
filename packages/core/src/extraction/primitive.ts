// packages/core/src/extraction/primitive.ts

import { ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRPrimitive, PrimitiveKind } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { extractMetadata } from '../metadata';

export function extractPrimitive(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRPrimitive, ExtractionError> {
        if (!isPrimitiveType(type)) {
                return err({
                        type: 'internal-error',
                        message: 'extractPrimitive called on non-primitive type',
                });
        }

        const primitiveKind = getPrimitiveKind(type);
        if (!primitiveKind) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.addError(
                        'ADTK-CORE-0001',
                        'Unknown primitive type',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Cannot determine primitive kind for type '${typeText}'`,
                                        help: 'This type appears to be a primitive but its specific kind could not be determined',
                                },
                        ],
                        {
                                description: `The type '${typeText}' has primitive type flags but doesn't match any known primitive kind.`,
                                notes: [
                                        'This is likely an internal error in the type extraction logic',
                                        'Primitive types should be one of: string, number, boolean, bigint, symbol, null, undefined, void, never, any, unknown',
                                ],
                        },
                );

                return err({
                        type: 'internal-error',
                        message: `Could not determine primitive kind for type: ${typeText}`,
                });
        }

        // Extract metadata (handles both user symbols and intrinsic types)
        const metadata = extractMetadata(
                type,
                node,
                context.sourceFile,
                context,
                'primitive',
                primitiveKind,
        );

        return ok({
                kind: 'primitive',
                primitiveKind,
                metadata,
        });
}

export function isPrimitiveType(type: ts.Type): boolean {
        return !!(
                type.flags &
                (ts.TypeFlags.String |
                        ts.TypeFlags.Number |
                        ts.TypeFlags.Boolean |
                        ts.TypeFlags.BigInt |
                        ts.TypeFlags.ESSymbol |
                        ts.TypeFlags.Undefined |
                        ts.TypeFlags.Void |
                        ts.TypeFlags.Never |
                        ts.TypeFlags.Any |
                        ts.TypeFlags.Unknown)
        );
}

function getPrimitiveKind(type: ts.Type): PrimitiveKind | null {
        if (type.flags & ts.TypeFlags.String) return 'string';
        if (type.flags & ts.TypeFlags.Number) return 'number';
        if (type.flags & ts.TypeFlags.Boolean) return 'boolean';
        if (type.flags & ts.TypeFlags.BigInt) return 'bigint';
        if (type.flags & ts.TypeFlags.ESSymbol) return 'symbol';
        if (type.flags & ts.TypeFlags.Undefined) return 'undefined';
        if (type.flags & ts.TypeFlags.Void) return 'void';
        if (type.flags & ts.TypeFlags.Never) return 'never';
        if (type.flags & ts.TypeFlags.Any) return 'any';
        if (type.flags & ts.TypeFlags.Unknown) return 'unknown';

        return null;
}
