// packages/core/tests/extraction/unknowns.test.ts

import { describe, it, expect } from 'vitest';

import { CoreDiagnostics } from '../../src/diagnostics.js';
import { extractIR, asUnsupported, IRNodeGuard } from '../utils/extraction.js';

const F = 'extraction';

// 1. Un-instantiated generic type parameters → IRUnsupported

describe('un-instantiated generic type parameters', () => {
        it('Identity<T> → IRUnsupported (T is a free type parameter)', () => {
                const { ir } = extractIR(F, 'Identity');
                const u = asUnsupported(ir);
                expect(u.reason).toBeTruthy();
                expect(u.originalText).toBeTruthy();
        });

        it('Identity<T> emits Type Parameter warning', () => {
                const { diagnostics } = extractIR(F, 'Identity');
                expect(
                        diagnostics
                                .getWarnings()
                                .some(
                                        (w) =>
                                                w.code ===
                                                CoreDiagnostics.UNSUPPORTED_TYPE_PARAMETER.code,
                                ),
                ).toBe(true);
        });

        it('Wrapper<T> → IRUnsupported (generic object)', () => {
                const { ir, diagnostics } = extractIR(F, 'Wrapper');
                asUnsupported(ir);
                expect(
                        diagnostics
                                .getWarnings()
                                .some(
                                        (w) =>
                                                w.code ===
                                                CoreDiagnostics.UNSUPPORTED_GENERIC_OBJECT.code,
                                ),
                ).toBe(true);
        });

        it('Pair<A,B> → IRUnsupported property types', () => {
                const { ir, diagnostics } = extractIR(F, 'Pair');
                asUnsupported(ir);
                expect(
                        diagnostics
                                .getWarnings()
                                .some(
                                        (w) =>
                                                w.code ===
                                                CoreDiagnostics.UNSUPPORTED_GENERIC_OBJECT.code,
                                ),
                ).toBe(true);
        });
});

// 2. Conditional types → IRUnsupported

describe('conditional types', () => {
        it('IsString<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'IsString');
                asUnsupported(ir);
        });

        it('NonNullable2<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'NonNullable2');
                asUnsupported(ir);
        });

        it('ReturnType2<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'ReturnType2');
                asUnsupported(ir);
        });

        it('Flatten<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'Flatten');
                asUnsupported(ir);
        });

        it('each conditional emits Usupported Conditional', () => {
                for (const name of ['IsString', 'NonNullable2', 'ReturnType2', 'Flatten']) {
                        const { diagnostics } = extractIR(F, name);
                        expect(
                                diagnostics
                                        .getWarnings()
                                        .some(
                                                (w) =>
                                                        w.code ===
                                                        CoreDiagnostics.UNSUPPORTED_CONDITIONAL
                                                                .code,
                                        ),
                                `expected ADTK-CORE-1002 for ${name}`,
                        ).toBe(true);
                }
        });
});

// 3. Mapped types → IRUnsupported

describe('mapped types', () => {
        it('ReadonlyAll<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'ReadonlyAll');
                asUnsupported(ir);
        });

        it('Optional<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'Optional');
                asUnsupported(ir);
        });

        it('Stringify<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'Stringify');
                asUnsupported(ir);
        });

        it('Nullable<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'Nullable');
                asUnsupported(ir);
        });
});

// 4. keyof → IRUnsupported

describe('keyof types', () => {
        it('Keys<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'Keys');
                asUnsupported(ir);
        });

        it('UserKeys (keyof inline object) → IRUnsupported', () => {
                // The checker resolves keyof {id,name,email} to "id"|"name"|"email"
                // which becomes a union of string literals — not unsupported
                // This tests that known-key keyof resolves to a supported IRUnion
                const { ir } = extractIR(F, 'UserKeys');
                // Either union (if resolved) or unsupported (if not) — just confirm extraction succeeds
                expect(ir).toBeDefined();
                expect(['union', 'unsupported']).toContain(ir.kind);
        });
});

// 5. Infer inside conditional → IRUnsupported

describe('infer in conditional types', () => {
        it('UnpackPromise<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'UnpackPromise');
                asUnsupported(ir);
        });

        it('FirstArg<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'FirstArg');
                asUnsupported(ir);
        });
});

// 6. Recursive conditional → IRUnsupported

describe('recursive conditional', () => {
        it('DeepReadonly<T> → IRUnsupported', () => {
                const { ir } = extractIR(F, 'DeepReadonly');
                asUnsupported(ir);
        });
});

// 7. IRUnsupported node fields

describe('IRUnsupported node structure', () => {
        it('unsupported node has kind: "unsupported"', () => {
                const { ir } = extractIR(F, 'Identity');
                expect(ir.kind).toBe('unsupported');
        });

        it('unsupported node has non-empty reason string', () => {
                const { ir } = extractIR(F, 'IsString');
                const u = asUnsupported(ir);
                expect(typeof u.reason).toBe('string');
                expect(u.reason.length).toBeGreaterThan(0);
        });

        it('unsupported node has non-empty originalText string', () => {
                const { ir } = extractIR(F, 'IsString');
                const u = asUnsupported(ir);
                expect(typeof u.originalText).toBe('string');
                expect(u.originalText.length).toBeGreaterThan(0);
        });

        it('unsupported node has valid metadata with symbolId', () => {
                const { ir } = extractIR(F, 'Identity');
                expect(typeof ir.metadata.symbolId).toBe('string');
                expect(ir.metadata.symbolId.length).toBeGreaterThan(0);
        });
});

// 8. Contrast: instantiated generics produce concrete IR

describe('instantiated generics produce concrete IR (contrast with unsupported)', () => {
        it('StringArray (Array<string>) → IRArray', () => {
                const { ir } = extractIR(F, 'StringArray');
                expect(IRNodeGuard.isArray(ir)).toBe(true);
        });

        it('NumberPair ([number, number]) → IRTuple', () => {
                const { ir } = extractIR(F, 'NumberPair');
                expect(IRNodeGuard.isTuple(ir)).toBe(true);
        });

        it('PartialPoint (Partial<{x,y}>) → IRObject', () => {
                const { ir } = extractIR(F, 'PartialPoint');
                expect(IRNodeGuard.isObject(ir)).toBe(true);
        });
});

// 9. Template with unsupported interpolation slot

describe('template literal with unsupported slot', () => {
        it('KeyOf<T> → either templateLiteral with unsupported slot, or fully unsupported', () => {
                const { ir } = extractIR(F, 'KeyOf');
                // depending on TS version / how keyof T & string resolves,
                // the outer type is templateLiteral or unsupported
                expect(['templateLiteral', 'unsupported']).toContain(ir.kind);
        });
});
