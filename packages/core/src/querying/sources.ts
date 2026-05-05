// packages/core/src/querying/sources.ts

import { generateSymbolId, type Program, type SourceFile } from '@adtk/program';
import {
        ok,
        err,
        filePath,
        type Result,
        type DiagnosticCollector,
        type SymbolId,
        type FilePath,
} from '@adtk/shared';
import { minimatch } from 'minimatch';
import * as ts from 'typescript';

import type { SymbolSource } from './types.js';
import { getDeclarationSymbol } from './utils.js';
import { CoreDiagnostics } from '../diagnostics.js';

export function resolveSource(
        source: SymbolSource,
        program: Program,
        diagnostics: DiagnosticCollector,
): Result<Map<SymbolId, ts.Symbol>, string> {
        switch (source.type) {
                case 'all-files':
                        return resolveAllFiles(program, diagnostics);

                case 'files':
                        return resolveFiles(source.paths, program, diagnostics);

                case 'glob':
                        return resolveGlob(source.pattern, program, diagnostics);

                case 'call-sites':
                        return resolveCallSites(source.functionName, program, diagnostics);
        }
}

function getTsSourceFile(sourceFile: SourceFile): ts.SourceFile {
        return sourceFile.tsSourceFile;
}

function resolveAllFiles(
        program: Program,
        diagnostics: DiagnosticCollector,
): Result<Map<SymbolId, ts.Symbol>, string> {
        const symbols = new Map<SymbolId, ts.Symbol>();
        const sourceFiles = program.getSourceFiles();

        for (const sourceFile of sourceFiles) {
                const fileSymbols = extractSymbolsFromSourceFile(sourceFile, program, diagnostics);

                for (const [symbolId, symbol] of fileSymbols) {
                        symbols.set(symbolId, symbol);
                }
        }

        return ok(symbols);
}

function resolveFiles(
        paths: readonly FilePath[],
        program: Program,
        diagnostics: DiagnosticCollector,
): Result<Map<SymbolId, ts.Symbol>, string> {
        const symbols = new Map<SymbolId, ts.Symbol>();

        for (const path of paths) {
                const sourceFile = program.getSourceFile(path);

                if (!sourceFile) {
                        diagnostics.add(CoreDiagnostics.QUERY_FILE_NOT_IN_PROGRAM.new(path));

                        continue;
                }

                const fileSymbols = extractSymbolsFromSourceFile(sourceFile, program, diagnostics);

                for (const [symbolId, symbol] of fileSymbols) {
                        symbols.set(symbolId, symbol);
                }
        }

        if (symbols.size === 0 && paths.length > 0) {
                return err(`No symbols found in ${paths.length} specified files`);
        }

        return ok(symbols);
}

function resolveGlob(
        pattern: string,
        program: Program,
        diagnostics: DiagnosticCollector,
): Result<Map<SymbolId, ts.Symbol>, string> {
        const allFiles = program.getRootFileNames();
        const matchedFiles = allFiles.filter((file) => minimatch(file, pattern));

        if (matchedFiles.length === 0) {
                diagnostics.add(CoreDiagnostics.QUERY_GLOB_NO_MATCH.new(pattern, allFiles.length));

                return err(`Glob pattern "${pattern}" matched no files`);
        }

        const filePathResults = matchedFiles.map((file) => filePath(file));
        const validPaths: FilePath[] = [];

        for (const result of filePathResults) {
                if (result.ok) {
                        validPaths.push(result.value);
                } else {
                        diagnostics.add(
                                CoreDiagnostics.QUERY_GLOB_INVALID_FILE_PATH.new(result.error),
                        );
                }
        }

        return resolveFiles(validPaths, program, diagnostics);
}

function resolveCallSites(
        functionName: string,
        program: Program,
        diagnostics: DiagnosticCollector,
): Result<Map<SymbolId, ts.Symbol>, string> {
        const symbols = new Map<SymbolId, ts.Symbol>();
        const checker = program.getTypeChecker();
        const sourceFiles = program.getSourceFiles();

        for (const sourceFile of sourceFiles) {
                const tsSourceFile = sourceFile.tsSourceFile;
                visitCallSites(tsSourceFile, functionName, checker, symbols, diagnostics);
        }

        if (symbols.size === 0) {
                diagnostics.add(CoreDiagnostics.QUERY_NO_CALL_SITES.new(functionName));

                return err(`No call sites for "${functionName}" found`);
        }

        return ok(symbols);
}

function visitCallSites(
        node: ts.Node,
        functionName: string,
        checker: ts.TypeChecker,
        symbols: Map<SymbolId, ts.Symbol>,
        diagnostics: DiagnosticCollector,
): void {
        if (ts.isCallExpression(node)) {
                if (!node.typeArguments || node.typeArguments.length === 0) {
                        ts.forEachChild(node, (child) =>
                                visitCallSites(child, functionName, checker, symbols, diagnostics),
                        );
                        return;
                }

                const callName = getCallExpressionName(node);

                if (callName === functionName) {
                        for (const typeArg of node.typeArguments) {
                                const type = checker.getTypeAtLocation(typeArg);
                                const symbol = type.getSymbol() ?? type.aliasSymbol;

                                if (symbol) {
                                        const symbolId = generateSymbolId(symbol, diagnostics);
                                        symbols.set(symbolId, symbol);
                                }
                        }
                }
        }

        ts.forEachChild(node, (child) =>
                visitCallSites(child, functionName, checker, symbols, diagnostics),
        );
}

function getCallExpressionName(node: ts.CallExpression): string | null {
        const expr = node.expression;

        if (ts.isIdentifier(expr)) {
                return expr.text;
        }

        if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)) {
                return expr.name.text;
        }

        return null;
}

function extractSymbolsFromSourceFile(
        sourceFile: SourceFile,
        program: Program,
        diagnostics: DiagnosticCollector,
): Map<SymbolId, ts.Symbol> {
        const symbols = new Map<SymbolId, ts.Symbol>();
        const checker = program.getTypeChecker();
        const tsSourceFile = getTsSourceFile(sourceFile);

        if (!tsSourceFile) {
                return symbols;
        }

        for (const statement of tsSourceFile.statements) {
                const symbol = getDeclarationSymbol(statement, checker);

                if (symbol) {
                        const symbolId = generateSymbolId(symbol, diagnostics);
                        symbols.set(symbolId, symbol);
                }
        }

        return symbols;
}
