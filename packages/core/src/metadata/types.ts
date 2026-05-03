// packages/core/src/metadata/types.ts

import type { SourceSpan, SymbolId } from '@adtk/shared';

import type { ParsedAnnotation } from '../annotation';
/**
 * Metadata attached to every IR node.
 *
 * @remarks
 * Every IR node carries metadata about its source location, symbol identity,
 * and any JSDoc annotations. This enables precise error reporting and
 * plugin-driven transformations.
 */
export interface IRMetadata {
        readonly symbolId: SymbolId;
        readonly span: SourceSpan;
        readonly annotations: readonly ParsedAnnotation[];
        readonly documentation?: string;
}
