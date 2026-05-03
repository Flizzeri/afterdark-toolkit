// packages/core/tests/utils/helpers.ts

import path from 'path';

import { loadProject, type Program } from '@adtk/program';
import { DiagnosticCollector, filePath, type SymbolId } from '@adtk/shared';

import {
        extractSymbols,
        type ExtractionResult,
        type SymbolExtractionResult,
        type ExtractionOptions,
        type SymbolQuery,
} from '@adtk/core';

import { executeQuery } from '../../src/querying/index.js';

function loadFixtureProgram(fixturePath: string): Program {
        const fullPath = path.join(__dirname, '..', fixturePath);
        const fixtureDir = fullPath.endsWith('.ts') ? path.dirname(fullPath) : fullPath;
        const tsconfigPath = path.join(fixtureDir, 'tsconfig.json');

        const tsconfigResult = filePath(tsconfigPath);
        if (!tsconfigResult.ok) {
                throw new Error(`Invalid tsconfig path: ${tsconfigPath}`);
        }

        const diagnostics = new DiagnosticCollector();
        const programResult = loadProject({ tsconfig: tsconfigResult.value }, diagnostics, {
                skipLibFiles: true,
        });

        if (!programResult.ok) {
                throw new Error(
                        `Failed to load fixture program: ${programResult.error.message} (${tsconfigResult.value})`,
                );
        }

        if (diagnostics.hasErrors()) {
                const count = diagnostics.getErrors().length;
                throw new Error(
                        `TypeScript compilation failed for fixture: ${fixturePath} (${count} errors)`,
                );
        }

        return programResult.value;
}

/*
 * Runs the full pipeline — load, query, extract — for a fixture directory.
 * Query defaults to `{ type: 'all' }`. Returns the program alongside results
 * so callers can pass it to extractFixture for follow-up extractions.
 */
export function resolveFixture(
        fixturePath: string,
        query: SymbolQuery = { type: 'all' },
        options: Partial<ExtractionOptions> = {},
): { program: Program; result: ExtractionResult; diagnostics: DiagnosticCollector } {
        const program = loadFixtureProgram(fixturePath);
        const diagnostics = new DiagnosticCollector();

        const extractionResult = extractSymbols(program, [query], diagnostics, options);

        if (!extractionResult.ok) {
                throw new Error(
                        `Extraction failed for fixture: ${fixturePath} — ${extractionResult.error.type}`,
                );
        }

        return { program, result: extractionResult.value, diagnostics };
}

/*
 * Runs only the query layer for a fixture directory.
 * Returns the raw Result so callers can assert on err paths.
 */
export function queryFixture(
        fixturePath: string,
        query: SymbolQuery,
): { queryResult: ReturnType<typeof executeQuery>; diagnostics: DiagnosticCollector } {
        const program = loadFixtureProgram(fixturePath);
        const diagnostics = new DiagnosticCollector();
        const queryResult = executeQuery(query, program, diagnostics);

        return { queryResult, diagnostics };
}

/*
 * Runs extraction only for specific symbol IDs against an already-loaded program.
 * Pair with resolveSymbolIds to get IDs from symbol names.
 */
export function extractFixture(
        program: Program,
        symbolIds: readonly SymbolId[],
        options: Partial<ExtractionOptions> = {},
): { result: ExtractionResult; diagnostics: DiagnosticCollector } {
        const diagnostics = new DiagnosticCollector();

        const extractionResult = extractSymbols(
                program,
                [{ type: 'by-ids', ids: symbolIds }],
                diagnostics,
                options,
        );

        if (!extractionResult.ok) {
                throw new Error(`Extraction failed — ${extractionResult.error.type}`);
        }

        return { result: extractionResult.value, diagnostics };
}

/*
 * Discovers symbol IDs for named symbols in a fixture.
 * Runs an all-files query and returns a map of name → SymbolId.
 * Throws if any requested name is not found.
 */
export function resolveSymbolIds(
        fixturePath: string,
        names: readonly string[],
): Map<string, SymbolId> {
        const { result } = resolveFixture(fixturePath);
        const nameSet = new Set(names);
        const resolved = new Map<string, SymbolId>();

        for (const symbolId of result.symbols.keys()) {
                const name = symbolId.split('#')[0];
                if (nameSet.has(name)) {
                        resolved.set(name, symbolId);
                }
        }

        const missing = names.filter((n) => !resolved.has(n));
        if (missing.length > 0) {
                const available = Array.from(result.symbols.keys())
                        .map((id) => id.split('#')[0])
                        .join(', ');
                throw new Error(
                        `resolveSymbolIds: could not find [${missing.join(', ')}] in fixture "${fixturePath}".\n` +
                                `Available: ${available}`,
                );
        }

        return resolved;
}

/*
 * Finds a single symbol in an ExtractionResult by name or pattern.
 * Throws if not found (name) or if multiple matches exist (pattern, when unique=true).
 */
export function findSymbol(
        result: ExtractionResult,
        nameOrPattern: string | RegExp,
): SymbolExtractionResult | SymbolExtractionResult[] {
        if (typeof nameOrPattern === 'string') {
                for (const [symbolId, symbol] of result.symbols) {
                        if (symbolId.startsWith(`${nameOrPattern}#`)) {
                                return symbol;
                        }
                }

                const available = Array.from(result.symbols.keys())
                        .map((id) => id.split('#')[0])
                        .join(', ');

                throw new Error(`Symbol "${nameOrPattern}" not found.\nAvailable: ${available}`);
        }

        const matches: SymbolExtractionResult[] = [];
        for (const [symbolId, symbol] of result.symbols) {
                if (nameOrPattern.test(symbolId.split('#')[0])) {
                        matches.push(symbol);
                }
        }

        return matches;
}
