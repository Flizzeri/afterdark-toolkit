// packages/core/src/resolution/resolver.ts

import type { Program } from '@adtk/program';
import {
        ok,
        err,
        filePath,
        type Result,
        type SymbolId,
        type DiagnosticCollector,
} from '@adtk/shared';
import type * as ts from 'typescript';

import { extractSymbol, type SymbolExtractionResult } from '../extraction';
import { executeQuery, type SymbolQuery } from '../querying';
import type { ExtractionOptions, ExtractionResult, ExtractionError } from './types.js';
import { CoreDiagnostics } from '../diagnostics';

const DEFAULT_OPTIONS: ExtractionOptions = {
        extractAnnotations: true,
        extractDocumentation: false,
        strictMode: false,
};

/**
 * Extracts IR for symbols matching the provided queries.
 *
 * @remarks
 * This is the main entry point for IR extraction. It executes queries to find
 * symbols, then extracts IR for each found symbol. Symbols found by multiple
 * queries are extracted only once and deduplicated.
 *
 * The extraction process:
 * 1. Execute each query to find matching TypeScript symbols
 * 2. Deduplicate symbols found by multiple queries
 * 3. Extract IR for each unique symbol
 * 4. Return extracted IR and query result mappings
 *
 */
export function extractSymbols(
        program: Program,
        queries: readonly SymbolQuery[],
        diagnostics: DiagnosticCollector,
        options: Partial<ExtractionOptions> = {},
): Result<ExtractionResult, ExtractionError> {
        const opts: ExtractionOptions = { ...DEFAULT_OPTIONS, ...options };

        if (queries.length === 0) {
                diagnostics.add(CoreDiagnostics.RESOLUTION_NO_QUERIES.new());

                return ok({
                        symbols: new Map(),
                        queryResults: new Map(),
                });
        }

        const foundSymbols = new Map<SymbolId, ts.Symbol>();
        const queryResults = new Map<SymbolQuery, Set<SymbolId>>();

        for (const query of queries) {
                const queryResult = executeQuery(query, program, diagnostics);

                if (!queryResult.ok) {
                        diagnostics.add(
                                CoreDiagnostics.RESOLUTION_QUERY_FAILED.new(
                                        query.type,
                                        queryResult.error,
                                ),
                        );

                        if (opts.strictMode) {
                                return err({
                                        type: 'query-execution-failed',
                                        query,
                                        reason: queryResult.error,
                                });
                        }

                        continue;
                }

                const matches = queryResult.value;
                queryResults.set(query, new Set(matches.keys()));

                for (const [symbolId, tsSymbol] of matches) {
                        if (!foundSymbols.has(symbolId)) {
                                foundSymbols.set(symbolId, tsSymbol);
                        }
                }
        }

        if (foundSymbols.size === 0) {
                diagnostics.add(CoreDiagnostics.RESOLUTION_NO_SYMBOLS_MATCHED.new(queries.length));

                return ok({
                        symbols: new Map(),
                        queryResults,
                });
        }

        const symbols = new Map<SymbolId, SymbolExtractionResult>();
        const checker = program.getTypeChecker();
        let failedExtractions = 0;

        for (const [symbolId, tsSymbol] of foundSymbols) {
                const declarations = tsSymbol.getDeclarations();

                if (!declarations || declarations.length === 0) {
                        diagnostics.add(
                                CoreDiagnostics.RESOLUTION_SYMBOL_NO_DECLARATIONS.new(
                                        tsSymbol.getName(),
                                        symbolId,
                                ),
                        );

                        failedExtractions++;

                        if (opts.strictMode) {
                                return err({
                                        type: 'extraction-failed',
                                        failedCount: failedExtractions,
                                });
                        }

                        continue;
                }

                const declaration = declarations[0];
                const tsSourceFile = declaration.getSourceFile();
                const filePathResult = filePath(tsSourceFile.fileName);

                if (!filePathResult.ok) {
                        diagnostics.add(
                                CoreDiagnostics.RESOLUTION_INVALID_FILE_PATH.new(
                                        tsSymbol.getName(),
                                        tsSourceFile.fileName,
                                        filePathResult.error,
                                ),
                        );

                        failedExtractions++;

                        if (opts.strictMode) {
                                return err({
                                        type: 'extraction-failed',
                                        failedCount: failedExtractions,
                                });
                        }

                        continue;
                }

                const sourceFile = program.getSourceFile(filePathResult.value);

                if (!sourceFile) {
                        diagnostics.add(
                                CoreDiagnostics.RESOLUTION_FILE_NOT_IN_PROGRAM.new(
                                        tsSymbol.getName(),
                                        filePathResult.value,
                                ),
                        );

                        failedExtractions++;

                        if (opts.strictMode) {
                                return err({
                                        type: 'extraction-failed',
                                        failedCount: failedExtractions,
                                });
                        }

                        continue;
                }

                const extractionResult = extractSymbol(
                        tsSymbol,
                        checker,
                        sourceFile,
                        diagnostics,
                        opts,
                );

                if (!extractionResult.ok) {
                        diagnostics.add(
                                CoreDiagnostics.RESOLUTION_SYMBOL_EXTRACTION_FAILED.new(
                                        tsSymbol.getName(),
                                        symbolId,
                                        extractionResult.error.type,
                                ),
                        );

                        failedExtractions++;

                        if (opts.strictMode) {
                                return err({
                                        type: 'extraction-failed',
                                        failedCount: failedExtractions,
                                });
                        }

                        continue;
                }

                symbols.set(symbolId, extractionResult.value);
        }

        if (symbols.size === 0 && foundSymbols.size > 0) {
                diagnostics.add(
                        CoreDiagnostics.RESOLUTION_ALL_EXTRACTIONS_FAILED.new(
                                foundSymbols.size,
                                failedExtractions,
                        ),
                );

                return err({
                        type: 'extraction-failed',
                        failedCount: failedExtractions,
                });
        }

        if (failedExtractions > 0) {
                diagnostics.add(
                        CoreDiagnostics.RESOLUTION_SOME_EXTRACTIONS_FAILED.new(
                                foundSymbols.size,
                                symbols.size,
                                failedExtractions,
                        ),
                );
        }

        return ok({
                symbols,
                queryResults,
        });
}
