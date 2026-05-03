// packages/core/src/extraction/index.ts

export { extractSymbol } from './symbol.js';
export { createExtractionContext, DEFAULT_EXTRACTION_OPTIONS } from './context.js';
export type {
        ExtractionContext,
        ExtractionOptions,
        ExtractionError,
        SymbolExtractionResult,
} from './types.js';
