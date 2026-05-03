// packages/core/src/querying/executor.ts

import { generateSymbolId, type Program } from '@adtk/program';
import { ok, err, type Result, type DiagnosticCollector, type SymbolId } from '@adtk/shared';
import type * as ts from 'typescript';

import { applyFilter } from './filters.js';
import { resolveSource } from './sources.js';
import type { SymbolQuery } from './types.js';
import { getDeclarationSymbol } from './utils.js';

export function executeQuery(
        query: SymbolQuery,
        program: Program,
        diagnostics: DiagnosticCollector,
): Result<Map<SymbolId, ts.Symbol>, string> {
        if (query.type === 'all') {
                return resolveSource({ type: 'all-files' }, program, diagnostics);
        }

        if (query.type === 'by-ids') {
                return resolveByIds(query.ids, program, diagnostics);
        }

        const sourceResult = resolveSource(query.source, program, diagnostics);

        if (!sourceResult.ok) {
                return sourceResult;
        }

        let symbols = sourceResult.value;

        for (const filter of query.filters) {
                symbols = applyFilter(symbols, filter);

                if (symbols.size === 0) {
                        diagnostics.addInfo('ADTK-CORE-2100', 'Filter eliminated all symbols', [], {
                                description: `After applying filter of type "${filter.type}", no symbols remain.`,
                                notes: [
                                        'This may indicate the filter is too restrictive',
                                        'Check that the filter criteria match your expectations',
                                        'Remaining filters will not be applied as there are no symbols left',
                                ],
                        });
                        break;
                }
        }

        return ok(symbols);
}

function resolveByIds(
        ids: readonly SymbolId[],
        program: Program,
        diagnostics: DiagnosticCollector,
): Result<Map<SymbolId, ts.Symbol>, string> {
        const symbols = new Map<SymbolId, ts.Symbol>();
        const checker = program.getTypeChecker();
        const sourceFiles = program.getSourceFiles();

        const allSymbols = new Map<SymbolId, ts.Symbol>();

        for (const sourceFile of sourceFiles) {
                const tsSourceFile = sourceFile.tsSourceFile;

                if (!tsSourceFile) {
                        continue;
                }

                for (const statement of tsSourceFile.statements) {
                        const symbol = getDeclarationSymbol(statement, checker);

                        if (symbol) {
                                const symbolId = generateSymbolId(symbol, diagnostics);
                                allSymbols.set(symbolId, symbol);
                        }
                }
        }

        for (const id of ids) {
                const symbol = allSymbols.get(id);

                if (symbol) {
                        symbols.set(id, symbol);
                } else {
                        diagnostics.addWarning('ADTK-CORE-2101', 'Symbol ID not found', [], {
                                description: `Symbol with ID "${id}" was not found in the program.`,
                                notes: [
                                        'The symbol may have been removed or renamed',
                                        'The symbol ID may be from a different compilation',
                                        'Check that the symbol ID is correct',
                                        'This symbol will be skipped in the results',
                                ],
                        });
                }
        }

        if (symbols.size === 0) {
                return err(`None of the ${ids.length} requested symbol IDs were found`);
        }

        return ok(symbols);
}
