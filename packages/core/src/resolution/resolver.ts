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
                diagnostics.addWarning('ADTK-CORE-1000', 'No queries provided', [], {
                        description: 'extractSymbols() was called with an empty query list.',
                        notes: [
                                'No symbols will be extracted',
                                'If you want to extract all symbols, use: { type: "all" }',
                                'If you want specific symbols, provide query objects',
                        ],
                });

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
                        diagnostics.addError('ADTK-CORE-1001', 'Query execution failed', [], {
                                description: `Failed to execute query: ${queryResult.error}`,
                                notes: [
                                        `Query type: ${query.type}`,
                                        'The query may be malformed or reference non-existent files',
                                        'Extraction will continue with remaining queries',
                                ],
                        });

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
                diagnostics.addWarning('ADTK-CORE-1002', 'No symbols matched queries', [], {
                        description: `Executed ${queries.length} ${queries.length === 1 ? 'query' : 'queries'} but found no matching symbols.`,
                        notes: [
                                'Check that your queries are correctly formed',
                                'Verify that the source files contain the expected types',
                                'For annotation-based queries, ensure annotations are spelled correctly',
                        ],
                });

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
                        diagnostics.addError('ADTK-CORE-1003', 'Symbol has no declarations', [], {
                                description: `Symbol '${tsSymbol.getName()}' (${symbolId}) has no source declarations.`,
                                notes: [
                                        'This can happen with ambient declarations or compiler-generated symbols',
                                        'The symbol exists in the type system but has no user-written source code',
                                        'Extraction will skip this symbol and continue with others',
                                ],
                        });

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
                        diagnostics.addError('ADTK-CORE-1004', 'Invalid source file path', [], {
                                description: `Cannot create FilePath from source file: ${filePathResult.error}`,
                                notes: [
                                        `Symbol: ${tsSymbol.getName()}`,
                                        `File: ${tsSourceFile.fileName}`,
                                        'This is likely an issue with the file path normalization',
                                ],
                        });

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
                        diagnostics.addError(
                                'ADTK-CORE-1005',
                                'Source file not found in program',
                                [],
                                {
                                        description: `Source file ${filePathResult.value} is not part of the loaded program.`,
                                        notes: [
                                                `Symbol: ${tsSymbol.getName()}`,
                                                'The file may have been excluded by tsconfig or skipLibFiles option',
                                                'Check that the file is included in the compilation',
                                        ],
                                },
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
                        diagnostics.addError('ADTK-CORE-1006', 'Symbol extraction failed', [], {
                                description: `Failed to extract IR for symbol '${tsSymbol.getName()}': ${extractionResult.error.type}`,
                                notes: [
                                        `Symbol ID: ${symbolId}`,
                                        `Error type: ${extractionResult.error.type}`,
                                        'Extraction will skip this symbol and continue with others',
                                ],
                        });

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
                diagnostics.addError('ADTK-CORE-1007', 'All symbol extractions failed', [], {
                        description: `Found ${foundSymbols.size} symbols but failed to extract all of them.`,
                        notes: [
                                `Attempted extractions: ${foundSymbols.size}`,
                                `Failed extractions: ${failedExtractions}`,
                                'Check previous diagnostics for specific extraction errors',
                        ],
                });

                return err({
                        type: 'extraction-failed',
                        failedCount: failedExtractions,
                });
        }

        if (failedExtractions > 0) {
                diagnostics.addWarning('ADTK-CORE-1008', 'Some symbols failed to extract', [], {
                        description: `Successfully extracted ${symbols.size} symbols, but ${failedExtractions} failed.`,
                        notes: [
                                `Success rate: ${Math.round((symbols.size / foundSymbols.size) * 100)}%`,
                                'Check previous diagnostics for specific extraction errors',
                                'Failed symbols will be missing from the results',
                        ],
                });
        }

        return ok({
                symbols,
                queryResults,
        });
}
