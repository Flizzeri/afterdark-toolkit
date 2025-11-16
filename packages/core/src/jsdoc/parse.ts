// src/jsdoc/parse.ts

import type { ParsedAnnotation, Action } from './annotations.js';
import { CORE_TAGS, TAG_GRAMMARS, ALL_CORE_TAG_NAMES, type CoreTagName } from './tags.js';
import {
        TAG_UNKNOWN,
        TAG_MALFORMED,
        TAG_PAYLOAD_MISSING,
        TAG_PAYLOAD_INVALID,
        TAG_DUPLICATE,
} from '../diagnostics/codes.js';
import { makeDiagnostic } from '../diagnostics/factory.js';
import type { Diagnostic } from '../shared/diagnostics.js';
import type { JsDocTagName, SymbolId } from '../shared/primitives.js';

export interface RawJsDocTag {
        readonly name: JsDocTagName;
        readonly text: string;
}

export interface RawSymbol {
        readonly symbolId: SymbolId;
        readonly tags: readonly RawJsDocTag[];
}

export interface ParsedAnnotations {
        readonly annotations: ReadonlyMap<SymbolId, readonly ParsedAnnotation[]>;
        readonly tagIndex: ReadonlyMap<CoreTagName, readonly SymbolId[]>;
        readonly diagnostics: readonly Diagnostic[];
}

export interface ParseOptions {
        readonly resolveTags?: ReadonlySet<CoreTagName>;
}

const DEFAULT_RESOLVE_TAGS: ReadonlySet<CoreTagName> = new Set([CORE_TAGS.ENTITY]);

export function parseJsDocAnnotations(
        symbols: ReadonlyMap<SymbolId, RawSymbol>,
        options: ParseOptions = {},
): ParsedAnnotations {
        const resolveTags = options.resolveTags ?? DEFAULT_RESOLVE_TAGS;
        const annotations = new Map<SymbolId, ParsedAnnotation[]>();
        const tagIndex = new Map<CoreTagName, SymbolId[]>();
        const diagnostics: Diagnostic[] = [];

        for (const [symbolId, rawSymbol] of symbols) {
                const symbolAnnotations: ParsedAnnotation[] = [];
                const seenTags = new Set<JsDocTagName>();

                for (const tag of rawSymbol.tags) {
                        if (!ALL_CORE_TAG_NAMES.has(tag.name as CoreTagName)) {
                                diagnostics.push(
                                        makeDiagnostic({
                                                meta: TAG_UNKNOWN,
                                                args: [tag.name],
                                                context: { entity: symbolId },
                                        }),
                                );
                                continue;
                        }

                        if (seenTags.has(tag.name)) {
                                diagnostics.push(
                                        makeDiagnostic({
                                                meta: TAG_DUPLICATE,
                                                args: [tag.name],
                                                context: { entity: symbolId },
                                        }),
                                );
                                continue;
                        }

                        seenTags.add(tag.name);

                        const parsed = parseTag(tag, symbolId);
                        if (parsed.ok) {
                                symbolAnnotations.push(parsed.value);

                                if (resolveTags.has(tag.name as CoreTagName)) {
                                        const existing =
                                                tagIndex.get(tag.name as CoreTagName) ?? [];
                                        tagIndex.set(tag.name as CoreTagName, [
                                                ...existing,
                                                symbolId,
                                        ]);
                                }
                        } else {
                                diagnostics.push(...parsed.diagnostics);
                        }
                }

                if (symbolAnnotations.length > 0) {
                        annotations.set(symbolId, symbolAnnotations);
                }
        }

        return {
                annotations,
                tagIndex,
                diagnostics,
        };
}

type ParseResult =
        | { ok: true; value: ParsedAnnotation }
        | { ok: false; diagnostics: readonly Diagnostic[] };

function parseTag(tag: RawJsDocTag, symbolId: SymbolId): ParseResult {
        const grammar = TAG_GRAMMARS.get(tag.name as CoreTagName);
        if (!grammar) {
                return {
                        ok: false,
                        diagnostics: [
                                makeDiagnostic({
                                        meta: TAG_MALFORMED,
                                        args: [tag.name],
                                        context: { entity: symbolId },
                                }),
                        ],
                };
        }

        const payload = tag.text.trim();

        if (grammar.payloadRequired && !payload) {
                return {
                        ok: false,
                        diagnostics: [
                                makeDiagnostic({
                                        meta: TAG_PAYLOAD_MISSING,
                                        args: [tag.name],
                                        context: { entity: symbolId },
                                }),
                        ],
                };
        }

        if (grammar.pattern && payload && !grammar.pattern.test(payload)) {
                return {
                        ok: false,
                        diagnostics: [
                                makeDiagnostic({
                                        meta: TAG_PAYLOAD_INVALID,
                                        args: [tag.name, payload],
                                        context: { entity: symbolId },
                                }),
                        ],
                };
        }

        return parseTagPayload(tag.name, payload, symbolId);
}

