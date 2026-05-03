// packages/core/src/querying/types.ts

import type { SymbolId, JsDocTagName, FilePath } from '@adtk/shared';

/**
 * A query for finding symbols in a TypeScript program.
 */
export type SymbolQuery =
        | { readonly type: 'all' }
        | { readonly type: 'by-ids'; readonly ids: readonly SymbolId[] }
        | {
                  readonly type: 'filtered';
                  readonly source: SymbolSource;
                  readonly filters: readonly SymbolFilter[];
          };

/**
 * Source of symbols for a filtered query.
 */
export type SymbolSource =
        | { readonly type: 'all-files' }
        | { readonly type: 'files'; readonly paths: readonly FilePath[] }
        | { readonly type: 'glob'; readonly pattern: string }
        | { readonly type: 'call-sites'; readonly functionName: string };

/**
 * Filter to apply to symbols from a source.
 */
export type SymbolFilter =
        | { readonly type: 'exports-only' }
        | { readonly type: 'has-annotation'; readonly tag: JsDocTagName }
        | { readonly type: 'has-any-annotation'; readonly tags: readonly JsDocTagName[] }
        | { readonly type: 'exclude-pattern'; readonly pattern: string }
        | { readonly type: 'kind'; readonly kinds: readonly SymbolKind[] };

/**
 * Kind of TypeScript symbol.
 */
export type SymbolKind = 'type-alias' | 'interface' | 'class' | 'enum' | 'const';
