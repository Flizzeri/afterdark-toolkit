// packages/core/src/extraction/symbol.ts

import { type SourceFile } from '@adtk/program';
import { ok, err, type Result, type DiagnosticCollector } from '@adtk/shared';
import * as ts from 'typescript';

import { createExtractionContext } from './context.js';
import { extractType } from './extractor.js';
import type { SymbolExtractionResult, ExtractionError, ExtractionOptions } from './types.js';
import { CoreDiagnostics } from '../diagnostics.js';
import { extractDependencies } from '../utils';

/**
 * This is the main entry point for extracting a complete symbol with:
 * - Fully-expanded IR (IRRef only for circular references)
 * - Syntactic dependencies from AST
 * - Metadata already embedded in the IR node
 *
 */
export function extractSymbol(
        symbol: ts.Symbol,
        checker: ts.TypeChecker,
        sourceFile: SourceFile,
        diagnostics: DiagnosticCollector,
        options: Partial<ExtractionOptions> = {},
): Result<SymbolExtractionResult, ExtractionError> {
        // Get declaration
        const declarations = symbol.getDeclarations();
        if (!declarations || declarations.length === 0) {
                diagnostics.add(
                        CoreDiagnostics.SYMBOL_NO_DECLARATION.new(symbol.getName(), symbol.flags),
                );

                return err({
                        type: 'missing-declaration',
                        symbolName: symbol.getName(),
                });
        }

        const declaration = declarations[0];

        // Extract dependencies from AST
        const dependencies = extractDependencies(declaration, checker, diagnostics);

        // Get type at declaration
        let type: ts.Type;
        let typeNode: ts.Node = declaration;
        if (ts.isTypeAliasDeclaration(declaration)) {
                // For type aliases, we need to get the type from the type node, not the symbol
                type = checker.getTypeAtLocation(declaration.type);
                typeNode = declaration.type;
        } else if (ts.isInterfaceDeclaration(declaration)) {
                // getTypeOfSymbolAtLocation returns 'any' for interface declarations.
                type = checker.getDeclaredTypeOfSymbol(symbol);
        } else if (ts.isClassDeclaration(declaration)) {
                // getTypeOfSymbolAtLocation gives the constructor (static) type.
                type = checker.getDeclaredTypeOfSymbol(symbol);
        } else {
                type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
        }

        const context = createExtractionContext(checker, sourceFile, diagnostics, options, (t, n) =>
                extractType(t, n, context),
        );

        // Extract IR (already contains metadata)
        const irResult = extractType(type, typeNode, context);

        if (!irResult.ok) {
                return irResult;
        }

        // The IR node's metadata contains the symbol ID
        const symbolId = irResult.value.metadata.symbolId;

        return ok({
                symbolId,
                ir: irResult.value,
                dependencies,
        });
}
