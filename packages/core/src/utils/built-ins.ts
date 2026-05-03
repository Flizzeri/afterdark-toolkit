// packages/core/src/utils/built-ins.ts

import type * as ts from 'typescript';

// Determines if a symbol is a built-in TypeScript type.
export function isBuiltInSymbol(symbol: ts.Symbol): boolean {
        const name = symbol.getName();

        const builtIns = new Set([
                'Array',
                'ReadonlyArray',
                'String',
                'Number',
                'Boolean',
                'Object',
                'Function',
                'Symbol',
                'BigInt',
                'Date',
                'RegExp',
                'Error',
                'Map',
                'Set',
                'WeakMap',
                'WeakSet',
                'Promise',
                'Record',
                'Partial',
                'Required',
                'Readonly',
                'Pick',
                'Omit',
                'Exclude',
                'Extract',
                'NonNullable',
                'ReturnType',
                'Parameters',
                'ConstructorParameters',
                'InstanceType',
                'ThisType',
                'Uppercase',
                'Lowercase',
                'Capitalize',
                'Uncapitalize',
                '__type',
                '__object',
        ]);

        if (builtIns.has(name)) {
                return true;
        }

        const declarations = symbol.getDeclarations();
        if (!declarations || declarations.length === 0) {
                return true;
        }

        const sourceFile = declarations[0].getSourceFile();
        const fileName = sourceFile.fileName;

        if (fileName.includes('/node_modules/typescript/lib/')) {
                return true;
        }

        if (fileName.includes('\\node_modules\\typescript\\lib\\')) {
                return true;
        }

        if (/lib\.[^/\\]+\.d\.ts$/.test(fileName)) {
                return true;
        }

        return false;
}
