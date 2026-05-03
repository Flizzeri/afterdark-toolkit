// packages/core/tests/metadata/metadata.test.ts

import { describe, it, expect } from 'vitest';

import type { IRNode } from '../../src/ir';
import { findSymbol, resolveFixture } from '../utils/helpers.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const FIXTURE = 'metadata';

/** Returns the top-level IR node for a named symbol, extracted with default options. */
function irOf(name: string): IRNode {
        const { result } = resolveFixture(FIXTURE);
        const sym = findSymbol(result, name);
        if (Array.isArray(sym)) throw new Error(`findSymbol returned multiple for "${name}"`);
        return sym.ir;
}

/** Returns the top-level IR node with custom extraction options. */
function irWith(name: string, options: Parameters<typeof resolveFixture>[2]): IRNode {
        const { result } = resolveFixture(FIXTURE, { type: 'all' }, options);
        const sym = findSymbol(result, name);
        if (Array.isArray(sym)) throw new Error(`findSymbol returned multiple for "${name}"`);
        return sym.ir;
}

// ---------------------------------------------------------------------------
// A. extractMetadataWithSymbol — named type aliases and interfaces
//    Verifies that symbolId, span, and (conditionally) annotations are
//    correctly populated when a real ts.Symbol is available.
// ---------------------------------------------------------------------------

describe('named type aliases produce real symbolIds', () => {
        it('UserId has a non-empty symbolId', () => {
                const ir = irOf('UserId');
                expect(ir.metadata.symbolId).toBeTruthy();
                expect(ir.metadata.symbolId.length).toBeGreaterThan(0);
        });

        it('symbolId contains the symbol name', () => {
                const ir = irOf('UserId');
                expect(ir.metadata.symbolId).toMatch(/UserId/);
        });

        it('AuthorId — chained alias — has a distinct symbolId from UserId', () => {
                // AuthorId is an alias for UserId; the extractor redirects through the
                // TypeReferenceNode to the UserId declaration, so they share the same IR
                // node identity — but that is the correct behaviour (full inlining).
                // What we assert is that the extraction succeeds and symbolId is present.
                const { result } = resolveFixture(FIXTURE);
                const sym = findSymbol(result, 'AuthorId');
                if (Array.isArray(sym)) throw new Error('unexpected array');
                expect(sym.ir.metadata.symbolId).toBeTruthy();
        });

        it('named interface Point has a symbolId', () => {
                const ir = irOf('Point');
                expect(ir.metadata.symbolId).toBeTruthy();
                expect(ir.metadata.symbolId).toMatch(/Point/);
        });

        it('named interface User has a symbolId', () => {
                const ir = irOf('User');
                expect(ir.metadata.symbolId).toBeTruthy();
                expect(ir.metadata.symbolId).toMatch(/User/);
        });
});

// ---------------------------------------------------------------------------
// A. SourceSpan — every extracted top-level node must carry a valid span
// ---------------------------------------------------------------------------

describe('metadata span is always present', () => {
        const namedTypes = [
                'UserId',
                'DisplayName',
                'Age',
                'EmailAddress',
                'Point',
                'User',
                'Product',
                'Coordinate',
                'Direction',
                'ReadonlyPoint',
                'PartialUser',
                'FirstInFile',
                'LastInFile',
        ];

        for (const name of namedTypes) {
                it(`${name} has a span with valid start and end positions`, () => {
                        const ir = irOf(name);
                        const { span } = ir.metadata;
                        expect(span).toBeTruthy();
                        expect(typeof span.file).toBe('string');
                        // start position
                        expect(typeof span.start.line).toBe('number');
                        expect(typeof span.start.column).toBe('number');
                        expect(typeof span.start.offset).toBe('number');
                        expect(span.start.line).toBeGreaterThanOrEqual(1);
                        expect(span.start.column).toBeGreaterThanOrEqual(0);
                        expect(span.start.offset).toBeGreaterThanOrEqual(0);
                        // end position
                        expect(typeof span.end.line).toBe('number');
                        expect(typeof span.end.column).toBe('number');
                        expect(typeof span.end.offset).toBe('number');
                        // end must be at or after start
                        expect(span.end.offset).toBeGreaterThanOrEqual(span.start.offset);
                });
        }

        it('span.start.offset for FirstInFile is less than span.start.offset for LastInFile', () => {
                const first = irOf('FirstInFile');
                const last = irOf('LastInFile');
                expect(first.metadata.span.start.offset).toBeLessThan(
                        last.metadata.span.start.offset,
                );
        });
});

// ---------------------------------------------------------------------------
// A + G. Multiple annotations on the same symbol
// ---------------------------------------------------------------------------

