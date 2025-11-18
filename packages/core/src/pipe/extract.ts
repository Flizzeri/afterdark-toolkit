// src/pipe/extract.ts

import type { ExtractionState } from './state.js';
import { encodeCanonical } from '../canonical/encode.js';
import { computeHash } from '../canonical/hash.js';
import { lowerToIR } from '../ir/lower.js';
import type { IRProgram, IREntity } from '../ir/nodes.js';
import { parseJsDocAnnotations, type RawSymbol } from '../jsdoc/parse.js';
import { CORE_TAGS } from '../jsdoc/tags.js';
import { validateAnnotations } from '../jsdoc/validate.js';
import type { Diagnostic, SourceSpan } from '../shared/diagnostics.js';
import type { SymbolId, EntityName, Hash, FilePath } from '../shared/primitives.js';
import { ok, err, isErr, type Result } from '../shared/result.js';
import { createProgram } from '../ts/program.js';
import {
        getSymbolId,
        extractJsDocTags,
        getNodeSpan,
        findExportedSymbol,
        getInterfacesWithTag,
} from '../ts/symbols.js';
import { resolveSymbolType } from '../types/resolve.js';

export interface ExtractProgramIRInput {
        readonly tsconfigPath: string;
        readonly basePath?: string;
}

export interface ExtractProgramIROutput {
        readonly ir: IRProgram;
        readonly diagnostics: readonly Diagnostic[];
}

/**
 * Orchestrates the complete extraction pipeline from TypeScript source to IR.
 * Steps:
 * 1. Load TS program
 * 2. Collect symbols with JSDoc
 * 3. Parse JSDoc annotations
 * 4. Resolve types for symbols with @entity
 * 5. Validate annotations against resolved types
 * 6. Lower to IR nodes
 * 7. Compute stable hashes
 * 8. Assemble IRProgram
 *
 * Never throws; returns Result with accumulated diagnostics.
 */
