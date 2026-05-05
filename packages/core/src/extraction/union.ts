// packages/core/src/extraction/union.ts

import { ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import {
        IRNodeGuard,
        type IRUnion,
        type IRUnionMember,
        type DiscriminantHint,
        type LiteralValue,
} from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { CoreDiagnostics } from '../diagnostics';
import { extractMetadata } from '../metadata';

export function extractUnion(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnion, ExtractionError> {
        if (!isUnionType(type) && !ts.isUnionTypeNode(node)) {
                console.error('called on non-union type');
                return err({
                        type: 'internal-error',
                        message: 'extractUnion called on non-union type',
                });
        }

        const unionType = type as ts.UnionType;
        const members: IRUnionMember[] = [];

        // CRITICAL: Check if we have a union type node to extract from
        // This preserves the structure as written in source
        if (ts.isUnionTypeNode(node)) {
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
                // Fallback: extract from resolved union types
                // This happens when we can't get the AST node
                for (const memberType of unionType.types) {
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

                context.diagnostics.add(CoreDiagnostics.UNION_NO_MEMBERS.new(span, typeText));

                return err({
                        type: 'unsupported-type',
                        reason: 'Empty union',
                        typeText,
                });
        }

        if (members.length === 1) {
                const typeText = context.checker.typeToString(type);
                const span = context.sourceFile.getSpan(node);
                const memberTypeText = context.checker.typeToString(unionType.types[0]);

                context.diagnostics.add(
                        CoreDiagnostics.UNION_SINGLE_MEMBER.new(span, typeText, memberTypeText),
                );
        }

        const discriminant = detectDiscriminant(members);

        const metadata = extractMetadata(
                type,
                node,
                context.sourceFile,
                context,
                'union',
                context.checker.typeToString(type),
        );

        return ok({
                kind: 'union',
                members,
                ...(discriminant && { discriminant }),
                metadata,
        });
}

export function isUnionType(type: ts.Type): boolean {
        return !!(type.flags & ts.TypeFlags.Union);
}

export function isEnumType(type: ts.Type): boolean {
        const decl = type.getSymbol()?.declarations?.[0];
        return !!decl && ts.isEnumDeclaration(decl);
}

export function extractEnum(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRUnion, ExtractionError> {
        const symbol = type.getSymbol();
        if (!symbol) {
                return err({
                        type: 'internal-error',
                        message: 'extractEnum called on type with no symbol',
                });
        }

        const declaration = symbol.declarations?.[0];
        if (!declaration || !ts.isEnumDeclaration(declaration)) {
                return err({
                        type: 'internal-error',
                        message: 'extractEnum called on non-enum declaration',
                });
        }

        const members: IRUnionMember[] = [];

        for (const member of declaration.members) {
                const memberType = context.checker.getTypeAtLocation(member);
                const memberResult = context.extractType(memberType, member);

                if (!memberResult.ok) {
                        return memberResult;
                }

                members.push({
                        type: memberResult.value,
                        span: context.sourceFile.getSpan(member),
                });
        }

        if (members.length === 0) {
                return err({ type: 'internal-error', message: 'Enum has no members' });
        }

        const metadata = extractMetadata(
                type,
                node,
                context.sourceFile,
                context,
                'union',
                context.checker.typeToString(type),
        );

        return ok({
                kind: 'union',
                members,
                metadata,
        });
}

export function detectDiscriminant(
        members: readonly IRUnionMember[],
): DiscriminantHint | undefined {
        if (members.length < 2) {
                return undefined;
        }

        const allObjects = members.every((member) => IRNodeGuard.isObject(member.type));

        if (!allObjects) {
                return undefined;
        }

        const firstObject = members[0].type;

        if (!IRNodeGuard.isObject(firstObject)) {
                return undefined;
        }

        const propertyNames = new Set(firstObject.properties.map((prop) => prop.name));

        for (const propertyName of propertyNames) {
                const discriminantCandidate = checkDiscriminantProperty(propertyName, members);

                if (discriminantCandidate) {
                        return discriminantCandidate;
                }
        }

        return undefined;
}

export function checkDiscriminantProperty(
        propertyName: string,
        members: readonly IRUnionMember[],
): DiscriminantHint | undefined {
        const values: LiteralValue[] = [];

        for (const member of members) {
                if (!IRNodeGuard.isObject(member.type)) {
                        return undefined;
                }

                const property = member.type.properties.find((prop) => prop.name === propertyName);

                if (!property) {
                        return undefined;
                }

                if (property.optional) {
                        return undefined;
                }

                if (!IRNodeGuard.isLiteral(property.type)) {
                        return undefined;
                }

                if (values.includes(property.type.value)) {
                        return undefined;
                }

                values.push(property.type.value);
        }

        if (values.length !== members.length) {
                return undefined;
        }

        return {
                propertyName,
                values,
                span: members[0].span,
        };
}
