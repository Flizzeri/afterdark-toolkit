// packages/program/src/utils/symbol.ts

import {
        symbolId,
        hashString,
        filePath,
        type SymbolId,
        type DiagnosticCollector,
} from '@adtk/shared';
import type * as ts from 'typescript';

import { ProgramDiagnostics } from '../codes.js';

export function generateSymbolId(symbol: ts.Symbol, diagnostics: DiagnosticCollector): SymbolId {
        const name = symbol.getName();
        const declarations = symbol.getDeclarations();

        if (!declarations || declarations.length === 0) {
                const fallbackKey = `${name}:${symbol.flags}`;
                const hashResult = hashString(fallbackKey);

                if (!hashResult.ok) {
                        diagnostics.add(
                                ProgramDiagnostics.SYMBOL_ID_HASH_FAILED.new(
                                        name,
                                        hashResult.error,
                                ),
                        );
                        return symbolId(''); // Unreachable
                }

                return symbolId(`${name}#<no-declaration>#${hashResult.value.substring(0, 8)}`);
        }

        const declaration = declarations[0];
        const fileName = declaration.getSourceFile().fileName;

        const filePathResult = filePath(fileName);

        if (!filePathResult.ok) {
                diagnostics.add(
                        ProgramDiagnostics.INVALID_SYMBOL_FILE_PATH.new(
                                fileName,
                                filePathResult.error,
                        ),
                );
                return symbolId(''); // Unreachable, but satisfies TypeScript
        }

        // Hash: fileName + name + declaration kind
        const fallbackKey = `${filePathResult.value}:${name}:${declaration.kind}`;
        const hashResult = hashString(fallbackKey);

        if (!hashResult.ok) {
                diagnostics.add(
                        ProgramDiagnostics.SYMBOL_LOCATION_HASH_FAILED.new(name, hashResult.error),
                );
                return symbolId(''); // Unreachable
        }

        return symbolId(`${name}#${filePathResult.value}#${hashResult.value.substring(0, 8)}`);
}
