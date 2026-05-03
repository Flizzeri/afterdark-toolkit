// packages/core/src/ir/guards.ts

import type {
        IRNode,
        IRPrimitive,
        IRLiteral,
        IRArray,
        IRTuple,
        IRObject,
        IRTemplateLiteral,
        IRUnion,
        IRIntersection,
        IRRef,
        IRUnsupported,
} from './types.js';

/**
 * Type guard functions for IR nodes.
 *
 * @remarks
 * These guards enable exhaustive pattern matching and type narrowing
 * when working with IR nodes. TypeScript can use these to refine the
 * type of an IRNode to a specific variant.
 */
export namespace IRNodeGuard {
        export function isPrimitive(node: IRNode): node is IRPrimitive {
                return node.kind === 'primitive';
        }

        export function isLiteral(node: IRNode): node is IRLiteral {
                return node.kind === 'literal';
        }

        export function isArray(node: IRNode): node is IRArray {
                return node.kind === 'array';
        }

        export function isTuple(node: IRNode): node is IRTuple {
                return node.kind === 'tuple';
        }

        export function isObject(node: IRNode): node is IRObject {
                return node.kind === 'object';
        }

        export function isTemplateLiteral(node: IRNode): node is IRTemplateLiteral {
                return node.kind === 'templateLiteral';
        }

        export function isUnion(node: IRNode): node is IRUnion {
                return node.kind === 'union';
        }

        export function isIntersection(node: IRNode): node is IRIntersection {
                return node.kind === 'intersection';
        }

        export function isRef(node: IRNode): node is IRRef {
                return node.kind === 'ref';
        }

        export function isUnsupported(node: IRNode): node is IRUnsupported {
                return node.kind === 'unsupported';
        }
}
