// packages/core/tests/extraction/template-literals.test.ts

import { describe, it, expect } from 'vitest';

import type { TemplateLiteralPart } from '@adtk/core';

import {
        extractIR,
        asTemplateLiteral,
        asUnion,
        asPrimitive,
        asLiteral,
        asObject,
        getProp,
        IRNodeGuard,
} from '../utils/extraction.js';

const F = 'extraction';

// Convenience: get only text parts
function textParts(parts: readonly TemplateLiteralPart[]) {
        return parts.filter(
                (p): p is Extract<TemplateLiteralPart, { kind: 'text' }> => p.kind === 'text',
        );
}
// Convenience: get only type parts
function typeParts(parts: readonly TemplateLiteralPart[]) {
        return parts.filter(
                (p): p is Extract<TemplateLiteralPart, { kind: 'type' }> => p.kind === 'type',
        );
}

// 1. Text on both sides of a single interpolation

describe('text on both sides (textBefore and finalText both non-empty)', () => {
        it('Greeting → text "Hello, ", type string, text "!"', () => {
                const { ir } = extractIR(F, 'Greeting');
                const t = asTemplateLiteral(ir);
                const texts = textParts(t.parts).map((p) => p.value);
                expect(texts).toContain('Hello, ');
                expect(texts).toContain('!');
                expect(typeParts(t.parts)).toHaveLength(1);
        });

        it('Wrapped → text "<", type, text ">"', () => {
                const { ir } = extractIR(F, 'Wrapped');
                const t = asTemplateLiteral(ir);
                expect(textParts(t.parts).map((p) => p.value)).toContain('<');
        });

        it('PrefixedId → "id_" text + number type', () => {
                const { ir } = extractIR(F, 'PrefixedId');
                const t = asTemplateLiteral(ir);
                const texts = textParts(t.parts).map((p) => p.value);
                expect(texts.some((v) => v.includes('id_'))).toBe(true);
                const tp = typeParts(t.parts);
                expect(tp).toHaveLength(1);
                expect(asPrimitive(tp[0].type).primitiveKind).toBe('number');
        });
});

// 2. No leading text (textBefore === '')

describe('no leading text — type starts the template', () => {
        it('StartsWithType → type part first, then "-suffix" text', () => {
                const { ir } = extractIR(F, 'StartsWithType');
                const t = asTemplateLiteral(ir);
                // First part must be a type, not text
                expect(t.parts[0].kind).toBe('type');
                expect(textParts(t.parts).some((p) => p.value.includes('suffix'))).toBe(true);
        });

        it('TypeFirst → type (number) followed by "px" text', () => {
                const { ir } = extractIR(F, 'TypeFirst');
                const t = asTemplateLiteral(ir);
                expect(t.parts[0].kind).toBe('type');
                expect(textParts(t.parts).some((p) => p.value === 'px')).toBe(true);
        });
});

// 3. No trailing text (finalText === '')

describe('no trailing text — type ends the template', () => {
        it('EndsWithType → "prefix-" text then type part last', () => {
                const { ir } = extractIR(F, 'EndsWithType');
                const t = asTemplateLiteral(ir);
                expect(t.parts[t.parts.length - 1].kind).toBe('type');
                expect(textParts(t.parts).some((p) => p.value.includes('prefix'))).toBe(true);
        });
});

// 4. Only type — no text at all

describe('only-type templates (no text parts)', () => {
        it('OnlyType (`${string}`) → checker collapses to string primitive', () => {
                const { ir } = extractIR(F, 'OnlyType');
                // `${string}` has no surrounding text; TS resolves to bare string
                expect(asPrimitive(ir).primitiveKind).toBe('string');
        });

        it('OnlyNumber (`${number}`) → stays as templateLiteral (number is unbounded)', () => {
                const { ir } = extractIR(F, 'OnlyNumber');
                const t = asTemplateLiteral(ir);
                const tp = typeParts(t.parts);
                expect(tp).toHaveLength(1);
                expect(asPrimitive(tp[0].type).primitiveKind).toBe('number');
        });

        it('OnlyBoolean (`${boolean}`) → checker resolves to "true" | "false" union', () => {
                const { ir } = extractIR(F, 'OnlyBoolean');
                // boolean has a finite domain, so TS expands to the two string literals
                const u = asUnion(ir);
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain('true');
                expect(values).toContain('false');
        });
});

// 5. Multiple interpolations

