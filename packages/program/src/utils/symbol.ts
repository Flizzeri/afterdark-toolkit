// packages/program/src/utils/symbol.ts

import {
        symbolId,
        hashString,
        filePath,
        createDiagnostic,
        type SymbolId,
        type DiagnosticCollector,
} from '@adtk/shared';
import type * as ts from 'typescript';

export function generateSymbolId(symbol: ts.Symbol, diagnostics: DiagnosticCollector): SymbolId {
        const name = symbol.getName();
        const declarations = symbol.getDeclarations();

        if (!declarations || declarations.length === 0) {
                const nameHashResult = hashString(name);
                if (!nameHashResult.ok) {
                        diagnostics.add(
                                createDiagnostic(
                                        'ADTK-FATAL-001',
                                        'fatal',
                                        {
                                                title: 'Symbol ID generation failed',
                                                description: `Failed to hash symbol name "${name}": ${nameHashResult.error}`,
                                        },
                                        [],
                                ),
                        );
                        return symbolId(''); // Unreachable, but satisfies TypeScript
                }
                return symbolId(`${name}#unknown#${nameHashResult.value.substring(0, 8)}`);
        }

        const declaration = declarations[0];
        const sourceFile = declaration.getSourceFile();
        const filePathResult = filePath(sourceFile.fileName);

        if (!filePathResult.ok) {
                diagnostics.add(
                        createDiagnostic(
                                'ADTK-FATAL-002',
                                'fatal',
                                {
                                        title: 'Invalid file path in symbol declaration',
                                        description: `Failed to create file path from "${sourceFile.fileName}": ${filePathResult.error}`,
                                },
                                [],
                        ),
                );
                return symbolId(''); // Unreachable, but satisfies TypeScript
        }

        const position = declaration.getStart(sourceFile);
        const locationKey = `${filePathResult.value}:${position}`;
        const posHashResult = hashString(locationKey);

        if (!posHashResult.ok) {
                diagnostics.add(
                        createDiagnostic(
                                'ADTK-FATAL-003',
                                'fatal',
                                {
                                        title: 'Symbol location hashing failed',
                                        description: `Failed to hash location key "${locationKey}": ${posHashResult.error}`,
                                },
                                [],
                        ),
                );
                return symbolId(''); // Unreachable, but satisfies TypeScript
        }

        const posHash = posHashResult.value.substring(0, 8);

        return symbolId(`${name}#${filePathResult.value}#${posHash}`);
}