function parseTagPayload(tagName: JsDocTagName, payload: string, symbolId: SymbolId): ParseResult {
        switch (tagName) {
                case CORE_TAGS.ENTITY:
                        return {
                                ok: true,
                                value: { tag: 'entity', ...(payload && { name: payload }) },
                        };

                case CORE_TAGS.PK:
                        return { ok: true, value: { tag: 'pk' } };

                case CORE_TAGS.UNIQUE:
                        return { ok: true, value: { tag: 'unique' } };

                case CORE_TAGS.INDEX: {
                        const [fieldsPart, uniquePart] = payload.split(':');
                        const fields = fieldsPart!.split(',').map((f) => f.trim());
                        const unique = uniquePart?.trim() === 'unique';
                        return { ok: true, value: { tag: 'index', fields, unique } };
                }

                case CORE_TAGS.FK: {
                        const parts = payload.split(/\s+/);
                        const [targetField, actions] = parts;
                        const [target, field] = targetField!.split('.');

                        if (!target || !field) {
                                return {
                                        ok: false,
                                        diagnostics: [
                                                makeDiagnostic({
                                                        meta: TAG_PAYLOAD_INVALID,
                                                        args: [tagName, payload],
                                                        context: { entity: symbolId },
                                                }),
                                        ],
                                };
                        }

                        const [deleteAction, updateAction] = actions
                                ? actions.split(':')
                                : [undefined, undefined];
                        const onDelete = parseAction(deleteAction);
                        const onUpdate = parseAction(updateAction);

                        return {
                                ok: true,
                                value: {
                                        tag: 'fk',
                                        target,
                                        field,
                                        ...(onDelete && { onDelete }),
                                        ...(onUpdate && { onUpdate }),
                                },
                        };
                }

                case CORE_TAGS.DEFAULT:
                        return { ok: true, value: { tag: 'default', value: payload } };

                case CORE_TAGS.RENAME_FROM: {
                        const [oldName, version] = payload.split('@');
                        return {
                                ok: true,
                                value: {
                                        tag: 'renameFrom',
                                        oldName: oldName!,
                                        version: version?.trim(),
                                },
                        };
                }

                case CORE_TAGS.SQL_TYPE:
                        return { ok: true, value: { tag: 'sqlType', type: payload } };

                case CORE_TAGS.DECIMAL: {
                        const [precision, scale] = payload.split(',').map(Number);
                        return {
                                ok: true,
                                value: { tag: 'decimal', precision: precision!, scale: scale! },
                        };
                }

                case CORE_TAGS.CHECK:
                        return { ok: true, value: { tag: 'check', expression: payload } };

                case CORE_TAGS.VERSION:
                        return { ok: true, value: { tag: 'version', semver: payload } };

                case CORE_TAGS.MIN:
                        return { ok: true, value: { tag: 'min', value: Number(payload) } };

                case CORE_TAGS.MAX:
                        return { ok: true, value: { tag: 'max', value: Number(payload) } };

                case CORE_TAGS.INT:
                        return { ok: true, value: { tag: 'int' } };

                case CORE_TAGS.MIN_LENGTH:
                        return { ok: true, value: { tag: 'minLength', value: Number(payload) } };

                case CORE_TAGS.MAX_LENGTH:
                        return { ok: true, value: { tag: 'maxLength', value: Number(payload) } };

                case CORE_TAGS.PATTERN:
                case CORE_TAGS.REGEX:
                        return { ok: true, value: { tag: 'pattern', pattern: payload } };

                case CORE_TAGS.FORMAT:
                        return { ok: true, value: { tag: 'format', format: payload } };

                case CORE_TAGS.EMAIL:
                        return { ok: true, value: { tag: 'email' } };

                case CORE_TAGS.UUID:
                        return { ok: true, value: { tag: 'uuid' } };

                case CORE_TAGS.URL:
                        return { ok: true, value: { tag: 'url' } };

                case CORE_TAGS.DESCRIPTION:
                        return { ok: true, value: { tag: 'description', text: payload } };

                case CORE_TAGS.VALIDATOR:
                        return { ok: true, value: { tag: 'validator', name: payload } };

                case CORE_TAGS.TRANSFORM:
                        return { ok: true, value: { tag: 'transform', name: payload } };

                default:
                        return {
                                ok: false,
                                diagnostics: [
                                        makeDiagnostic({
                                                meta: TAG_MALFORMED,
                                                args: [tagName],
                                                context: { entity: symbolId },
                                        }),
                                ],
                        };
        }
}

function parseAction(action: string | undefined): Action | undefined {
        if (!action) return undefined;
        const normalized = action.toLowerCase().trim();
        switch (normalized) {
                case 'cascade':
                        return 'cascade';
                case 'restrict':
                        return 'restrict';
                case 'setnull':
                case 'set null':
                        return 'set null';
                case 'noaction':
                case 'no action':
                default:
                        return 'no action';
        }
}

Object.freeze(DEFAULT_RESOLVE_TAGS);
Object.freeze(parseJsDocAnnotations);