export async function extractProgramIR(
        input: ExtractProgramIRInput,
): Promise<Result<ExtractProgramIROutput>> {
        const programRes = await createProgram({
                tsconfigPath: input.tsconfigPath as FilePath,
                ...(input.basePath && { basePath: input.basePath }),
        });

        if (isErr(programRes)) {
                return programRes;
        }

        const wrapper = programRes.value;
        const state: ExtractionState = {
                project: wrapper.project,
                symbols: new Map(),
                parsedAnnotations: new Map(),
                tagIndex: new Map(),
                resolvedTypes: new Map(),
                validatedAnnotations: new Map(),
                irNodes: new Map(),
                hashes: new Map(),
                diagnostics: [],
        };

        // Step 1: Collect symbols with @entity annotation
        const entityInterfaces = getInterfacesWithTag(wrapper, CORE_TAGS.ENTITY);

        for (const iface of entityInterfaces) {
                const symbol = iface.getSymbol();
                if (!symbol) continue;

                const symbolId = getSymbolId(symbol);
                const tags = extractJsDocTags(iface);

                const rawSymbol: RawSymbol = {
                        symbolId: symbolId as SymbolId,
                        tags: tags.map((t) => ({
                                name: t.name,
                                text: t.text,
                        })),
                };

                state.symbols.set(symbolId as SymbolId, rawSymbol);
        }

        // Step 2: Parse JSDoc annotations
        const parseResult = parseJsDocAnnotations(state.symbols, {
                resolveTags: new Set([CORE_TAGS.ENTITY]),
        });

        for (const [symbolId, annotations] of parseResult.annotations) {
                (state.parsedAnnotations as Map<SymbolId, typeof annotations>).set(
                        symbolId,
                        annotations,
                );
        }

        for (const [tag, symbols] of parseResult.tagIndex) {
                (state.tagIndex as Map<typeof tag, typeof symbols>).set(tag, symbols);
        }

        state.diagnostics.push(...parseResult.diagnostics);

        // Step 3: Determine symbols to resolve (all @entity symbols)
        const symbolsToResolve = new Set<SymbolId>();
        const entitySymbols = parseResult.tagIndex.get(CORE_TAGS.ENTITY) ?? [];
        for (const symbolId of entitySymbols) {
                symbolsToResolve.add(symbolId);
        }

        // Step 4: Resolve types for each symbol
        for (const symbolId of symbolsToResolve) {
                // Extract the interface name from the fully qualified symbolId
                // symbolId format: "/path/to/file.InterfaceName"
                const interfaceName = String(symbolId).split('.').pop() ?? String(symbolId);
                const symbolRes = findExportedSymbol(wrapper, interfaceName);
                if (isErr(symbolRes)) {
                        state.diagnostics.push(...symbolRes.diagnostics);
                        continue;
                }

                const symbol = symbolRes.value;
                const typeRes = resolveSymbolType(symbol);

                if (isErr(typeRes)) {
                        state.diagnostics.push(...typeRes.diagnostics);
                        continue;
                }

                (state.resolvedTypes as Map<SymbolId, typeof typeRes.value>).set(
                        symbolId,
                        typeRes.value,
                );
        }

        // Step 5: Validate annotations against resolved types
        for (const [symbolId, resolvedType] of state.resolvedTypes) {
                const annotations = state.parsedAnnotations.get(symbolId) ?? [];
                const validationRes = validateAnnotations(resolvedType, annotations);

                if (isErr(validationRes)) {
                        state.diagnostics.push(...validationRes.diagnostics);
                        continue;
                }

                (state.validatedAnnotations as Map<SymbolId, typeof validationRes.value>).set(
                        symbolId,
                        validationRes.value,
                );
        }

        // Step 6: Lower to IR nodes
        for (const [symbolId, resolvedType] of state.resolvedTypes) {
                const validated = state.validatedAnnotations.get(symbolId);
                if (!validated) continue;

                const interfaceName = String(symbolId).split('.').pop() ?? String(symbolId);
                const symbolRes = findExportedSymbol(wrapper, interfaceName);
                if (isErr(symbolRes)) continue;

                const symbol = symbolRes.value;
                const declarations = symbol.getDeclarations();
                const span = getNodeSpan(declarations[0]);

                const irNode = lowerToIR({
                        symbolId,
                        resolvedType,
                        annotations: validated.annotations,
                        ...(span && { span }),
                });

                (state.irNodes as Map<SymbolId, typeof irNode>).set(symbolId, irNode);
        }

        // Step 7: Compute stable hashes
        for (const [symbolId, irNode] of state.irNodes) {
                const canonicalRes = encodeCanonical(irNode);
                if (isErr(canonicalRes)) {
                        state.diagnostics.push(...canonicalRes.diagnostics);
                        continue;
                }

                const hashRes = computeHash(canonicalRes.value);
                if (isErr(hashRes)) {
                        state.diagnostics.push(...hashRes.diagnostics);
                        continue;
                }

                (state.hashes as Map<SymbolId, Hash>).set(symbolId, hashRes.value);
        }

        // Step 8: Assemble IRProgram
        const entities = new Map<SymbolId, IREntity>();

        for (const [symbolId, irNode] of state.irNodes) {
                const annotations = state.parsedAnnotations.get(symbolId) ?? [];
                const entityAnnotation = annotations.find((a) => a.tag === 'entity');

                if (!entityAnnotation) continue;

                const entityName =
                        (entityAnnotation.tag === 'entity' && entityAnnotation.name) ||
                        String(symbolId);

                const interfaceName = String(symbolId).split('.').pop() ?? String(symbolId);
                const symbolRes = findExportedSymbol(wrapper, interfaceName);
                const decl = symbolRes.ok ? symbolRes.value.getDeclarations()[0] : undefined;
                const span: SourceSpan | undefined = decl ? getNodeSpan(decl) : undefined;

                const entity: IREntity = {
                        symbolId,
                        name: entityName as EntityName,
                        node: irNode,
                        ...(span && { span }),
                        annotations,
                };

                entities.set(symbolId, entity);
        }

        const irProgram: IRProgram = {
                entities,
                nodes: state.irNodes,
        };

        // If we have fatal errors, return them
        const fatalErrors = state.diagnostics.filter((d) => d.category === 'error');
        if (fatalErrors.length > 0) {
                return err(state.diagnostics);
        }

        return ok({
                ir: irProgram,
                diagnostics: state.diagnostics,
        });
}
