// packages/core/src/annotation/parser.ts

import {
        jsDocTagName,
        ok,
        err,
        filePath,
        type Result,
        type DiagnosticCollector,
        type FilePath,
        type SourceSpan,
} from '@adtk/shared';
import type * as ts from 'typescript';

import type { ParsedAnnotation } from './types.js';
import { CoreDiagnostics } from '../diagnostics.js';

/**
 * Parses JSDoc annotations from a TypeScript symbol.
 *
 * @remarks
 * Extracts custom annotation tags (e.g., @validate, @min, @email) from JSDoc comments.
 * Standard JSDoc tags (@param, @returns, @deprecated) are ignored as they're handled
 * by TypeScript's documentation system.
 *
 * Annotation format:
 * - Simple: `@tagName`
 * - With value: `@tagName(value)`
 * - With object: `@tagName({ key: value, ... })`
 *
 * @example
 * ```typescript
 * // From source:
 * /**
 *  * @validate
 *  * @min(18)
 *  * @pattern(/^[A-Z]/)
 *  *\/
 * type Age = number;
 *
 * // Produces:
 * [
 *   { tag: 'validate', data: null, span: {...} },
 *   { tag: 'min', data: 18, span: {...} },
 *   { tag: 'pattern', data: /^[A-Z]/, span: {...} }
 * ]
 * ```
 */
export function parseAnnotations(
        symbol: ts.Symbol,
        sourceFile: ts.SourceFile,
        diagnostics: DiagnosticCollector,
): readonly ParsedAnnotation[] {
        const jsdocTags = symbol.getJsDocTags();

        if (jsdocTags.length === 0) {
                return [];
        }

        const annotations: ParsedAnnotation[] = [];

        for (const tag of jsdocTags) {
                const tagName = tag.name;

                // Skip standard JSDoc tags - these are for documentation, not runtime validation
                if (isStandardJsDocTag(tagName)) {
                        continue;
                }

                const annotationResult = parseAnnotation(tag, symbol, sourceFile, diagnostics);

                if (annotationResult.ok) {
                        annotations.push(annotationResult.value);
                }
        }

        return annotations;
}

function parseAnnotation(
        tag: ts.JSDocTagInfo,
        symbol: ts.Symbol,
        sourceFile: ts.SourceFile,
        diagnostics: DiagnosticCollector,
): Result<ParsedAnnotation, void> {
        const tagName = jsDocTagName(tag.name);
        const tagText = tag.text?.map((part) => part.text).join('') ?? '';

        // Find the actual JSDoc node for accurate source spans
        const declaration = symbol.declarations?.[0];
        if (!declaration) {
                // Symbol without declaration - create annotation with synthetic span
                const filePathResult = filePath(sourceFile.fileName);
                if (!filePathResult.ok) {
                        diagnostics.add(
                                CoreDiagnostics.ANNOTATION_INVALID_FILE_PATH.new(
                                        symbol.getName(),
                                        filePathResult.error,
                                ),
                        ); // Fatal diagnostic throws, unreachable
                        return err(undefined);
                }

                return ok({
                        tag: tagName,
                        data: parseAnnotationValue(tagText, tagName, null, sourceFile, diagnostics),
                        span: {
                                file: filePathResult.value,
                                start: { line: 1, column: 1, offset: 0 },
                                end: { line: 1, column: 1, offset: 0 },
                        },
                });
        }

        const jsdocNode = findJsDocNode(declaration, tag.name);

        if (!jsdocNode) {
                // JSDoc tag exists but we can't find its AST node
                // This shouldn't happen but handle gracefully
                diagnostics.add(
                        CoreDiagnostics.ANNOTATION_TAG_LOCATION_UNKNOWN.new(
                                tag.name,
                                symbol.getName(),
                        ),
                );

                return ok({
                        tag: tagName,
                        data: parseAnnotationValue(tagText, tagName, null, sourceFile, diagnostics),
                        span: getSpanFromNode(declaration, sourceFile, diagnostics),
                });
        }

        const span = getSpanFromNode(declaration, sourceFile, diagnostics);
        const data = parseAnnotationValue(tagText, tagName, jsdocNode, sourceFile, diagnostics);

        return ok({
                tag: tagName,
                data,
                span,
        });
}

