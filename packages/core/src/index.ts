// packages/core/src/index.ts

// Main entry point
export { extractSymbols } from './resolution/resolver.js';

// Resolution types (public API)
export type {
        ExtractionOptions,
        ExtractionResult,
        ExtractionError,
        SymbolExtractionResult,
} from './resolution/types.js';

// Query types (public API for plugins/compiler)
export type { SymbolQuery, SymbolSource, SymbolFilter, SymbolKind } from './querying/types.js';

// IR types (public - plugins consume these)
export type {
        IRNode,
        IRPrimitive,
        IRLiteral,
        IRArray,
        IRTuple,
        IRObject,
        IRTemplateLiteral,
        IRUnion,
        IRIntersection,
        IRRef,
        IRUnsupported,
        PrimitiveKind,
        LiteralKind,
        LiteralValue,
        IRObjectProperty,
        IRIndexSignature,
        IRTupleElement,
        IRUnionMember,
        IRIntersectionMember,
        TemplateLiteralPart,
        DiscriminantHint,
} from './ir/types.js';

// IR type guards (public utility)
export { IRNodeGuard } from './ir/guards.js';

// Metadata types (public - part of IR nodes)
export type { IRMetadata } from './metadata/types.js';

// Annotation types (public - part of metadata)
export type { ParsedAnnotation } from './annotation/types.js';
