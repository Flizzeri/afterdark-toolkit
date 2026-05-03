// packages/core/src/extraction/types.ts

import type { SourceFile } from '@adtk/program';
import type { SymbolId, DiagnosticCollector, Result } from '@adtk/shared';
import type * as ts from 'typescript';

import type { IRNode } from '../ir';

export type ExtractionError =
        | { readonly type: 'no-symbol'; readonly typeText: string }
        | { readonly type: 'unsupported-type'; readonly reason: string; readonly typeText: string }
        | { readonly type: 'circular-reference'; readonly symbolId: SymbolId }
        | { readonly type: 'invalid-literal'; readonly value: unknown; readonly reason: string }
        | { readonly type: 'missing-declaration'; readonly symbolName: string }
        | { readonly type: 'type-checker-error'; readonly reason: string }
        | { readonly type: 'internal-error'; readonly message: string };

export interface ExtractionOptions {
        readonly extractAnnotations: boolean;
        readonly extractDocumentation: boolean;
        readonly strictMode: boolean;
}

export interface ExtractionContext {
        readonly checker: ts.TypeChecker;
        readonly sourceFile: SourceFile;
        readonly diagnostics: DiagnosticCollector;
        readonly options: ExtractionOptions;
        readonly visited: Set<SymbolId>;
        readonly extractType: (type: ts.Type, node: ts.Node) => Result<IRNode, ExtractionError>;
}

export interface SymbolExtractionResult {
        readonly symbolId: SymbolId;
        readonly ir: IRNode;
        readonly dependencies: Map<SymbolId, ts.Declaration>;
}