function parseAnnotationValue(
        text: string,
        tagName: string,
        node: ts.Node | null,
        sourceFile: ts.SourceFile,
        diagnostics: DiagnosticCollector,
): unknown {
        const trimmed = text.trim();

        // Empty annotation: @validate
        if (trimmed === '') {
                return null;
        }

        // Check if it looks like a function call: @min(18)
        const functionCallMatch = trimmed.match(/^\((.+)\)$/s);
        if (functionCallMatch) {
                const argsText = functionCallMatch[1];
                return parseAnnotationArguments(argsText, tagName, node, sourceFile, diagnostics);
        }

        // Plain value: @deprecated This is old
        return trimmed;
}

function parseAnnotationArguments(
        argsText: string,
        tagName: string,
        node: ts.Node | null,
        sourceFile: ts.SourceFile,
        diagnostics: DiagnosticCollector,
): unknown {
        const trimmed = argsText.trim();

        // Try to parse as JSON-like value
        const parsed = tryParseJson(trimmed);

        if (parsed.ok) {
                return parsed.value;
        }

        // Try to parse as a single literal value
        const literal = tryParseLiteral(trimmed);

        if (literal.ok) {
                return literal.value;
        }

        // Try to parse as comma-separated values (e.g., @range(0, 100))
        const commaSeparated = tryParseCommaSeparated(trimmed);

        if (commaSeparated.ok) {
                return commaSeparated.value;
        }

        // Try to parse as JavaScript object literal (e.g., { timeout: 5000, retries: 3 })
        const objectLiteral = tryParseObjectLiteral(trimmed);

        if (objectLiteral.ok) {
                return objectLiteral.value;
        }

        // Couldn't parse - report diagnostic and return as string
        const span = node ? getSpanFromNode(node, sourceFile, diagnostics) : null;

        if (span) {
                diagnostics.add(
                        CoreDiagnostics.ANNOTATION_UNPARSEABLE_ARGUMENT.new(span, tagName, trimmed),
                );
        }

        return trimmed;
}

function tryParseJson(text: string): Result<unknown, string> {
        try {
                const value = JSON.parse(text);
                return ok(value);
        } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return err(message);
        }
}

function tryParseLiteral(text: string): Result<unknown, string> {
        // Boolean
        if (text === 'true') return ok(true);
        if (text === 'false') return ok(false);

        // Null
        if (text === 'null') return ok(null);

        // Number (including negative, decimal, scientific notation)
        const numberMatch = text.match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/);
        if (numberMatch) {
                const num = Number(text);
                if (!Number.isNaN(num)) {
                        return ok(num);
                }
        }

        // BigInt
        if (text.endsWith('n')) {
                const numPart = text.slice(0, -1);
                try {
                        const bigint = BigInt(numPart);
                        return ok(bigint);
                } catch {
                        // Not a valid bigint
                }
        }

        // String with quotes
        if (
                (text.startsWith('"') && text.endsWith('"')) ||
                (text.startsWith("'") && text.endsWith("'"))
        ) {
                return ok(text.slice(1, -1));
        }

        // RegExp
        const regexMatch = text.match(/^\/(.+)\/([gimsuvy]*)$/);
        if (regexMatch) {
                try {
                        const pattern = regexMatch[1];
                        const flags = regexMatch[2];
                        // Validate the regex by constructing it
                        const regex = new RegExp(pattern, flags);
                        return ok(regex);
                } catch {
                        // Invalid regex - don't treat it as a regex literal
                        return err('Invalid regular expression pattern');
                }
        }

        return err('Not a recognized literal format');
}

function tryParseCommaSeparated(text: string): Result<unknown[], string> {
        // Check if it looks like comma-separated values
        if (!text.includes(',')) {
                return err('No commas found');
        }

        // Split by comma and try to parse each value
        const parts = text.split(',').map((s) => s.trim());
        const values: unknown[] = [];

        for (const part of parts) {
                // Try to parse each part as a literal
                const literalResult = tryParseLiteral(part);

                if (literalResult.ok) {
                        values.push(literalResult.value);
                } else {
                        // If any part can't be parsed, this isn't a valid array
                        return err(`Cannot parse array element: ${part}`);
                }
        }

        return ok(values);
}

