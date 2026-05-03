// packages/core/src/extraction/literal.ts

import { ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRLiteral, LiteralKind, LiteralValue } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
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

        context.diagnostics.addError(
                'ADTK-CORE-0023',
                'Unknown literal type',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `Type '${typeText}' has literal flags but unknown literal kind`,
                                help: 'Literal types should be string, number, boolean, bigint, or null',
                        },
                ],
                {
                        description: `The type '${typeText}' has literal type flags but doesn't match any known literal kind.`,
                        notes: [
                                'This is likely an internal error in the type extraction logic',
                                `Type flags: ${type.flags}`,
                                'Supported literals: string, number, boolean, bigint, null',
                        ],
                },
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

                context.diagnostics.addError(
                        'ADTK-CORE-0025',
                        'String literal type missing value property',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `String literal type '${typeText}' does not have a value property`,
                                },
                        ],
                        {
                                description:
                                        'String literal type has unexpected internal structure.',
                                notes: [
                                        'This is likely a TypeScript compiler version incompatibility',
                                        'Expected ts.StringLiteralType with value property',
                                ],
                        },
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

                context.diagnostics.addError(
                        'ADTK-CORE-0026',
                        'String literal value is not a string',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `String literal type '${typeText}' has non-string value: ${typeof value}`,
                                },
                        ],
                        {
                                description: `Expected string value, got ${typeof value}.`,
                                notes: [
                                        'This is likely a TypeScript compiler version incompatibility',
                                ],
                        },
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

                context.diagnostics.addError(
                        'ADTK-CORE-0027',
                        'Number literal type missing value property',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Number literal type '${typeText}' does not have a value property`,
                                },
                        ],
                        {
                                description:
                                        'Number literal type has unexpected internal structure.',
                                notes: [
                                        'This is likely a TypeScript compiler version incompatibility',
                                        'Expected ts.NumberLiteralType with value property',
                                ],
                        },
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

                context.diagnostics.addError(
                        'ADTK-CORE-0028',
                        'Number literal value is not a number',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Number literal type '${typeText}' has non-number value: ${typeof value}`,
                                },
                        ],
                        {
                                description: `Expected number value, got ${typeof value}.`,
                                notes: [
                                        'This is likely a TypeScript compiler version incompatibility',
                                ],
                        },
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

        context.diagnostics.addError(
                'ADTK-CORE-0024',
                'Cannot determine boolean literal value',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `Boolean literal type '${typeString}' has unexpected string representation`,
                                help: 'Expected "true" or "false"',
                        },
                ],
                {
                        description: 'Could not determine if boolean literal is true or false.',
                        notes: [
                                `Type string representation: "${typeString}"`,
                                'This is likely a TypeScript compiler version incompatibility',
                                'Please report this issue with your TypeScript version',
                        ],
                },
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

                context.diagnostics.addError(
                        'ADTK-CORE-0029',
                        'BigInt literal type missing value property',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `BigInt literal type '${typeText}' does not have a value property`,
                                },
                        ],
                        {
                                description:
                                        'BigInt literal type has unexpected internal structure.',
                                notes: [
                                        'This is likely a TypeScript compiler version incompatibility',
                                        'Expected ts.BigIntLiteralType with value property',
                                ],
                        },
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

                        context.diagnostics.addError(
                                'ADTK-CORE-0030',
                                'BigInt literal negative flag is not boolean',
                                [
                                        {
                                                span: context.sourceFile.getSpan(node),
                                                message: `BigInt literal negative property is ${typeof negative}, expected boolean`,
                                        },
                                ],
                                {
                                        description: `BigInt literal type '${typeText}' has unexpected internal format.`,
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                        ],
                                },
                        );

                        return err({
                                type: 'invalid-literal',
                                value: typeText,
                                reason: 'BigInt negative flag is not boolean',
                        });
                }

                if (typeof base10Value !== 'string') {
                        const typeText = context.checker.typeToString(type);

                        context.diagnostics.addError(
                                'ADTK-CORE-0031',
                                'BigInt literal base10Value is not string',
                                [
                                        {
                                                span: context.sourceFile.getSpan(node),
                                                message: `BigInt literal base10Value is ${typeof base10Value}, expected string`,
                                        },
                                ],
                                {
                                        description: `BigInt literal type '${typeText}' has unexpected internal format.`,
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                        ],
                                },
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

                        context.diagnostics.addError(
                                'ADTK-CORE-0021',
                                'Invalid BigInt literal',
                                [
                                        {
                                                span: context.sourceFile.getSpan(node),
                                                message: `Cannot parse BigInt literal: ${stringValue}`,
                                                help: 'BigInt literals must be valid integer values',
                                        },
                                ],
                                {
                                        description: `The BigInt literal '${stringValue}' could not be parsed.`,
                                        notes: [
                                                `Error: ${errorMessage}`,
                                                'BigInt literals are created with the "n" suffix: 123n',
                                                'The value must be a valid integer',
                                        ],
                                },
                        );

                        return err({
                                type: 'invalid-literal',
                                value: stringValue,
                                reason: `Failed to parse BigInt: ${errorMessage}`,
                        });
                }
        }

        const typeText = context.checker.typeToString(type);

        context.diagnostics.addError(
                'ADTK-CORE-0022',
                'Unexpected BigInt literal format',
                [
                        {
                                span: context.sourceFile.getSpan(node),
                                message: `BigInt literal has unexpected internal format`,
                                issue: `Expected {negative: boolean, base10Value: string}, got: ${JSON.stringify(value)}`,
                        },
                ],
                {
                        description: `The BigInt literal type '${typeText}' has an unexpected internal representation.`,
                        notes: [
                                'This is likely a TypeScript compiler version incompatibility',
                                'Please report this issue with your TypeScript version',
                        ],
                },
        );

        return err({
                type: 'invalid-literal',
                value,
                reason: 'Unexpected BigInt literal format',
        });
}