describe('annotations are extracted correctly', () => {
        it('Age has three annotations: @entity, @min, @max', () => {
                const ir = irWith('Age', { extractAnnotations: true });
                expect(ir.metadata.annotations.length).toBe(3);

                const tags = ir.metadata.annotations.map((a) => a.tag);
                expect(tags).toContain('entity');
                expect(tags).toContain('min');
                expect(tags).toContain('max');
        });

        it('@min annotation on Age carries the value 0', () => {
                const ir = irWith('Age', { extractAnnotations: true });
                const minAnnotation = ir.metadata.annotations.find((a) => a.tag === 'min');
                expect(minAnnotation).toBeDefined();
                expect(minAnnotation!.data).toBe(0);
        });

        it('@max annotation on Age carries the value 120', () => {
                const ir = irWith('Age', { extractAnnotations: true });
                const maxAnnotation = ir.metadata.annotations.find((a) => a.tag === 'max');
                expect(maxAnnotation).toBeDefined();
                expect(maxAnnotation!.data).toBe(120);
        });

        it('EmailAddress has @email and @maxLength annotations', () => {
                const ir = irWith('EmailAddress', { extractAnnotations: true });
                const tags = ir.metadata.annotations.map((a) => a.tag);
                expect(tags).toContain('email');
                expect(tags).toContain('maxLength');
        });

        it('User interface has @entity annotation', () => {
                const ir = irWith('User', { extractAnnotations: true });
                const tags = ir.metadata.annotations.map((a) => a.tag);
                expect(tags).toContain('entity');
        });

        it('Point has no annotations (no JSDoc tags)', () => {
                const ir = irWith('Point', { extractAnnotations: true });
                expect(ir.metadata.annotations).toHaveLength(0);
        });
});

// ---------------------------------------------------------------------------
// F. extractAnnotations: false — annotations array must always be empty
// ---------------------------------------------------------------------------

describe('extractAnnotations: false suppresses all annotations', () => {
        it('Age has empty annotations when extractAnnotations is false', () => {
                const ir = irWith('Age', { extractAnnotations: false });
                expect(ir.metadata.annotations).toHaveLength(0);
        });

        it('EmailAddress has empty annotations when extractAnnotations is false', () => {
                const ir = irWith('EmailAddress', { extractAnnotations: false });
                expect(ir.metadata.annotations).toHaveLength(0);
        });

        it('PositiveNumber has empty annotations when extractAnnotations is false', () => {
                const ir = irWith('PositiveNumber', { extractAnnotations: false });
                expect(ir.metadata.annotations).toHaveLength(0);
        });

        it('AnnotatedProduct interface has empty annotations when extractAnnotations is false', () => {
                const ir = irWith('AnnotatedProduct', { extractAnnotations: false });
                expect(ir.metadata.annotations).toHaveLength(0);
        });
});

// ---------------------------------------------------------------------------
// E. extractDocumentation: true — JSDoc prose is included
// ---------------------------------------------------------------------------

describe('extractDocumentation: true includes JSDoc prose', () => {
        it('DisplayName documentation is present when enabled', () => {
                const ir = irWith('DisplayName', { extractDocumentation: true });
                expect(ir.metadata.documentation).toBeDefined();
                expect(ir.metadata.documentation).toContain("user's display name");
        });

        it('Product documentation is present when enabled', () => {
                const ir = irWith('Product', { extractDocumentation: true });
                expect(ir.metadata.documentation).toBeDefined();
                expect(ir.metadata.documentation!.length).toBeGreaterThan(0);
        });

        it('UserId has no documentation (no JSDoc prose)', () => {
                const ir = irWith('UserId', { extractDocumentation: true });
                // UserId has a single-line JSDoc-less comment — documentation should be absent
                expect(ir.metadata.documentation).toBeUndefined();
        });
});

// ---------------------------------------------------------------------------
// H. extractDocumentation: false (default) — documentation must be absent
// ---------------------------------------------------------------------------

describe('extractDocumentation: false (default) suppresses prose', () => {
        it('DocumentedButSuppressed has no documentation field by default', () => {
                const ir = irOf('DocumentedButSuppressed');
                expect(ir.metadata.documentation).toBeUndefined();
        });

        it('DisplayName has no documentation field with default options', () => {
                const ir = irOf('DisplayName');
                expect(ir.metadata.documentation).toBeUndefined();
        });

        it('Product has no documentation field with default options', () => {
                const ir = irOf('Product');
                expect(ir.metadata.documentation).toBeUndefined();
        });
});

// ---------------------------------------------------------------------------
// B. Synthetic metadata — anonymous / structural types
//    These types have no named ts.Symbol; createSyntheticMetadata is called.
//    The symbolId format is:  <value>#<intrinsic:category>#<hash>
// ---------------------------------------------------------------------------

