// packages/program/src/utils/symbol.ts

import {
        symbolId,
        hashString,
        filePath,
        type SymbolId,
        type DiagnosticCollector,
} from '@adtk/shared';
import type * as ts from 'typescript';

export function generateSymbolId(symbol: ts.Symbol, diagnostics: DiagnosticCollector): SymbolId {
        const name = symbol.getName();
        const declarations = symbol.getDeclarations();

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

        const filePathResult = filePath(fileName);

        if (!filePathResult.ok) {
                diagnostics.add({
                        code: 'ADTK-FATAL-0002',
                        category: 'fatal',
                        message: {
                                title: 'Invalid file path in symbol declaration',
                                description: `Failed to create file path from "${fileName}": ${filePathResult.error}`,
                        },
                        spans: [],
                });
                return symbolId(''); // Unreachable, but satisfies TypeScript
        }

        // Hash: fileName + name + declaration kind
        const fallbackKey = `${filePathResult.value}:${name}:${declaration.kind}`;
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

        return symbolId(`${name}#${filePathResult.value}#${hashResult.value.substring(0, 8)}`);
}
