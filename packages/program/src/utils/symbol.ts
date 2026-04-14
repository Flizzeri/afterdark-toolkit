// packages/program/src/utils/symbol.ts

import { symbolId, hashString, type SymbolId, type DiagnosticCollector } from '@adtk/shared';
import type * as ts from 'typescript';

export function generateSymbolId(symbol: ts.Symbol, diagnostics: DiagnosticCollector): SymbolId {
        const name = symbol.getName();
        const declarations = symbol.getDeclarations();

        // Try to get TypeScript's internal symbol ID (most stable)
        const internalId = getInternalSymbolId(symbol);

        if (internalId !== null) {
                // Use internal ID if available
                if (!declarations || declarations.length === 0) {
                        return symbolId(`${name}#<no-declaration>#${internalId}`);
                }

                const fileName = declarations[0].getSourceFile().fileName;
                return symbolId(`${name}#${fileName}#${internalId}`);
        }

        // Fallback: hash-based stable ID
        if (!declarations || declarations.length === 0) {
                const fallbackKey = `${name}:${symbol.flags}`;
                const hashResult = hashString(fallbackKey);

                if (!hashResult.ok) {
                        diagnostics.add({
                                code: 'ADTK-FATAL-0001',
                                category: 'fatal',
                                message: {
                                        title: 'Failed to generate symbol ID',
                                        description: `Cannot hash symbol metadata for '${name}': ${hashResult.error}`,
                                },
                                spans: [],
                        });
                        return symbolId(''); // Unreachable
                }

                return symbolId(`${name}#<no-declaration>#${hashResult.value.substring(0, 8)}`);
        }

        const declaration = declarations[0];
        const fileName = declaration.getSourceFile().fileName;

        // Hash: fileName + name + declaration kind
        const fallbackKey = `${fileName}:${name}:${declaration.kind}`;
        const hashResult = hashString(fallbackKey);

        if (!hashResult.ok) {
                diagnostics.add({
                        code: 'ADTK-FATAL-0002',
                        category: 'fatal',
                        message: {
                                title: 'Failed to generate symbol ID',
                                description: `Cannot hash symbol location for '${name}': ${hashResult.error}`,
                        },
                        spans: [],
                });
                return symbolId(''); // Unreachable
        }

        return symbolId(`${name}#${fileName}#${hashResult.value.substring(0, 8)}`);
}

function getInternalSymbolId(symbol: ts.Symbol): number | null {
        // Runtime check for internal 'id' property
        if (typeof symbol === 'object' && symbol !== null && 'id' in symbol) {
                const id = symbol['id'];

                if (typeof id === 'number') {
                        return id;
                }
        }

        return null;
}
