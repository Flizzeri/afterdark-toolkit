// packages/core/src/extraction/intersection.ts

import { ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { IRIntersection, IRIntersectionMember } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { CoreDiagnostics } from '../diagnostics';
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
                const span = context.sourceFile.getSpan(node);

                context.diagnostics.add(
                        CoreDiagnostics.INTERSECTION_NO_MEMBERS.new(span, typeText),
                );

                return err({
                        type: 'unsupported-type',
                        reason: 'Empty intersection',
                        typeText,
                });
        }

        if (members.length === 1) {
                const typeText = context.checker.typeToString(type);
                const span = context.sourceFile.getSpan(node);
                const memberTypeText = context.checker.typeToString(intersectionType.types[0]);

                context.diagnostics.add(
                        CoreDiagnostics.INTERSECTION_SINGLE_MEMBER.new(
                                span,
                                typeText,
                                memberTypeText,
                        ),
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
