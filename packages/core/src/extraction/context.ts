// packages/core/src/extraction/context.ts

import type { SourceFile } from '@adtk/program';
import type { DiagnosticCollector, SymbolId, Result } from '@adtk/shared';
import type * as ts from 'typescript';

import type { IRNode } from '../ir';
import type { ExtractionContext, ExtractionOptions, ExtractionError } from './types.js';

export const DEFAULT_EXTRACTION_OPTIONS: ExtractionOptions = {
        extractAnnotations: true,
        extractDocumentation: false,
        strictMode: false,
};

export function createExtractionContext(
        checker: ts.TypeChecker,
        sourceFile: SourceFile,
        diagnostics: DiagnosticCollector,
        options: Partial<ExtractionOptions>,
        extractTypeFn: (type: ts.Type, node: ts.Node) => Result<IRNode, ExtractionError>,
): ExtractionContext {
        return {
                checker,
                sourceFile,
                diagnostics,
                options: { ...DEFAULT_EXTRACTION_OPTIONS, ...options },
                visited: new Set<SymbolId>(),
                extractType: extractTypeFn,
        };
}
