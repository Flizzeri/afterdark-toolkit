// packages/core/tests/extraction/circulars.test.ts

import { describe, it, expect } from 'vitest';

import type { IRNode } from '@adtk/core';

import {
        extractIR,
        asObject,
        asRef,
        asArray,
        asUnion,
        getProp,
        IRNodeGuard,
} from '../utils/extraction.js';

const F = 'extraction';

// Helpers

/** Walk the IR tree looking for any IRRef node; returns true if found. */
function hasRef(ir: IRNode): boolean {
        if (IRNodeGuard.isRef(ir)) return true;
        if (IRNodeGuard.isObject(ir)) {
                return ir.properties.some((p) => hasRef(p.type));
        }
        if (IRNodeGuard.isArray(ir)) return hasRef(ir.element);
        if (IRNodeGuard.isUnion(ir)) return ir.members.some((m) => hasRef(m.type));
        if (IRNodeGuard.isIntersection(ir)) return ir.members.some((m) => hasRef(m.type));
        if (IRNodeGuard.isTuple(ir)) {
                return (
                        ir.elements.some((e) => hasRef(e.type)) ||
                        (ir.rest ? hasRef(ir.rest.type) : false)
                );
        }
        return false;
}

// 1. Direct self-reference

describe('direct self-reference', () => {
        it('TreeNode → produces at least one IRRef somewhere in the tree', () => {
                const { ir } = extractIR(F, 'TreeNode');
                expect(hasRef(ir)).toBe(true);
        });

        it('TreeNode extraction terminates (no infinite loop)', () => {
                // If this test completes, termination is proven
                const { ir } = extractIR(F, 'TreeNode');
                expect(ir.kind).toBe('object');
        });

        it('TreeNode.children → array whose element is IRRef back to TreeNode', () => {
                const { ir } = extractIR(F, 'TreeNode');
                const obj = asObject(ir);
                const children = getProp(obj, 'children');
                const arr = asArray(children.type);
                expect(IRNodeGuard.isRef(arr.element)).toBe(true);
        });

        it('JsonValue extraction terminates', () => {
                const { ir } = extractIR(F, 'JsonValue');
                expect(ir).toBeDefined();
        });
});

// 2. Mutual two-hop cycle

describe('mutual two-hop cycle (Employee ↔ Manager)', () => {
        it('Employee extraction produces IRRef for Manager', () => {
                const { ir } = extractIR(F, 'Employee');
                expect(hasRef(ir)).toBe(true);
        });

        it('Manager extraction produces IRRef for Employee', () => {
                const { ir } = extractIR(F, 'Manager');
                expect(hasRef(ir)).toBe(true);
        });

        it('Employee.manager optional property exists and is IRObject (Manager inlined)', () => {
                const { ir } = extractIR(F, 'Employee');
                const obj = asObject(ir);
                const mgr = getProp(obj, 'manager');
                expect(mgr.optional).toBe(true);
                // Manager is an interface — it gets fully inlined, not ref'd on first encounter
                expect(IRNodeGuard.isObject(mgr.type)).toBe(true);
        });

        it('Manager.reports array element is IRObject (Employee inlined)', () => {
                const { ir } = extractIR(F, 'Manager');
                const obj = asObject(ir);
                const reports = getProp(obj, 'reports');
                const arr = asArray(reports.type);
                // Employee is an interface — inlined on first encounter
                expect(IRNodeGuard.isObject(arr.element)).toBe(true);
        });
});

// 3. Three-hop cycle

describe('three-hop cycle (FileNode → DirectoryNode → RootNode → ...)', () => {
        it('FileNode extraction terminates', () => {
                const { ir } = extractIR(F, 'FileNode');
                expect(ir).toBeDefined();
        });

        it('DirectoryNode extraction terminates', () => {
                const { ir } = extractIR(F, 'DirectoryNode');
                expect(ir).toBeDefined();
        });

        it('FileNode or DirectoryNode contains at least one IRRef', () => {
                const { ir: file } = extractIR(F, 'FileNode');
                const { ir: dir } = extractIR(F, 'DirectoryNode');
                expect(hasRef(file) || hasRef(dir)).toBe(true);
        });
});

// 4. Self-referencing type alias

describe('self-referencing type alias', () => {
        it('NestedArray extraction terminates', () => {
                const { ir } = extractIR(F, 'NestedArray');
                expect(ir).toBeDefined();
        });

        it('NestedArray contains an IRRef somewhere', () => {
                const { ir } = extractIR(F, 'NestedArray');
                expect(hasRef(ir)).toBe(true);
        });
});

// 5. Cycle through a union

describe('cycle through union', () => {
        it('LinkedList extraction terminates', () => {
                const { ir } = extractIR(F, 'LinkedList');
                expect(ir).toBeDefined();
        });

        it('LinkedList.tail is a union containing an IRRef member', () => {
                const { ir } = extractIR(F, 'LinkedList');
                const obj = asObject(ir);
                const tail = getProp(obj, 'tail');
                const u = asUnion(tail.type);
                const hasRefMember = u.members.some((m) => IRNodeGuard.isRef(m.type));
                expect(hasRefMember).toBe(true);
        });
});

// 6. Cycle through an intersection

describe('cycle through intersection', () => {
        it('CyclicNode extraction terminates', () => {
                const { ir } = extractIR(F, 'CyclicNode');
                expect(ir).toBeDefined();
        });

        it('CyclicNode contains at least one IRRef', () => {
                const { ir } = extractIR(F, 'CyclicNode');
                expect(hasRef(ir)).toBe(true);
        });
});

// 7. Mutual cycle via type aliases

describe('mutual cycle via type aliases (ExprA ↔ ExprB)', () => {
        it('ExprA extraction terminates', () => {
                const { ir } = extractIR(F, 'ExprA');
                expect(ir).toBeDefined();
        });

        it('ExprB extraction terminates', () => {
                const { ir } = extractIR(F, 'ExprB');
                expect(ir).toBeDefined();
        });

        it('ExprA produces IRRef for ExprB somewhere in the tree', () => {
                const { ir } = extractIR(F, 'ExprA');
                expect(hasRef(ir)).toBe(true);
        });
});

// 8. visited set cleaned up between extractions

describe('visited set is clean between independent extractions', () => {
        it('extracting Category twice produces identical ir.kind', () => {
                const { ir: first } = extractIR(F, 'Category');
                const { ir: second } = extractIR(F, 'Category');
                expect(first.kind).toBe(second.kind);
        });

        it('Category self-references produce IRRef nodes', () => {
                const { ir } = extractIR(F, 'Category');
                expect(hasRef(ir)).toBe(true);
        });

        it('Category.parent is optional and is IRRef', () => {
                const { ir } = extractIR(F, 'Category');
                const obj = asObject(ir);
                const parent = getProp(obj, 'parent');
                expect(parent.optional).toBe(true);
                expect(IRNodeGuard.isRef(parent.type)).toBe(true);
        });
});

// 9. IRRef target matches expected symbol

describe('IRRef target correctness', () => {
        it('TreeNode.children element IRRef.target includes "TreeNode"', () => {
                const { ir } = extractIR(F, 'TreeNode');
                const obj = asObject(ir);
                const children = getProp(obj, 'children');
                const arr = asArray(children.type);
                const ref = asRef(arr.element);
                expect(ref.target).toContain('TreeNode');
        });
});
