// packages/core/src/ir/guards.test.ts

import { symbolId, createSpan, filePath } from '@adtk/shared';
import { describe, it, expect } from 'vitest';

import { IRNodeGuard } from './guards.js';
import type { IRNode } from './types.js';
import type { IRMetadata } from '../metadata';

function createTestMetadata(): IRMetadata {
        const file = filePath('/test/file.ts');
        if (!file.ok) throw new Error('Test setup failed');

        return {
                symbolId: symbolId('Test#test.ts#abc123'),
                span: createSpan(
                        file.value,
                        { line: 1, column: 1, offset: 0 },
                        { line: 1, column: 10, offset: 9 },
                ),
                annotations: [],
        };
}

describe('IRNodeGuard type guards', () => {
        const metadata = createTestMetadata();

        it('identifies primitive nodes', () => {
                const node: IRNode = {
                        kind: 'primitive',
                        primitiveKind: 'string',
                        metadata,
                };

                expect(IRNodeGuard.isPrimitive(node)).toBe(true);
                expect(IRNodeGuard.isLiteral(node)).toBe(false);
                expect(IRNodeGuard.isArray(node)).toBe(false);

                if (IRNodeGuard.isPrimitive(node)) {
                        expect(node.primitiveKind).toBe('string');
                }
        });

        it('identifies literal nodes', () => {
                const node: IRNode = {
                        kind: 'literal',
                        literalKind: 'string',
                        value: 'hello',
                        metadata,
                };

                expect(IRNodeGuard.isLiteral(node)).toBe(true);
                expect(IRNodeGuard.isPrimitive(node)).toBe(false);

                if (IRNodeGuard.isLiteral(node)) {
                        expect(node.value).toBe('hello');
                }
        });

        it('identifies array nodes', () => {
                const element: IRNode = {
                        kind: 'primitive',
                        primitiveKind: 'string',
                        metadata,
                };

                const node: IRNode = {
                        kind: 'array',
                        element,
                        metadata,
                };

                expect(IRNodeGuard.isArray(node)).toBe(true);
                expect(IRNodeGuard.isPrimitive(node)).toBe(false);

                if (IRNodeGuard.isArray(node)) {
                        expect(IRNodeGuard.isPrimitive(node.element)).toBe(true);
                }
        });

        it('identifies tuple nodes', () => {
                const file = filePath('/test/file.ts');
                if (!file.ok) throw new Error('Test setup failed');

                const span = createSpan(
                        file.value,
                        { line: 1, column: 1, offset: 0 },
                        { line: 1, column: 5, offset: 4 },
                );

                const node: IRNode = {
                        kind: 'tuple',
                        elements: [
                                {
                                        type: {
                                                kind: 'primitive',
                                                primitiveKind: 'string',
                                                metadata,
                                        },
                                        optional: false,
                                        span,
                                },
                        ],
                        metadata,
                };

                expect(IRNodeGuard.isTuple(node)).toBe(true);

                if (IRNodeGuard.isTuple(node)) {
                        expect(node.elements.length).toBe(1);
                }
        });

        it('identifies object nodes', () => {
                const node: IRNode = {
                        kind: 'object',
                        properties: [],
                        metadata,
                };

                expect(IRNodeGuard.isObject(node)).toBe(true);

                if (IRNodeGuard.isObject(node)) {
                        expect(node.properties).toEqual([]);
                }
        });

        it('identifies template literal nodes', () => {
                const node: IRNode = {
                        kind: 'templateLiteral',
                        parts: [{ kind: 'text', value: 'hello' }],
                        metadata,
                };

                expect(IRNodeGuard.isTemplateLiteral(node)).toBe(true);

                if (IRNodeGuard.isTemplateLiteral(node)) {
                        expect(node.parts.length).toBe(1);
                }
        });

        it('identifies union nodes', () => {
                const file = filePath('/test/file.ts');
                if (!file.ok) throw new Error('Test setup failed');

                const span = createSpan(
                        file.value,
                        { line: 1, column: 1, offset: 0 },
                        { line: 1, column: 5, offset: 4 },
                );

                const node: IRNode = {
                        kind: 'union',
                        members: [
                                {
                                        type: {
                                                kind: 'primitive',
                                                primitiveKind: 'string',
                                                metadata,
                                        },
                                        span,
                                },
                        ],
                        metadata,
                };

                expect(IRNodeGuard.isUnion(node)).toBe(true);

                if (IRNodeGuard.isUnion(node)) {
                        expect(node.members.length).toBe(1);
                }
        });

        it('identifies intersection nodes', () => {
                const file = filePath('/test/file.ts');
                if (!file.ok) throw new Error('Test setup failed');

                const span = createSpan(
                        file.value,
                        { line: 1, column: 1, offset: 0 },
                        { line: 1, column: 5, offset: 4 },
                );

                const node: IRNode = {
                        kind: 'intersection',
                        members: [
                                {
                                        type: {
                                                kind: 'primitive',
                                                primitiveKind: 'string',
                                                metadata,
                                        },
                                        span,
                                },
                        ],
                        metadata,
                };

                expect(IRNodeGuard.isIntersection(node)).toBe(true);

                if (IRNodeGuard.isIntersection(node)) {
                        expect(node.members.length).toBe(1);
                }
        });

        it('identifies reference nodes', () => {
                const node: IRNode = {
                        kind: 'ref',
                        target: symbolId('User#types.ts#abc123'),
                        metadata,
                };

                expect(IRNodeGuard.isRef(node)).toBe(true);

                if (IRNodeGuard.isRef(node)) {
                        expect(node.target).toBe('User#types.ts#abc123');
                }
        });

        it('identifies unsupported nodes', () => {
                const node: IRNode = {
                        kind: 'unsupported',
                        reason: 'Conditional types not supported',
                        originalText: 'T extends U ? V : W',
                        metadata,
                };

                expect(IRNodeGuard.isUnsupported(node)).toBe(true);

                if (IRNodeGuard.isUnsupported(node)) {
                        expect(node.reason).toContain('Conditional');
                }
        });
});
