// packages/core/src/extraction/intersection.ts

import { ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRIntersection, IRIntersectionMember } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { extractMetadata } from '../metadata';

export function extractIntersection(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRIntersection, ExtractionError> {
        if (!isIntersectionType(type) && !ts.isIntersectionTypeNode(node)) {
                return err({
                        type: 'internal-error',
                        message: 'extractIntersection called on non-intersection type',
                });
        }

        const intersectionType = type as ts.IntersectionType;
        const members: IRIntersectionMember[] = [];

        // CRITICAL: Check if we have an intersection type node to extract from
        // This preserves the structure as written in source
        if (ts.isIntersectionTypeNode(node)) {
                // Extract from AST nodes to preserve source structure
                for (const typeNode of node.types) {
                        const memberType = context.checker.getTypeAtLocation(typeNode);
                        const memberResult = context.extractType(memberType, typeNode);

                        if (!memberResult.ok) {
                                return memberResult;
                        }

                        members.push({
                                type: memberResult.value,
                                span: context.sourceFile.getSpan(typeNode),
                        });
                }
        } else {
                // Fallback: extract from resolved intersection types
                for (const memberType of intersectionType.types) {
                        const memberResult = context.extractType(memberType, node);

                        if (!memberResult.ok) {
                                return memberResult;
                        }

                        members.push({
                                type: memberResult.value,
                                span: context.sourceFile.getSpan(node),
                        });
                }
        }

        if (members.length === 0) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.addError(
                        'ADTK-CORE-0400',
                        'Intersection type has no members',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Intersection type '${typeText}' contains no members`,
                                        issue: 'Intersection types must have at least one member',
                                },
                        ],
                        {
                                description:
                                        'An intersection type with no members cannot be represented.',
                                notes: [
                                        'This is likely an internal error in TypeScript type construction',
                                        'Intersection types are created with syntax: T & U & V',
                                        `Found type: ${typeText}`,
                                ],
                        },
                );

                return err({
                        type: 'unsupported-type',
                        reason: 'Empty intersection',
                        typeText,
                });
        }

        if (members.length === 1) {
                const typeText = context.checker.typeToString(type);

                context.diagnostics.addWarning(
                        'ADTK-CORE-0401',
                        'Intersection type has only one member',
                        [
                                {
                                        span: context.sourceFile.getSpan(node),
                                        message: `Intersection type '${typeText}' contains only one member`,
                                        issue: 'Single-member intersections are redundant',
                                        help: 'Remove the intersection and use the member type directly',
                                },
                        ],
                        {
                                description:
                                        'An intersection with a single member is equivalent to that member type.',
                                notes: [
                                        'Single-member intersections may indicate a type simplification opportunity',
                                        'The IR will still represent this as an intersection for accuracy',
                                        `Member type: ${context.checker.typeToString(intersectionType.types[0])}`,
                                ],
                        },
                );
        }

        const metadata = extractMetadata(
                type,
                node,
                context.sourceFile,
                context,
                'intersection',
                context.checker.typeToString(type),
        );

        return ok({
                kind: 'intersection',
                members,
                metadata,
        });
}

export function isIntersectionType(type: ts.Type): boolean {
        return !!(type.flags & ts.TypeFlags.Intersection);
}
