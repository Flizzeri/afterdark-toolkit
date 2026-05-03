// packages/core/src/extraction/template.ts

import { ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRTemplateLiteral, TemplateLiteralPart } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { extractMetadata } from '../metadata';

export function extractTemplateLiteral(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRTemplateLiteral, ExtractionError> {
        if (!isTemplateLiteralType(type)) {
                return err({
                        type: 'internal-error',
                        message: 'extractTemplateLiteral called on non-template-literal type',
                });
        }

        const templateType = type as ts.TemplateLiteralType;

        if (!templateType.texts) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.addError(
                        'ADTK-CORE-0500',
                        'Template literal type missing texts array',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Template literal type '${typeText}' has no texts property`,
                                        issue: 'Cannot extract template literal parts without texts array',
                                },
                        ],
                        {
                                description:
                                        'Template literal type has unexpected internal structure - texts array is missing.',
                                notes: [
                                        'This is likely a TypeScript compiler version incompatibility',
                                        'Template literal types should have texts and types arrays',
                                        `Found type: ${typeText}`,
                                        'Expected structure: { texts: string[], types: Type[] }',
                                ],
                        },
                );

                return err({
                        type: 'unsupported-type',
                        reason: 'Template literal without texts',
                        typeText,
                });
        }

        if (!templateType.types) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.addError(
                        'ADTK-CORE-0501',
                        'Template literal type missing types array',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Template literal type '${typeText}' has no types property`,
                                        issue: 'Cannot extract template literal parts without types array',
                                },
                        ],
                        {
                                description:
                                        'Template literal type has unexpected internal structure - types array is missing.',
                                notes: [
                                        'This is likely a TypeScript compiler version incompatibility',
                                        'Template literal types should have texts and types arrays',
                                        `Found type: ${typeText}`,
                                        'Expected structure: { texts: string[], types: Type[] }',
                                ],
                        },
                );

                return err({
                        type: 'unsupported-type',
                        reason: 'Template literal without types',
                        typeText,
                });
        }

        const texts = templateType.texts;
        const types = templateType.types;

        if (texts.length !== types.length + 1) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.addError(
                        'ADTK-CORE-0502',
                        'Template literal has mismatched texts and types counts',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Template literal '${typeText}' has ${texts.length} text parts but ${types.length} type parts`,
                                        issue: 'Text parts should always be one more than type parts',
                                        help: 'Template literals follow pattern: text₀ type₀ text₁ type₁ ... typeₙ textₙ₊₁',
                                },
                        ],
                        {
                                description: `Template literal structure is invalid: ${texts.length} texts, ${types.length} types.`,
                                notes: [
                                        'Template literals alternate between text and type parts',
                                        'They always start and end with text (even if empty string)',
                                        `Example: \`hello \${string} world\` → ["hello ", ""] with [string]`,
                                        `Example: \`\${number}\` → ["", ""] with [number]`,
                                        'This mismatch indicates an internal TypeScript error',
                                ],
                        },
                );

                return err({
                        type: 'unsupported-type',
                        reason: 'Template literal with mismatched parts',
                        typeText,
                });
        }

        const parts: TemplateLiteralPart[] = [];

        for (let i = 0; i < types.length; i++) {
                const textBefore = texts[i];
                const interpolatedType = types[i];

                if (textBefore !== '') {
                        parts.push({
                                kind: 'text',
                                value: textBefore,
                        });
                }

                const typeResult = context.extractType(interpolatedType, node);

                if (!typeResult.ok) {
                        return typeResult;
                }

                parts.push({
                        kind: 'type',
                        type: typeResult.value,
                        span: context.sourceFile.getSpan(node),
                });
        }

        const finalText = texts[texts.length - 1];

        if (finalText !== '') {
                parts.push({
                        kind: 'text',
                        value: finalText,
                });
        }

        if (parts.length === 0) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.addWarning(
                        'ADTK-CORE-0503',
                        'Template literal has no parts',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Template literal type '${typeText}' has no text or type parts`,
                                        issue: 'Empty template literals are equivalent to empty string literal',
                                        help: 'Use the literal type "" instead',
                                },
                        ],
                        {
                                description:
                                        'A template literal with no parts is semantically equivalent to an empty string literal.',
                                notes: [
                                        'This can happen with: type T = ``',
                                        'Consider using: type T = ""',
                                        'The IR will represent this as an empty template literal for accuracy',
                                ],
                        },
                );
        }

        const metadata = extractMetadata(
                type,
                node,
                context.sourceFile,
                context,
                'templateLiteral',
                context.checker.typeToString(type),
        );

        return ok({
                kind: 'templateLiteral',
                parts,
                metadata,
        });
}

export function isTemplateLiteralType(type: ts.Type): boolean {
        return !!(type.flags & ts.TypeFlags.TemplateLiteral);
}
