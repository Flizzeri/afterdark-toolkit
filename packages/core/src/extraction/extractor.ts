// packages/core/src/extraction/extractor.ts

import { generateSymbolId } from '@adtk/program';
import { ok, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRNode, IRRef } from '../ir';
import { extractArray, isArrayType } from './array.js';
import { extractIntersection, isIntersectionType } from './intersection.js';
import { extractLiteral, isLiteralType } from './literal.js';
import { extractObject, isObjectType } from './object.js';
import { extractPrimitive, isPrimitiveType } from './primitive.js';
import { isTemplateLiteralType, extractTemplateLiteral } from './template.js';
import { extractTuple, isTupleType } from './tuple.js';
import type { ExtractionContext, ExtractionError } from './types.js';
import { extractUnion, isUnionType, extractEnum, isEnumType } from './union.js';
import { extractMetadata } from '../metadata';
import {
        extractAbstractMapped,
        extractCallable,
        extractConditional,
        extractConstructable,
        extractGenericObject,
        extractIndex,
        extractIndexedAccess,
        extractSubstitution,
        extractTypeParameter,
        extractUnknownType,
        isAbstractMappedType,
        isCallableType,
        isConditionalType,
        isConstructableType,
        isGenericObjectType,
        isIndexType,
        isIndexedAccessType,
        isSubstitutionType,
        isTypeParameterType,
} from './unsupported';
import { isBuiltInSymbol } from '../utils/built-ins';

/**
 * Extracts IR from a TypeScript type.
 *
 * @remarks
 * This function fully inlines all type references except circular references,
 * which are represented as IRRef nodes to break cycles.
 *
 * Dispatch happens in three layers, in order:
 *
 * 1. TypeReferenceNode redirect — when the AST node is a reference to a
 *    user-defined type alias, we redirect to the alias declaration's type node.
 *    This preserves alias identity (and therefore JSDoc annotations) through
 *    the checker's aggressive normalization.
 *
 * 2. AST-node-shape dispatch — for structural combinators (union, intersection,
 *    tuple, array, parenthesized) we drive from the AST node shape rather than
 *    the checker's type flags. This preserves the structure as written in source,
 *    which the checker can collapse.
 *
 * 3. Checker-flag dispatch — for everything the AST cannot resolve on its own
 *    (instantiated generics, mapped types, conditional types, inferred types),
 *    we fall back to the checker's type flags.
 *
 * Syntactic dependencies are tracked separately via AST walking (dependencies.ts).
 */
export function extractType(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRNode, ExtractionError> {
        // Cycle detection: only reason to produce IRRef nodes
        const symbol = type.getSymbol() ?? type.aliasSymbol;

        if (symbol && !isBuiltInSymbol(symbol)) {
                const symbolId = generateSymbolId(symbol, context.diagnostics);

                if (context.visited.has(symbolId)) {
                        const metadata = extractMetadata(
                                type,
                                node,
                                context.sourceFile,
                                context,
                                'ref',
                                symbolId,
                        );

                        const ref: IRRef = {
                                kind: 'ref',
                                target: symbolId,
                                metadata,
                        };

                        return ok(ref);
                }

                context.visited.add(symbolId);
        }

        // TypeReferenceNode redirect
        if (ts.isTypeReferenceNode(node)) {
                const aliasSymbol = context.checker.getSymbolAtLocation(node.typeName);

                if (aliasSymbol && !isBuiltInSymbol(aliasSymbol)) {
                        const decl = aliasSymbol.declarations?.[0];

                        if (decl && ts.isTypeAliasDeclaration(decl)) {
                                const aliasedType =
                                        context.checker.getDeclaredTypeOfSymbol(aliasSymbol);

                                if (symbol) {
                                        // We unmark the current symbol before recursing so the recursive call can
                                        // re-mark it cleanly (avoids double-mark if type.symbol === aliasSymbol).

                                        context.visited.delete(
                                                generateSymbolId(symbol, context.diagnostics),
                                        );
                                }

                                return extractType(aliasedType, decl.type, context);
                        }
                }
        }

        // AST-node-shape dispatch
        const astResult = dispatchFromAstNode(type, node, context);
        if (astResult !== null) {
                if (symbol) {
                        context.visited.delete(generateSymbolId(symbol, context.diagnostics));
                }
                return astResult;
        }

        // Checker-flag dispatch
        const result = dispatchFromCheckerFlags(type, node, context);

        if (symbol) {
                context.visited.delete(generateSymbolId(symbol, context.diagnostics));
        }

        return result;
}

function dispatchFromAstNode(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRNode, ExtractionError> | null {
        if (ts.isUnionTypeNode(node)) {
                return extractUnion(type, node, context);
        }

        if (ts.isIntersectionTypeNode(node)) {
                return extractIntersection(type, node, context);
        }

        if (ts.isTupleTypeNode(node)) {
                return extractTuple(type, node, context);
        }

        // Parenthesized: `(A | B)` — just unwrap and recurse
        if (ts.isParenthesizedTypeNode(node)) {
                const innerType = context.checker.getTypeAtLocation(node.type);
                return extractType(innerType, node.type, context);
        }

        return null;
}

function dispatchFromCheckerFlags(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRNode, ExtractionError> {
        if (isPrimitiveType(type)) return extractPrimitive(type, node, context);

        if (isLiteralType(type)) return extractLiteral(type, node, context);

        if (isTemplateLiteralType(type)) return extractTemplateLiteral(type, node, context);

        if (isEnumType(type)) return extractEnum(type, node, context);

        if (isUnionType(type)) return extractUnion(type, node, context);

        if (isIntersectionType(type)) return extractIntersection(type, node, context);

        if (isTupleType(type, context)) return extractTuple(type, node, context);

        if (isArrayType(type, context)) return extractArray(type, node, context);

        if (isTypeParameterType(type)) return extractTypeParameter(type, node, context);

        if (isConditionalType(type)) return extractConditional(type, node, context);

        if (isIndexType(type)) return extractIndex(type, node, context);

        if (isIndexedAccessType(type)) return extractIndexedAccess(type, node, context);

        if (isSubstitutionType(type)) return extractSubstitution(type, node, context);

        if (isCallableType(type, context)) return extractCallable(type, node, context);

        if (isConstructableType(type, context)) return extractConstructable(type, node, context);

        if (isAbstractMappedType(type, context)) return extractAbstractMapped(type, node, context);

        if (isGenericObjectType(type, context)) return extractGenericObject(type, node, context);

        if (isObjectType(type)) return extractObject(type, node, context);

        return extractUnknownType(type, node, context);
}
