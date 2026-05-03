// packages/core/src/querying/utils.ts

import * as ts from 'typescript';

export function getDeclarationSymbol(
        statement: ts.Statement,
        checker: ts.TypeChecker,
): ts.Symbol | null {
        if (ts.isTypeAliasDeclaration(statement)) {
                return checker.getSymbolAtLocation(statement.name) ?? null;
        }

        if (ts.isInterfaceDeclaration(statement)) {
                return checker.getSymbolAtLocation(statement.name) ?? null;
        }

        if (ts.isClassDeclaration(statement) && statement.name) {
                return checker.getSymbolAtLocation(statement.name) ?? null;
        }

        if (ts.isEnumDeclaration(statement)) {
                return checker.getSymbolAtLocation(statement.name) ?? null;
        }

        if (ts.isVariableStatement(statement)) {
                const declaration = statement.declarationList.declarations[0];

                if (declaration && ts.isIdentifier(declaration.name)) {
                        return checker.getSymbolAtLocation(declaration.name) ?? null;
                }
        }

        if (
                ts.isModuleDeclaration(statement) &&
                statement.name &&
                ts.isIdentifier(statement.name)
        ) {
                return checker.getSymbolAtLocation(statement.name) ?? null;
        }

        return null;
}
