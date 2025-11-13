// src/ts/symbols.ts
import {
        type Node,
        type Symbol as TsSymbol,
        type Type as TsType,
        type InterfaceDeclaration,
        type TypeAliasDeclaration,
        type JSDocText,
        type JSDocLink,
        type JSDocLinkCode,
        type JSDocLinkPlain,
        Node as ESNode,
        SyntaxKind,
} from 'ts-morph';

import { normalizePath } from './fs.js';
import type { ProgramWrapper } from './program.js';
import type { ParsedJsDocTag, SourceSpan } from './types.js';
import { TYPE_UNRESOLVED } from '../diagnostics/codes.js';
import { makeDiagnostic } from '../diagnostics/factory.js';
import type { SymbolId, JsDocTagName } from '../shared/primitives.js';
import { ok, err, type Result } from '../shared/result.js';

/**
 * Gets a stable, deterministic symbol ID from a TypeScript symbol.
 * Uses fully qualified name when available, otherwise falls back to unique identifier.
 *
 * @param symbol - The TypeScript symbol.
 * @returns Branded SymbolId.
 */
export function getSymbolId(symbol: TsSymbol): SymbolId {
        const fqn = symbol.getFullyQualifiedName();
        // Remove quotes from module identifiers for stability
        const normalized = fqn.replace(/["']/g, '');
        return normalized as SymbolId;
}

/**
 * Resolves a symbol's type, following aliases to their target.
 * Returns the final resolved type after unwrapping all aliases.
 * Never throws; returns Result with diagnostics on failure.
 *
 * @param symbol - The symbol to resolve.
 * @returns Result containing the resolved type or diagnostics.
 */
export function resolveSymbolType(symbol: TsSymbol): Result<TsType> {
        try {
                const declaredType = symbol.getDeclaredType();
                if (!declaredType) {
                        return err([
                                makeDiagnostic({
                                        meta: TYPE_UNRESOLVED,
                                        args: [
                                                `Symbol ${getSymbolId(symbol)} has no declared type`,
                                        ],
                                }),
                        ]);
                }

                // Follow alias chain to target
                let type = declaredType;
                while (type.isTypeParameter() || type.getAliasSymbol()) {
                        const target = type.getTargetType();
                        if (target && target !== type) {
                                type = target;
                        } else {
                                break;
                        }
                }

                return ok(type);
        } catch (e) {
                return err([
                        makeDiagnostic({
                                meta: TYPE_UNRESOLVED,
                                args: [`Failed to resolve type for symbol: ${String(e)}`],
                        }),
                ]);
        }
}

/**
 * Gets all declarations for a given symbol.
 * Returns nodes that declare the symbol (interfaces, type aliases, etc.).
 *
 * @param symbol - The symbol to query.
 * @returns Array of declaration nodes.
 */
export function getSymbolDeclarations(symbol: TsSymbol): readonly Node[] {
        return symbol.getDeclarations();
}

/**
 * Extracts JSDoc tags from a node in a deterministic manner.
 * Normalizes whitespace and ensures stable ordering.
 * Never throws; returns empty array on error.
 *
 * @param node - The node to extract JSDoc from.
 * @returns Array of parsed JSDoc tags.
 */
export function extractJsDocTags(node: Node): readonly ParsedJsDocTag[] {
        try {
                const jsDocs = ESNode.isJSDocable(node) ? node.getJsDocs() : [];
                if (!jsDocs || jsDocs.length === 0) {
                        return [];
                }

                const tags: ParsedJsDocTag[] = [];

                for (const jsDoc of jsDocs) {
                        const jsDocTags = jsDoc.getTags();

                        for (const tag of jsDocTags) {
                                const tagName = tag.getTagName() as JsDocTagName;
                                const text = normalizeJsDocText(tag.getComment());

                                tags.push({
                                        name: tagName,
                                        text,
                                        ...(jsDoc.getComment() && {
                                                comment: normalizeJsDocText(jsDoc.getComment()),
                                        }),
                                });
                        }
                }

                // Sort tags by name for deterministic ordering
                return tags.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
        } catch {
                // Fail gracefully; JSDoc extraction is best-effort
                return [];
        }
}

/**
 * Normalizes JSDoc text into a deterministic flat string.
 * Handles both plain strings and structured JSDoc contents.
 *
 * - Flattens arrays of JSDoc nodes (text, link, code, etc.)
 * - Removes all formatting/markup
 * - Collapses all whitespace to a single space
 * - Ensures deterministic output across platforms and TS versions
 */
function normalizeJsDocText(
        text:
                | string
                | Array<JSDocText | JSDocLink | JSDocLinkCode | JSDocLinkPlain | undefined>
                | undefined,
): string {
        if (!text) return '';

        let raw: string = '';

        if (typeof text === 'string') {
                raw = text;
        } else if (Array.isArray(text)) {
                // Flatten structured JSDoc content into plain text
                raw = text
                        .map((piece) => {
                                if (!piece) return '';
                                try {
                                        // getText() is deterministic for these nodes
                                        return piece.getText() ?? '';
                                } catch {
                                        return '';
                                }
                        })
                        .join('');
        } else {
                // Unexpected case: stringify as fallback
                raw = String(text);
        }

        // Final deterministic normalization
        return raw
                .replace(/\r\n/g, '\n') // normalize newlines
                .replace(/\s+/g, ' ') // collapse whitespace
                .replace(/^\*+/g, '')
                .replace(/\s*\*+\s*$/g, '') // remove stray asterisks from JSDoc body
                .trim();
}

/**
 * Gets the source span (location) for a given node.
 * Returns 1-based line and column numbers for stability.
 * Never throws; returns undefined on error.
 *
 * @param node - The node to locate.
 * @returns SourceSpan or undefined if location unavailable.
 */
export function getNodeSpan(node: Node): SourceSpan | undefined {
        try {
                const sourceFile = node.getSourceFile();
                const start = node.getStart();
                const end = node.getEnd();

                const startPos = sourceFile.getLineAndColumnAtPos(start);
                const endPos = sourceFile.getLineAndColumnAtPos(end);

                return {
                        filePath: normalizePath(sourceFile.getFilePath()),
                        startLine: startPos.line,
                        startColumn: startPos.column,
                        endLine: endPos.line,
                        endColumn: endPos.column,
                };
        } catch {
                return undefined;
        }
}

/**
 * Finds an exported symbol by name in the project.
 * Searches all source files for a matching export.
 * Never throws; returns Result with diagnostics on failure.
 *
 * @param wrapper - The program wrapper.
 * @param symbolName - The name of the symbol to find.
 * @returns Result containing the symbol or diagnostics.
 */
export function findExportedSymbol(wrapper: ProgramWrapper, symbolName: string): Result<TsSymbol> {
        try {
                for (const sourceFile of wrapper.project.getSourceFiles()) {
                        if (
                                sourceFile.isDeclarationFile() ||
                                sourceFile.getFilePath().includes('node_modules')
                        ) {
                                continue;
                        }

                        // Check named exports
                        const exported = sourceFile.getExportedDeclarations().get(symbolName);
                        if (exported && exported.length > 0) {
                                const decl = exported[0];
                                const symbol = decl?.getSymbol();
                                if (symbol) {
                                        return ok(symbol);
                                }
                        }
                }

                return err([
                        makeDiagnostic({
                                meta: TYPE_UNRESOLVED,
                                args: [`Exported symbol '${symbolName}' not found in project`],
                        }),
                ]);
        } catch (e) {
                return err([
                        makeDiagnostic({
                                meta: TYPE_UNRESOLVED,
                                args: [`Error finding symbol '${symbolName}': ${String(e)}`],
                        }),
                ]);
        }
}

/**
 * Checks if a node is an interface declaration.
 * Type guard for safe casting.
 *
 * @param node - The node to check.
 * @returns True if node is an InterfaceDeclaration.
 */
export function isInterfaceDeclaration(node: Node): node is InterfaceDeclaration {
        return node.getKind() === SyntaxKind.InterfaceDeclaration;
}

/**
 * Checks if a node is a type alias declaration.
 * Type guard for safe casting.
 *
 * @param node - The node to check.
 * @returns True if node is a TypeAliasDeclaration.
 */
export function isTypeAliasDeclaration(node: Node): node is TypeAliasDeclaration {
        return node.getKind() === SyntaxKind.TypeAliasDeclaration;
}

/**
 * Gets all interface declarations annotated with a specific JSDoc tag.
 * Useful for finding @entity interfaces, for example.
 *
 * @param wrapper - The program wrapper.
 * @param tagName - The JSDoc tag name to search for (e.g., "entity").
 * @returns Array of matching interface declarations.
 */
export function getInterfacesWithTag(
        wrapper: ProgramWrapper,
        tagName: string,
): readonly InterfaceDeclaration[] {
        const interfaces: InterfaceDeclaration[] = [];

        for (const sourceFile of wrapper.project.getSourceFiles()) {
                if (
                        sourceFile.isDeclarationFile() ||
                        sourceFile.getFilePath().includes('node_modules')
                ) {
                        continue;
                }

                for (const iface of sourceFile.getInterfaces()) {
                        const tags = extractJsDocTags(iface);
                        if (tags.some((tag) => tag.name === tagName)) {
                                interfaces.push(iface);
                        }
                }
        }

        return interfaces;
}

Object.freeze(getSymbolId);
Object.freeze(resolveSymbolType);
Object.freeze(getSymbolDeclarations);
Object.freeze(extractJsDocTags);
Object.freeze(getNodeSpan);
Object.freeze(findExportedSymbol);
Object.freeze(isInterfaceDeclaration);
Object.freeze(isTypeAliasDeclaration);
Object.freeze(getInterfacesWithTag);
