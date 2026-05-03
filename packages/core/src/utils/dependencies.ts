// packages/core/src/utils/dependencies.ts

import { generateSymbolId } from '@adtk/program';
import type { SymbolId, DiagnosticCollector } from '@adtk/shared';
import * as ts from 'typescript';

import { isBuiltInSymbol } from './built-ins.js';

export function extractDependencies(
        declaration: ts.Declaration,
        checker: ts.TypeChecker,
        diagnostics: DiagnosticCollector,
): Map<SymbolId, ts.Declaration> {
        const dependencies = new Map<SymbolId, ts.Declaration>();
        // Tracks which declarations we've already walked to break cycles
        const visitedDeclarations = new Set<ts.Declaration>();

        // Queue of declarations whose direct refs we still need to collect
        const queue: ts.Declaration[] = [declaration];
        visitedDeclarations.add(declaration);

        while (queue.length > 0) {
                const current = queue.shift()!;
                const direct = collectDirectDependencies(current, checker, diagnostics);

                for (const [symbolId, depDeclaration] of direct) {
                        // Only add to the output map if not already present (first discovery wins)
                        if (!dependencies.has(symbolId)) {
                                dependencies.set(symbolId, depDeclaration);
                        }

                        // Enqueue the dep's declaration for transitive walking if not yet visited
                        if (!visitedDeclarations.has(depDeclaration)) {
                                visitedDeclarations.add(depDeclaration);
                                queue.push(depDeclaration);
                        }
                }
        }

        // The root declaration itself is not a dependency
        const rootSymbol = getDeclarationSymbol(declaration, checker);
        if (rootSymbol) {
                dependencies.delete(generateSymbolId(rootSymbol, diagnostics));
        }

        return dependencies;
}

/**
 * Collects the direct (shallow) dependencies referenced in a single declaration's AST.
 * Does not recurse into those dependencies — that's handled by the queue in extractDependencies.
 */
function collectDirectDependencies(
        declaration: ts.Declaration,
        checker: ts.TypeChecker,
        diagnostics: DiagnosticCollector,
): Map<SymbolId, ts.Declaration> {
        const dependencies = new Map<SymbolId, ts.Declaration>();

        function recordSymbol(symbol: ts.Symbol): void {
                if (isBuiltInSymbol(symbol)) return;

                const symbolId = generateSymbolId(symbol, diagnostics);
                const depDeclaration = symbol.declarations?.[0];

                if (depDeclaration) {
                        dependencies.set(symbolId, depDeclaration);
                }
        }

        function visit(node: ts.Node): void {
                if (ts.isExpressionWithTypeArguments(node)) {
                        const symbol = checker.getSymbolAtLocation(node.expression);
                        if (symbol) recordSymbol(symbol);

                        if (node.typeArguments) {
                                for (const typeArg of node.typeArguments) {
                                        visit(typeArg);
                                }
                        }
                        return;
                }

                // Type reference: UserId, BaseEntity, etc.
                if (ts.isTypeReferenceNode(node)) {
                        const symbol = checker.getSymbolAtLocation(node.typeName);
                        if (symbol) recordSymbol(symbol);
                }

                // Type query: typeof SomeValue
                if (ts.isTypeQueryNode(node)) {
                        const symbol = checker.getSymbolAtLocation(node.exprName);
                        if (symbol) recordSymbol(symbol);
                }

                // Indexed access: T[K], User['name']
                if (ts.isIndexedAccessTypeNode(node)) {
                        visit(node.objectType);
                        visit(node.indexType);
                        return;
                }

                // Qualified name: React.FC, Namespace.Type
                if (ts.isQualifiedName(node)) {
                        const symbol = checker.getSymbolAtLocation(node);
                        if (symbol) recordSymbol(symbol);
                }

                // Import type: import('./module').Type
                if (ts.isImportTypeNode(node)) {
                        if (node.qualifier) {
                                const symbol = checker.getSymbolAtLocation(node.qualifier);
                                if (symbol) recordSymbol(symbol);
                        }
                }

                ts.forEachChild(node, visit);
        }

        if (ts.isTypeAliasDeclaration(declaration)) {
                visit(declaration.type);
        } else if (ts.isInterfaceDeclaration(declaration)) {
                if (declaration.heritageClauses) {
                        for (const clause of declaration.heritageClauses) {
                                for (const type of clause.types) {
                                        visit(type);
                                }
                        }
                }
                for (const member of declaration.members) {
                        visit(member);
                }
        } else if (ts.isClassDeclaration(declaration)) {
                if (declaration.heritageClauses) {
                        for (const clause of declaration.heritageClauses) {
                                for (const type of clause.types) {
                                        visit(type);
                                }
                        }
                }
                for (const member of declaration.members) {
                        visit(member);
                }
        }

        return dependencies;
}

function getDeclarationSymbol(
        declaration: ts.Declaration,
        checker: ts.TypeChecker,
): ts.Symbol | undefined {
        if (
                (ts.isTypeAliasDeclaration(declaration) ||
                        ts.isInterfaceDeclaration(declaration) ||
                        ts.isClassDeclaration(declaration)) &&
                declaration.name
        ) {
                return checker.getSymbolAtLocation(declaration.name) ?? undefined;
        }
        return undefined;
}
