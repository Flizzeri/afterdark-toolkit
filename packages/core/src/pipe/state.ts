// packages/core/src/pipe/state.ts

import type { SymbolId, Hash, Diagnostic } from '@afterdarktk/shared';
import type { Project } from 'ts-morph';

import type { IRNode } from '../ir/nodes.js';
import type { ParsedAnnotation } from '../jsdoc/annotations.js';
import type { RawSymbol } from '../jsdoc/parse.js';
import type { CoreTagName } from '../jsdoc/tags.js';
import type { ValidatedAnnotations } from '../jsdoc/validate.js';
import type { ResolvedType } from '../types/types.js';

export interface ExtractionState {
        readonly project: Project;
        readonly symbols: Map<SymbolId, RawSymbol>;
        readonly parsedAnnotations: Map<SymbolId, readonly ParsedAnnotation[]>;
        readonly tagIndex: Map<CoreTagName, readonly SymbolId[]>;
        readonly resolvedTypes: Map<SymbolId, ResolvedType>;
        readonly validatedAnnotations: Map<SymbolId, ValidatedAnnotations>;
        readonly irNodes: Map<SymbolId, IRNode>;
        readonly hashes: Map<SymbolId, Hash>;
        readonly diagnostics: Diagnostic[];
}
