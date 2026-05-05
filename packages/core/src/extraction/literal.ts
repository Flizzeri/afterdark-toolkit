// packages/core/src/extraction/literal.ts

import { ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRLiteral, LiteralKind, LiteralValue } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { CoreDiagnostics } from '../diagnostics.js';
import { extractMetadata } from '../metadata';
import { safeSerialize } from '../utils';

export function extractLiteral(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRLiteral, ExtractionError> {
        if (!isLiteralType(type)) {
                return err({
                        type: 'internal-error',
                        message: 'extractLiteral called on non-literal type',
                });
        }

        const literalResult = extractLiteralValue(type, node, context);
        if (!literalResult.ok) {
                return literalResult;
        }

        const { value, kind } = literalResult.value;

        // Extract metadata (handles both user symbols and intrinsic literals)
        const metadata = extractMetadata(
                type,
                node,
                context.sourceFile,
                context,
                'literal',
                safeSerialize(value),
        );

        return ok({
                kind: 'literal',
                literalKind: kind,
                value,
                metadata,
        });
}

export function isLiteralType(type: ts.Type): boolean {
        return (
                type.isStringLiteral() ||
                type.isNumberLiteral() ||
                !!(type.flags & ts.TypeFlags.BooleanLiteral) ||
                !!(type.flags & ts.TypeFlags.BigIntLiteral) ||
                !!(type.flags & ts.TypeFlags.Null)
        );
}

function extractLiteralValue(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<{ value: LiteralValue; kind: LiteralKind }, ExtractionError> {
        // String literal
        if (type.flags & ts.TypeFlags.StringLiteral) {
                return extractStringLiteral(type, node, context);
        }

        // Number literal
        if (type.flags & ts.TypeFlags.NumberLiteral) {
                return extractNumberLiteral(type, node, context);
        }

        // Boolean literal
        if (type.flags & ts.TypeFlags.BooleanLiteral) {
                return extractBooleanLiteral(type, node, context);
        }

        // BigInt literal
        if (type.flags & ts.TypeFlags.BigIntLiteral) {
                return extractBigIntLiteral(type, node, context);
        }

        // Null
        if (type.flags & ts.TypeFlags.Null) {
                return ok({ value: null, kind: 'null' });
        }

        // Unknown literal type
        const typeText = context.checker.typeToString(type);

        context.diagnostics.add(
                CoreDiagnostics.LITERAL_UNKNOWN_KIND.new(
                        context.sourceFile.getSpan(node),
                        typeText,
                        type.flags,
                ),
        );

        return err({
                type: 'invalid-literal',
                value: undefined,
                reason: `Unknown literal type with flags: ${type.flags}`,
        });
}

function extractStringLiteral(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<{ value: string; kind: 'string' }, ExtractionError> {
        if (!('value' in type)) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.add(
                        CoreDiagnostics.LITERAL_STRING_NO_VALUE.new(
                                context.sourceFile.getSpan(node),
                                typeText,
                        ),
                );

                return err({
                        type: 'invalid-literal',
                        value: typeText,
                        reason: 'String literal type missing value property',
                });
        }

        const value = type.value;

        if (typeof value !== 'string') {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.add(
                        CoreDiagnostics.LITERAL_STRING_WRONG_TYPE.new(
                                context.sourceFile.getSpan(node),
                                typeText,
                                typeof value,
                        ),
                );

                return err({
                        type: 'invalid-literal',
                        value: typeText,
                        reason: `String literal value is ${typeof value}, not string`,
                });
        }

        return ok({ value, kind: 'string' });
}

function extractNumberLiteral(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<{ value: number; kind: 'number' }, ExtractionError> {
        if (!('value' in type)) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.add(
                        CoreDiagnostics.LITERAL_NUMBER_NO_VALUE.new(
                                context.sourceFile.getSpan(node),
                                typeText,
                        ),
                );

                return err({
                        type: 'invalid-literal',
                        value: typeText,
                        reason: 'Number literal type missing value property',
                });
        }

        const value = type.value;

        if (typeof value !== 'number') {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.add(
                        CoreDiagnostics.LITERAL_NUMBER_WRONG_TYPE.new(
                                context.sourceFile.getSpan(node),
                                typeText,
                                typeof value,
                        ),
                );

                return err({
                        type: 'invalid-literal',
                        value: typeText,
                        reason: `Number literal value is ${typeof value}, not number`,
                });
        }

        return ok({ value, kind: 'number' });
}

function extractBooleanLiteral(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<{ value: boolean; kind: 'boolean' }, ExtractionError> {
        const typeString = context.checker.typeToString(type);

        if (typeString === 'true') {
                return ok({ value: true, kind: 'boolean' });
        }

        if (typeString === 'false') {
                return ok({ value: false, kind: 'boolean' });
        }

        context.diagnostics.add(
                CoreDiagnostics.LITERAL_BOOLEAN_INDETERMINATE.new(
                        context.sourceFile.getSpan(node),
                        typeString,
                ),
        );

        return err({
                type: 'invalid-literal',
                value: typeString,
                reason: `Unexpected boolean literal string: ${typeString}`,
        });
}

function extractBigIntLiteral(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<{ value: bigint; kind: 'bigint' }, ExtractionError> {
        if (!('value' in type)) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.add(
                        CoreDiagnostics.LITERAL_BIGINT_NO_VALUE.new(
                                context.sourceFile.getSpan(node),
                                typeText,
                        ),
                );

                return err({
                        type: 'invalid-literal',
                        value: typeText,
                        reason: 'BigInt literal type missing value property',
                });
        }

        const value = type.value;

        if (
                typeof value === 'object' &&
                value !== null &&
                'negative' in value &&
                'base10Value' in value
        ) {
                const negative = value.negative;
                const base10Value = value.base10Value;

                if (typeof negative !== 'boolean') {
                        const typeText = context.checker.typeToString(type);

                        context.diagnostics.add(
                                CoreDiagnostics.LITERAL_BIGINT_NEGATIVE_NOT_BOOLEAN.new(
                                        context.sourceFile.getSpan(node),
                                        typeText,
                                        typeof negative,
                                ),
                        );

                        return err({
                                type: 'invalid-literal',
                                value: typeText,
                                reason: 'BigInt negative flag is not boolean',
                        });
                }

                if (typeof base10Value !== 'string') {
                        const typeText = context.checker.typeToString(type);

                        context.diagnostics.add(
                                CoreDiagnostics.LITERAL_BIGINT_BASE10_NOT_STRING.new(
                                        context.sourceFile.getSpan(node),
                                        typeText,
                                        typeof base10Value,
                                ),
                        );

                        return err({
                                type: 'invalid-literal',
                                value: typeText,
                                reason: 'BigInt base10Value is not string',
                        });
                }

                const stringValue = (negative ? '-' : '') + base10Value;

                try {
                        const bigintValue = BigInt(stringValue);
                        return ok({ value: bigintValue, kind: 'bigint' });
                } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);

                        context.diagnostics.add(
                                CoreDiagnostics.LITERAL_BIGINT_PARSE_FAILED.new(
                                        context.sourceFile.getSpan(node),
                                        stringValue,
                                        errorMessage,
                                ),
                        );

                        return err({
                                type: 'invalid-literal',
                                value: stringValue,
                                reason: `Failed to parse BigInt: ${errorMessage}`,
                        });
                }
        }

        const typeText = context.checker.typeToString(type);

        context.diagnostics.add(
                CoreDiagnostics.LITERAL_BIGINT_UNEXPECTED_FORMAT.new(
                        context.sourceFile.getSpan(node),
                        typeText,
                        JSON.stringify(value),
                ),
        );

        return err({
                type: 'invalid-literal',
                value,
                reason: 'Unexpected BigInt literal format',
        });
}
