// packages/core/src/metadata/extractor.ts

import { generateSymbolId, type SourceFile } from '@adtk/program';
import { type DiagnosticCollector } from '@adtk/shared';
import * as ts from 'typescript';

import { parseAnnotations } from '../annotation';
import type { IRNode } from '../ir';
import type { IRMetadata } from './types.js';
import type { ExtractionContext } from '../extraction';
import { createSyntheticSymbolId } from '../utils';

export function extractMetadataWithSymbol(
        symbol: ts.Symbol,
        node: ts.Node,
        sourceFile: SourceFile,
        context: ExtractionContext,
): IRMetadata {
        const symbolId = generateSymbolId(symbol, context.diagnostics);
        const span = sourceFile.getSpan(node);

        const tsSourceFile = getTsSourceFile(node);
        const annotations =
                context.options.extractAnnotations && tsSourceFile
                        ? parseAnnotations(symbol, tsSourceFile, context.diagnostics)
                        : [];

        const documentation = context.options.extractDocumentation
                ? extractDocumentation(symbol)
                : undefined;

        return {
                symbolId,
                span,
                annotations,
                ...(documentation && { documentation }),
        };
}

export function createSyntheticMetadata(
        category: IRNode['kind'],
        value: string,
        node: ts.Node,
        sourceFile: SourceFile,
        diagnostics: DiagnosticCollector,
): IRMetadata {
        const symbolId = createSyntheticSymbolId(category, value, diagnostics);
        const span = sourceFile.getSpan(node);

        return {
                symbolId,
                span,
                annotations: [],
        };
}

export function extractMetadata(
        type: ts.Type,
        node: ts.Node,
        sourceFile: SourceFile,
        context: ExtractionContext,
        category: IRNode['kind'],
        categoryValue: string,
): IRMetadata {
        const symbol = findTypeAliasSymbol(node, type, context);

        if (symbol) {
                return extractMetadataWithSymbol(symbol, node, sourceFile, context);
        }

        return createSyntheticMetadata(
                category,
                categoryValue,
                node,
                sourceFile,
                context.diagnostics,
        );
}

function findTypeAliasSymbol(
        node: ts.Node,
        type: ts.Type,
        context: ExtractionContext,
): ts.Symbol | undefined {
        let currentNode: ts.Node | undefined = node;

        while (currentNode) {
                if (ts.isTypeAliasDeclaration(currentNode)) {
                        return context.checker.getSymbolAtLocation(currentNode.name);
                }
                currentNode = currentNode.parent;
        }

        return type.aliasSymbol ?? type.getSymbol();
}

function extractDocumentation(symbol: ts.Symbol): string | undefined {
        const comments = symbol.getDocumentationComment(undefined);

        if (comments.length === 0) {
                return undefined;
        }

        return comments.map((comment) => comment.text).join('\n');
}

function getTsSourceFile(node: ts.Node): ts.SourceFile | undefined {
        let current: ts.Node | undefined = node;

        while (current) {
                if (ts.isSourceFile(current)) {
                        return current;
                }
                current = current.parent;
        }

        return undefined;
}
