// packages/core/src/querying/filters.ts

import type { SymbolId, JsDocTagName } from '@adtk/shared';
import { minimatch } from 'minimatch';
import * as ts from 'typescript';

import type { SymbolFilter, SymbolKind } from './types.js';

export function applyFilter(
        symbols: Map<SymbolId, ts.Symbol>,
        filter: SymbolFilter,
): Map<SymbolId, ts.Symbol> {
        switch (filter.type) {
                case 'exports-only':
                        return filterExportsOnly(symbols);

                case 'has-annotation':
                        return filterHasAnnotation(symbols, filter.tag);

                case 'has-any-annotation':
                        return filterHasAnyAnnotation(symbols, filter.tags);

                case 'exclude-pattern':
                        return filterExcludePattern(symbols, filter.pattern);

                case 'kind':
                        return filterByKind(symbols, filter.kinds);
        }
}

function filterExportsOnly(symbols: Map<SymbolId, ts.Symbol>): Map<SymbolId, ts.Symbol> {
        const filtered = new Map<SymbolId, ts.Symbol>();

        for (const [symbolId, symbol] of symbols) {
                if (isExported(symbol)) {
                        filtered.set(symbolId, symbol);
                }
        }

        return filtered;
}

function filterHasAnnotation(
        symbols: Map<SymbolId, ts.Symbol>,
        tag: JsDocTagName,
): Map<SymbolId, ts.Symbol> {
        const filtered = new Map<SymbolId, ts.Symbol>();

        for (const [symbolId, symbol] of symbols) {
                const jsdocTags = symbol.getJsDocTags();
                const hasTag = jsdocTags.some((t) => t.name === tag);

                if (hasTag) {
                        filtered.set(symbolId, symbol);
                }
        }

        return filtered;
}

function filterHasAnyAnnotation(
        symbols: Map<SymbolId, ts.Symbol>,
        tags: readonly JsDocTagName[],
): Map<SymbolId, ts.Symbol> {
        const tagSet = new Set(tags);
        const filtered = new Map<SymbolId, ts.Symbol>();

        for (const [symbolId, symbol] of symbols) {
                const jsdocTags = symbol.getJsDocTags();
                const hasAnyTag = jsdocTags.some((t) => tagSet.has(t.name as JsDocTagName));

                if (hasAnyTag) {
                        filtered.set(symbolId, symbol);
                }
        }

        return filtered;
}

function filterExcludePattern(
        symbols: Map<SymbolId, ts.Symbol>,
        pattern: string,
): Map<SymbolId, ts.Symbol> {
        const filtered = new Map<SymbolId, ts.Symbol>();

        for (const [symbolId, symbol] of symbols) {
                const declaration = symbol.declarations?.[0];

                if (!declaration) {
                        continue;
                }

                const fileName = declaration.getSourceFile().fileName;

                if (!minimatch(fileName, pattern)) {
                        filtered.set(symbolId, symbol);
                }
        }

        return filtered;
}

function filterByKind(
        symbols: Map<SymbolId, ts.Symbol>,
        kinds: readonly SymbolKind[],
): Map<SymbolId, ts.Symbol> {
        const kindSet = new Set(kinds);
        const filtered = new Map<SymbolId, ts.Symbol>();

        for (const [symbolId, symbol] of symbols) {
                const declaration = symbol.declarations?.[0];

                if (!declaration) {
                        continue;
                }

                const kind = getSymbolKind(declaration);

                if (kind && kindSet.has(kind)) {
                        filtered.set(symbolId, symbol);
                }
        }

        return filtered;
}

function isExported(symbol: ts.Symbol): boolean {
        const declarations = symbol.getDeclarations();

        if (!declarations) {
                return false;
        }

        return declarations.some((declaration) => {
                const nodeToCheck = ts.isVariableDeclaration(declaration)
                        ? declaration.parent.parent // VariableDeclaration → VariableDeclarationList → VariableStatement
                        : declaration;

                if (ts.canHaveModifiers(nodeToCheck)) {
                        const modifiers = ts.getModifiers(nodeToCheck);

                        if (modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
                                return true;
                        }
                }

                const parent = declaration.parent;

                if (ts.isSourceFile(parent)) {
                        return false;
                }

                if (ts.isModuleBlock(parent)) {
                        const grandParent = parent.parent;

                        if (ts.canHaveModifiers(grandParent)) {
                                const modifiers = ts.getModifiers(grandParent);
                                return (
                                        modifiers?.some(
                                                (m) => m.kind === ts.SyntaxKind.ExportKeyword,
                                        ) ?? false
                                );
                        }
                }

                return false;
        });
}

function getSymbolKind(declaration: ts.Declaration): SymbolKind | null {
        if (ts.isTypeAliasDeclaration(declaration)) {
                return 'type-alias';
        }

        if (ts.isInterfaceDeclaration(declaration)) {
                return 'interface';
        }

        if (ts.isClassDeclaration(declaration)) {
                return 'class';
        }

        if (ts.isEnumDeclaration(declaration)) {
                return 'enum';
        }

        if (ts.isVariableDeclaration(declaration)) {
                return 'const';
        }

        return null;
}
