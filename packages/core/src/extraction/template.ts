// packages/core/src/extraction/template.ts

import { ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRTemplateLiteral, TemplateLiteralPart } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { CoreDiagnostics } from '../diagnostics';
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
                const span = context.sourceFile.getSpan(node);

                context.diagnostics.add(CoreDiagnostics.TEMPLATE_MISSING_TEXTS.new(span, typeText));

                return err({
                        type: 'unsupported-type',
                        reason: 'Template literal without texts',
                        typeText,
                });
        }

        if (!templateType.types) {
                const typeText = context.checker.typeToString(type);
                const span = context.sourceFile.getSpan(node);

                context.diagnostics.add(CoreDiagnostics.TEMPLATE_MISSING_TYPES.new(span, typeText));

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
                const span = context.sourceFile.getSpan(node);

                context.diagnostics.add(
                        CoreDiagnostics.TEMPLATE_MISMATCHED_PARTS.new(
                                span,
                                typeText,
                                texts.length,
                                types.length,
                        ),
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
                const span = context.sourceFile.getSpan(node);

                context.diagnostics.add(CoreDiagnostics.TEMPLATE_EMPTY.new(span, typeText));
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
