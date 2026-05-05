// packages/core/tests/extraction/intersections.test.ts

import { describe, it, expect } from 'vitest';

import { CoreDiagnostics } from '../../src/diagnostics.js';
import { extractIR, asIntersection, asObject, getProp, IRNodeGuard } from '../utils/extraction.js';

const F = 'extraction';

// 1. Basic two-member intersections

describe('basic intersections', () => {
        it('WithId → 2-member intersection, both members are objects', () => {
                const { ir } = extractIR(F, 'WithId');
                const ix = asIntersection(ir);
                expect(ix.members).toHaveLength(2);
                for (const m of ix.members) {
                        expect(IRNodeGuard.isObject(m.type)).toBe(true);
                }
        });

        it('WithTimestamps → 3-member intersection', () => {
                const { ir } = extractIR(F, 'WithTimestamps');
                const ix = asIntersection(ir);
                expect(ix.members).toHaveLength(3);
        });

        it('each member has a span', () => {
                const { ir } = extractIR(F, 'WithId');
                const ix = asIntersection(ir);
                for (const m of ix.members) {
                        expect(m.span).toBeDefined();
                }
        });
});

// 2. Inline object literal members

describe('inline object literal intersection members', () => {
        it('Identified → 2 inline object members with expected properties', () => {
                const { ir } = extractIR(F, 'Identified');
                const ix = asIntersection(ir);
                expect(ix.members).toHaveLength(2);
                const allProps = ix.members.flatMap((m) =>
                        asObject(m.type).properties.map((p) => p.name),
                );
                expect(allProps).toContain('id');
                expect(allProps).toContain('label');
        });

        it('ThreeProperties → 3 inline members', () => {
                const { ir } = extractIR(F, 'ThreeProperties');
                const ix = asIntersection(ir);
                expect(ix.members).toHaveLength(3);
        });
});

// 3. Named interface & inline literal mix

describe('named + inline intersection', () => {
        it('AdminUser → 2 members: HasId object and inline object', () => {
                const { ir } = extractIR(F, 'AdminUser');
                const ix = asIntersection(ir);
                expect(ix.members).toHaveLength(2);
        });

        it('AdminUser second member contains role and permissions properties', () => {
                const { ir } = extractIR(F, 'AdminUser');
                const ix = asIntersection(ir);
                // second member is the inline { role: 'admin'; permissions: string[] }
                const inlineMember = asObject(ix.members[1].type);
                const propNames = inlineMember.properties.map((p) => p.name);
                expect(propNames).toContain('role');
                expect(propNames).toContain('permissions');
        });
});

// 4. Resolved intersection as flat object (MergedEntity via interface extends)

describe('resolved intersection as object', () => {
        it('MergedEntity → extracted as IRObject (checker merges the extends)', () => {
                const { ir } = extractIR(F, 'MergedEntity');
                // The checker resolves multi-extends to a flat object type
                expect(IRNodeGuard.isObject(ir)).toBe(true);
        });

        it('MergedEntity has properties from all extended interfaces', () => {
                const { ir } = extractIR(F, 'MergedEntity');
                const obj = asObject(ir);
                const names = obj.properties.map((p) => p.name);
                expect(names).toContain('id'); // from HasId
                expect(names).toContain('name'); // from HasName
                expect(names).toContain('createdAt'); // from HasTimestamps
                expect(names).toContain('updatedAt'); // from HasTimestamps
                expect(names).toContain('extra'); // own property
        });
});

// 5. Optional and readonly properties in intersection

describe('optional / readonly in intersection members', () => {
        it('OptionalIntersection second member has optional nickname property', () => {
                const { ir } = extractIR(F, 'OptionalIntersection');
                const ix = asIntersection(ir);
                const inlineMember = asObject(ix.members[1].type);
                const nickname = getProp(inlineMember, 'nickname');
                expect(nickname.optional).toBe(true);
        });

        it('ReadonlyIntersection second member has readonly tag property', () => {
                const { ir } = extractIR(F, 'ReadonlyIntersection');
                const ix = asIntersection(ir);
                const inlineMember = asObject(ix.members[1].type);
                const tag = getProp(inlineMember, 'tag');
                expect(tag.readonly).toBe(true);
        });
});

// 6. Intersection with array property

describe('intersection with array property', () => {
        it('WithTags second member has tags: string[] array property', () => {
                const { ir } = extractIR(F, 'WithTags');
                const ix = asIntersection(ir);
                const inlineMember = asObject(ix.members[1].type);
                const tags = getProp(inlineMember, 'tags');
                expect(IRNodeGuard.isArray(tags.type)).toBe(true);
        });
});

// 7. Nested intersection — alias referencing alias

describe('nested intersection (alias chain)', () => {
        it('Extended → intersection where first member is the Base intersection', () => {
                const { ir } = extractIR(F, 'Extended');
                // AST sees: Base & HasTimestamps
                // Base is a TypeReferenceNode → gets redirect → its IntersectionTypeNode
                const ix = asIntersection(ir);
                expect(ix.members).toHaveLength(2);
        });
});

// 8. Intersection with union member

describe('intersection with union member', () => {
        it('WithStatus second member has status property that is a union', () => {
                const { ir } = extractIR(F, 'WithStatus');
                const ix = asIntersection(ir);
                const inlineMember = asObject(ix.members[1].type);
                const statusProp = getProp(inlineMember, 'status');
                expect(IRNodeGuard.isUnion(statusProp.type)).toBe(true);
        });
});

// 9. Function-type property (not method signature) — valid path

describe('function type properties in intersection', () => {
        it('CallableWithId extracts with error', () => {
                const { ir, diagnostics } = extractIR(F, 'CallableWithId');
                expect(
                        diagnostics
                                .getErrors()
                                .some(
                                        (e) =>
                                                e.code ===
                                                CoreDiagnostics.OBJECT_METHOD_NOT_SUPPORTED.code,
                                ),
                ).toBe(true);
                // checker resolves & HasId & Callable into a flat object
                expect(IRNodeGuard.isObject(ir) || IRNodeGuard.isIntersection(ir)).toBe(true);
        });
});

// 10. Intersection metadata

describe('intersection metadata', () => {
        it('intersection node has a non-empty symbolId', () => {
                const { ir } = extractIR(F, 'WithId');
                expect(typeof ir.metadata.symbolId).toBe('string');
                expect(ir.metadata.symbolId.length).toBeGreaterThan(0);
        });
});