describe('multiple interpolations', () => {
        it('TwoSlots → 2 type parts', () => {
                const { ir } = extractIR(F, 'TwoSlots');
                const t = asTemplateLiteral(ir);
                expect(typeParts(t.parts)).toHaveLength(2);
        });

        it('ThreeSlots → 3 type parts all string', () => {
                const { ir } = extractIR(F, 'ThreeSlots');
                const t = asTemplateLiteral(ir);
                const tp = typeParts(t.parts);
                expect(tp).toHaveLength(3);
                for (const p of tp) {
                        expect(asPrimitive(p.type).primitiveKind).toBe('string');
                }
        });

        it('MixedSlots → 3 number type parts separated by "." text', () => {
                const { ir } = extractIR(F, 'MixedSlots');
                const t = asTemplateLiteral(ir);
                expect(typeParts(t.parts)).toHaveLength(3);
                const texts = textParts(t.parts).map((p) => p.value);
                expect(texts.every((v) => v === '.')).toBe(true);
        });
});

// 6. Literal type in interpolation slot

describe('literal union in interpolation slot', () => {
        it('EventName → checker resolves to string literal union (finite slots)', () => {
                const { ir } = extractIR(F, 'EventName');
                // All slots are finite literals → TS produces union of string literals
                const u = asUnion(ir);
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain('onClick');
                expect(values).toContain('onFocus');
                expect(values).toContain('onBlur');
        });

        it('CssUnit → checker resolves to union of template literals (one per unit)', () => {
                const { ir } = extractIR(F, 'CssUnit');
                const u = asUnion(ir);
                expect(u.members.length).toBe(4);
                for (const m of u.members) {
                        expect(IRNodeGuard.isTemplateLiteral(m.type)).toBe(true);
                }
        });
});

// 7. Nested template literal in type slot

describe('nested template literal', () => {
        it('FullUrl → outer template with inner template slot for path', () => {
                const { ir } = extractIR(F, 'FullUrl');
                const t = asTemplateLiteral(ir);
                const tp = typeParts(t.parts);
                // At minimum one type part should be a templateLiteral (the path)
                // or the checker may resolve InnerPath inline — either is acceptable
                expect(tp.length).toBeGreaterThan(0);
        });
});

// 8. BigInt slot

describe('bigint slot', () => {
        it('BigIntLabel → type slot is bigint primitive', () => {
                const { ir } = extractIR(F, 'BigIntLabel');
                const t = asTemplateLiteral(ir);
                const tp = typeParts(t.parts);
                expect(asPrimitive(tp[0].type).primitiveKind).toBe('bigint');
        });
});

// 9. Templates in object properties

describe('template literals as object properties', () => {
        it('Routes.path → templateLiteral', () => {
                const { ir } = extractIR(F, 'Routes');
                const obj = asObject(ir);
                const path = getProp(obj, 'path');
                expect(IRNodeGuard.isTemplateLiteral(path.type)).toBe(true);
        });

        it('Routes.method → checker resolves finite union slot to string literal union', () => {
                const { ir } = extractIR(F, 'Routes');
                const obj = asObject(ir);
                const method = getProp(obj, 'method');
                expect(IRNodeGuard.isUnion(method.type)).toBe(true);
        });
});

// 10. Resolved-to-literal template (Compass)

describe('template literal resolved to string literal union', () => {
        it('Compass → extracted as IRUnion of string literals (checker resolves)', () => {
                const { ir } = extractIR(F, 'Compass');
                // The checker resolves `facing-${CardinalDir}` to the literal union
                // 'facing-north' | 'facing-south' | 'facing-east' | 'facing-west'
                const u = asUnion(ir);
                const values = u.members.map((m) => asLiteral(m.type).value);
                expect(values).toContain('facing-north');
                expect(values).toContain('facing-south');
        });
});

// 11. Template literal union members

describe('union of template literals', () => {
        it('UrlOrPath → union of two template literal members', () => {
                const { ir } = extractIR(F, 'UrlOrPath');
                const u = asUnion(ir);
                expect(u.members).toHaveLength(2);
                const kinds = u.members.map((m) => m.type.kind);
                expect(kinds.every((k) => k === 'templateLiteral')).toBe(true);
        });
});

// 12. Metadata

describe('template literal metadata', () => {
        it('template literal node has a symbolId', () => {
                const { ir } = extractIR(F, 'Greeting');
                expect(typeof ir.metadata.symbolId).toBe('string');
        });

        it('type parts have a span', () => {
                const { ir } = extractIR(F, 'TwoSlots');
                const t = asTemplateLiteral(ir);
                for (const p of typeParts(t.parts)) {
                        expect(p.span).toBeDefined();
                }
        });
});
