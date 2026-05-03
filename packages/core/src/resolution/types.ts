// packages/core/src/resolution/types.ts

import type { SymbolId } from '@adtk/shared';
import type * as ts from 'typescript';

import type { IRNode } from '../ir';
import type { SymbolQuery } from '../querying';

/**
 * Options for IR extraction.
 */
export interface ExtractionOptions {
        /**
         * Whether to extract JSDoc annotations into IR metadata.
         *
         * @defaultValue true
         */
        readonly extractAnnotations: boolean;

        /**
         * Whether to extract documentation comments into IR metadata.
         *
         * @defaultValue false
         */
        readonly extractDocumentation: boolean;

        /**
         * Whether to fail on the first error or collect all errors.
         *
         * @defaultValue false
         */
        readonly strictMode: boolean;
}

/**
 * Result of extracting a single symbol.
 */
export interface SymbolExtractionResult {
        /**
         * The unique identifier for this symbol.
         */
        readonly symbolId: SymbolId;

        /**
         * The extracted IR for this symbol.
         * May contain IRRef nodes for circular references.
         */
        readonly ir: IRNode;

        /**
         * Syntactic dependencies extracted from the AST.
         * Maps dependency SymbolId to its declaration node.
         */
        readonly dependencies: Map<SymbolId, ts.Declaration>;
}

/**
 * Result of extracting symbols matching queries.
 */
export interface ExtractionResult {
        /**
         * All extracted symbols, keyed by SymbolId.
         */
        readonly symbols: Map<SymbolId, SymbolExtractionResult>;

        /**
         * Mapping of each query to the symbols it matched.
         */
        readonly queryResults: Map<SymbolQuery, Set<SymbolId>>;
}

/**
 * Errors that can occur during extraction.
 */
export type ExtractionError =
        | { readonly type: 'no-symbols-found'; readonly queries: readonly SymbolQuery[] }
        | {
                  readonly type: 'query-execution-failed';
                  readonly query: SymbolQuery;
                  readonly reason: string;
          }
        | { readonly type: 'extraction-failed'; readonly failedCount: number };