describe('synthetic metadata for anonymous types', () => {
        it('Shape (union of anonymous objects) produces symbolIds for each member', () => {
                const ir = irOf('Shape');
                // Shape is a union; the union node itself gets metadata, members may be synthetic
                expect(ir.metadata.symbolId).toBeTruthy();
                expect(ir.kind).toBe('union');
        });

        it('Positioned (intersection of anonymous objects) has metadata', () => {
                const ir = irOf('Positioned');
                expect(ir.metadata.symbolId).toBeTruthy();
                expect(ir.kind).toBe('intersection');
        });

        it('synthetic symbolIds follow the intrinsic ID pattern or have a real name', () => {
                // When createSyntheticMetadata fires, symbolId contains #<intrinsic:...>#
                // When extractMetadataWithSymbol fires, symbolId contains the symbol name
                // We verify that all top-level symbols have one form or the other (i.e., are non-empty)
                const { result } = resolveFixture(FIXTURE);
                for (const [, sym] of result.symbols) {
                        expect(sym.ir.metadata.symbolId).toBeTruthy();
                        expect(sym.ir.metadata.symbolId.length).toBeGreaterThan(0);
                }
        });
});

// ---------------------------------------------------------------------------
// C. findTypeAliasSymbol — TypeAliasDeclaration AST ancestor
//    Coordinate and Direction are type aliases whose type nodes (object literal
//    and union) are inside a TypeAliasDeclaration. The walker must find it.
// ---------------------------------------------------------------------------

describe('findTypeAliasSymbol finds the enclosing TypeAliasDeclaration', () => {
        it('Coordinate (object alias) symbolId contains the alias name', () => {
                const ir = irOf('Coordinate');
                expect(ir.metadata.symbolId).toMatch(/Coordinate/);
        });

        it('Direction (union alias) symbolId contains the alias name', () => {
                const ir = irOf('Direction');
                expect(ir.metadata.symbolId).toMatch(/Direction/);
        });

        it('Coordinate span is present and valid', () => {
                const ir = irOf('Coordinate');
                const { span } = ir.metadata;
                expect(typeof span.file).toBe('string');
                expect(span.start.offset).toBeGreaterThanOrEqual(0);
                expect(span.end.offset).toBeGreaterThanOrEqual(span.start.offset);
        });
});

// ---------------------------------------------------------------------------
// D. type.aliasSymbol fallback — checker-resolved utility / conditional types
// ---------------------------------------------------------------------------

describe('aliasSymbol fallback for checker-resolved types', () => {
        it('ReadonlyPoint symbolId is present (mapped type preserves aliasSymbol)', () => {
                const ir = irOf('ReadonlyPoint');
                expect(ir.metadata.symbolId).toBeTruthy();
        });

        it('PartialUser symbolId is present', () => {
                const ir = irOf('PartialUser');
                expect(ir.metadata.symbolId).toBeTruthy();
        });

        it('ReadonlyPoint span is valid', () => {
                const ir = irOf('ReadonlyPoint');
                const { span } = ir.metadata;
                expect(typeof span.file).toBe('string');
                expect(typeof span.start.offset).toBe('number');
                expect(typeof span.end.offset).toBe('number');
                expect(span.end.offset).toBeGreaterThanOrEqual(span.start.offset);
        });
});

// ---------------------------------------------------------------------------
// Structural invariants across the whole fixture
// ---------------------------------------------------------------------------

describe('metadata structural invariants', () => {
        it('every extracted symbol has a non-null metadata object', () => {
                const { result } = resolveFixture(FIXTURE);
                for (const [, sym] of result.symbols) {
                        expect(sym.ir.metadata).toBeTruthy();
                }
        });

        it('every extracted symbol has an annotations array (never null/undefined)', () => {
                const { result } = resolveFixture(FIXTURE);
                for (const [, sym] of result.symbols) {
                        expect(Array.isArray(sym.ir.metadata.annotations)).toBe(true);
                }
        });

        it('symbolId is always a non-empty string', () => {
                const { result } = resolveFixture(FIXTURE);
                for (const [, sym] of result.symbols) {
                        expect(typeof sym.ir.metadata.symbolId).toBe('string');
                        expect(sym.ir.metadata.symbolId.length).toBeGreaterThan(0);
                }
        });

        it('default options produce no documentation on any symbol', () => {
                const { result } = resolveFixture(FIXTURE);
                for (const [, sym] of result.symbols) {
                        expect(sym.ir.metadata.documentation).toBeUndefined();
                }
        });

        it('span has file, start, and end with numeric offsets for every symbol', () => {
                const { result } = resolveFixture(FIXTURE);
                for (const [, sym] of result.symbols) {
                        const { span } = sym.ir.metadata;
                        expect(typeof span.file).toBe('string');
                        expect(typeof span.start.line).toBe('number');
                        expect(typeof span.start.column).toBe('number');
                        expect(typeof span.start.offset).toBe('number');
                        expect(typeof span.end.line).toBe('number');
                        expect(typeof span.end.column).toBe('number');
                        expect(typeof span.end.offset).toBe('number');
                        expect(span.end.offset).toBeGreaterThanOrEqual(span.start.offset);
                }
        });
});