function tryParseObjectLiteral(text: string): Result<Record<string, unknown>, string> {
        // Check if it looks like an object literal
        if (!text.startsWith('{') || !text.endsWith('}')) {
                return err('Not an object literal');
        }

        // Try to convert JavaScript object literal to JSON
        // This handles cases like { timeout: 5000, retries: 3 }
        // by converting to {"timeout":5000,"retries":3}

        try {
                // Remove outer braces
                const inner = text.slice(1, -1).trim();

                if (inner === '') {
                        return ok({});
                }

                // Split by comma (simple approach - doesn't handle nested objects)
                const pairs = inner.split(',').map((s) => s.trim());
                const result: Record<string, unknown> = {};

                for (const pair of pairs) {
                        // Split by first colon
                        const colonIndex = pair.indexOf(':');

                        if (colonIndex === -1) {
                                return err(`Invalid key-value pair: ${pair}`);
                        }

                        const key = pair.slice(0, colonIndex).trim();
                        const valueText = pair.slice(colonIndex + 1).trim();

                        // Remove quotes from key if present
                        const cleanKey = key.replace(/^['"]|['"]$/g, '');

                        // Parse the value
                        const valueResult = tryParseLiteral(valueText);

                        if (valueResult.ok) {
                                result[cleanKey] = valueResult.value;
                        } else {
                                // Try as JSON in case it's a complex value
                                const jsonResult = tryParseJson(valueText);
                                if (jsonResult.ok) {
                                        result[cleanKey] = jsonResult.value;
                                } else {
                                        return err(
                                                `Cannot parse value for key "${cleanKey}": ${valueText}`,
                                        );
                                }
                        }
                }

                return ok(result);
        } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return err(`Object literal parsing failed: ${message}`);
        }
}

function findJsDocNode(declaration: ts.Node, tagName: string): ts.Node | undefined {
        // Get all JSDoc comments on the declaration
        const jsdocs =
                'jsDoc' in declaration ? (declaration.jsDoc as ts.JSDoc[] | undefined) : undefined;

        if (!jsdocs || jsdocs.length === 0) {
                return undefined;
        }

        // Search through JSDoc comments for the tag
        for (const jsdoc of jsdocs) {
                if (!jsdoc.tags) continue;

                for (const tag of jsdoc.tags) {
                        const currentTagName = tag.tagName.text;
                        if (currentTagName === tagName) {
                                return tag;
                        }
                }
        }

        return undefined;
}

function getSpanFromNode(
        node: ts.Node,
        sourceFile: ts.SourceFile,
        diagnostics: DiagnosticCollector,
): SourceSpan {
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

        const filePathResult = filePath(sourceFile.fileName);
        if (!filePathResult.ok) {
                diagnostics.add(
                        CoreDiagnostics.ANNOTATION_INVALID_FILE_PATH.new(
                                sourceFile.fileName,
                                filePathResult.error,
                        ),
                );
                // Fatal diagnostic throws, this is unreachable
                // Return dummy value to satisfy TypeScript
                return {
                        file: '' as FilePath,
                        start: { line: 1, column: 1, offset: 0 },
                        end: { line: 1, column: 1, offset: 0 },
                };
        }

        return {
                file: filePathResult.value,
                start: {
                        line: start.line + 1,
                        column: start.character + 1,
                        offset: node.getStart(),
                },
                end: {
                        line: end.line + 1,
                        column: end.character + 1,
                        offset: node.getEnd(),
                },
        };
}

// Standard JSDoc tags that should be ignored (handled by TypeScript's own documentation system)
function isStandardJsDocTag(tagName: string): boolean {
        const standardTags = new Set([
                'param',
                'params',
                'arg',
                'argument',
                'returns',
                'return',
                'type',
                'typedef',
                'callback',
                'template',
                'class',
                'constructor',
                'this',
                'extends',
                'augments',
                'implements',
                'namespace',
                'memberof',
                'private',
                'protected',
                'public',
                'readonly',
                'override',
                'abstract',
                'virtual',
                'deprecated',
                'see',
                'link',
                'example',
                'author',
                'version',
                'since',
                'license',
                'copyright',
                'todo',
                'throws',
                'exception',
                'yields',
                'yield',
                'async',
                'generator',
                'const',
                'constant',
                'enum',
                'property',
                'prop',
                'module',
                'exports',
                'hideconstructor',
                'ignore',
                'inheritdoc',
                'access',
                'package',
                'static',
                'summary',
                'description',
                'desc',
                'file',
                'fileoverview',
                'overview',
                'kind',
                'name',
                'fires',
                'emits',
                'listens',
                'alias',
                'external',
                'host',
                'variation',
                'inner',
                'instance',
                'global',
                'mixin',
                'mixinclass',
                'mixinfunction',
                'event',
                'requires',
                'borrows',
                'constructs',
                'interface',
                'record',
                'lends',
                'tutorial',
        ]);

        return standardTags.has(tagName.toLowerCase());
}
