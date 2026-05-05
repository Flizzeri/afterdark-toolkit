// packages/core/src/extraction/object.ts

import { ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import { parseAnnotations } from '../annotation';
import type { IRObject, IRObjectProperty, IRIndexSignature } from '../ir';
import type { ExtractionContext, ExtractionError } from './types.js';
import { CoreDiagnostics } from '../diagnostics';
import { extractMetadata } from '../metadata';

export function extractObject(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRObject, ExtractionError> {
        if (!isObjectType(type)) {
                return err({
                        type: 'internal-error',
                        message: 'extractObject called on non-object type',
                });
        }

        const properties: IRObjectProperty[] = [];
        const typeProperties = type.getProperties();

        for (const prop of typeProperties) {
                // Skip compiler-generated properties (prototype, constructor, etc.)
                const declarations = prop.getDeclarations();
                if (!declarations || declarations.length === 0) {
                        // No declaration = compiler-generated (like Object.prototype methods)
                        continue;
                }

                // Also check if the declaration is from a lib file (built-in types)
                const declaration = declarations[0];
                const sourceFile = declaration.getSourceFile();
                if (
                        sourceFile.hasNoDefaultLib ||
                        sourceFile.fileName.includes('node_modules/typescript/lib')
                ) {
                        continue;
                }

                const propertyResult = extractProperty(prop, type, node, context);

                if (!propertyResult.ok) {
                        switch (propertyResult.error.type) {
                                case 'missing-declaration':
                                        return propertyResult;
                                case 'unsupported-type':
                                        continue;
                        }
                        continue;
                }

                properties.push(propertyResult.value);
        }

        const indexSignatureResult = extractIndexSignature(type, node, context);

        if (!indexSignatureResult.ok) {
                return indexSignatureResult;
        }

        const metadata = extractMetadata(
                type,
                node,
                context.sourceFile,
                context,
                'object',
                context.checker.typeToString(type),
        );

        return ok({
                kind: 'object',
                properties,
                ...(indexSignatureResult.value && { indexSignature: indexSignatureResult.value }),
                metadata,
        });
}

export function isObjectType(type: ts.Type): boolean {
        return !!(type.flags & ts.TypeFlags.Object);
}

function extractProperty(
        symbol: ts.Symbol,
        parentType: ts.Type,
        parentNode: ts.Node,
        context: ExtractionContext,
): Result<IRObjectProperty, ExtractionError> {
        const propertyName = symbol.getName();
        const propertyType = context.checker.getTypeOfSymbolAtLocation(symbol, parentNode);
        const parentTypeText = context.checker.typeToString(parentType);
        const parentSpan = context.sourceFile.getSpan(parentNode);

        const declarations = symbol.getDeclarations();
        const declaration = declarations?.[0];

        if (!declaration) {
                context.diagnostics.add(
                        CoreDiagnostics.OBJECT_PROPERTY_NO_DECLARATION.new(
                                parentSpan,
                                propertyName,
                                parentTypeText,
                        ),
                );

                return err({
                        type: 'missing-declaration',
                        symbolName: propertyName,
                });
        }

        const propertyNode = getPropertyNode(declaration, context);
        const span = context.sourceFile.getSpan(declaration);

        if (!propertyNode.ok) {
                switch (propertyNode.error.type) {
                        case 'missing-property': {
                                context.diagnostics.add(
                                        CoreDiagnostics.OBJECT_PROPERTY_NO_TYPE_NODE.new(
                                                span,
                                                propertyName,
                                                declaration.kind,
                                        ),
                                );
                                return err({
                                        type: 'internal-error',
                                        message: `No type node found for property: ${propertyName}`,
                                });
                        }
                        case 'unsupported-property': {
                                return err({
                                        type: 'unsupported-type',
                                        reason: 'callable type',
                                        typeText: context.checker.typeToString(parentType),
                                });
                        }
                }
        }
        const propertyTypeResult = context.extractType(propertyType, propertyNode.value);

        if (!propertyTypeResult.ok) {
                return propertyTypeResult;
        }

        const optional = !!(symbol.flags & ts.SymbolFlags.Optional);
        const readonly = isReadonlyProperty(declaration);

        // Extract annotations from property symbol
        const tsSourceFile = getTsSourceFile(declaration);
        const annotations =
                context.options.extractAnnotations && tsSourceFile
                        ? parseAnnotations(symbol, tsSourceFile, context.diagnostics)
                        : [];

        const documentation = extractPropertyDocumentation(symbol);

        return ok({
                name: propertyName,
                type: propertyTypeResult.value,
                optional,
                readonly,
                span,
                annotations,
                ...(documentation && { documentation }),
        });
}

function extractIndexSignature(
        type: ts.Type,
        node: ts.Node,
        context: ExtractionContext,
): Result<IRIndexSignature | undefined, ExtractionError> {
        const stringIndexType = context.checker.getIndexTypeOfType(type, ts.IndexKind.String);
        const numberIndexType = context.checker.getIndexTypeOfType(type, ts.IndexKind.Number);

        if (stringIndexType && numberIndexType) {
                const typeText = context.checker.typeToString(type);
                const span = context.sourceFile.getSpan(node);
                const stringIndexText = context.checker.typeToString(stringIndexType);
                const numberIndexText = context.checker.typeToString(numberIndexType);

                context.diagnostics.add(
                        CoreDiagnostics.OBJECT_DUAL_INDEX_SIGNATURES.new(
                                span,
                                typeText,
                                stringIndexText,
                                numberIndexText,
                        ),
                );

                return err({
                        type: 'unsupported-type',
                        reason: 'Multiple index signatures',
                        typeText,
                });
        }

        if (stringIndexType) {
                const valueResult = context.extractType(stringIndexType, node);

                if (!valueResult.ok) {
                        return valueResult;
                }

                return ok({
                        keyType: 'string',
                        valueType: valueResult.value,
                        span: context.sourceFile.getSpan(node),
                });
        }

        if (numberIndexType) {
                const valueResult = context.extractType(numberIndexType, node);

                if (!valueResult.ok) {
                        return valueResult;
                }

                return ok({
                        keyType: 'number',
                        valueType: valueResult.value,
                        span: context.sourceFile.getSpan(node),
                });
        }

        return ok(undefined);
}

interface UnsupportedProperty {
        type: 'unsupported-property';
}

interface MissingProperty {
        type: 'missing-property';
}

type PropertyError = UnsupportedProperty | MissingProperty;

function getPropertyNode(
        declaration: ts.Declaration,
        context: ExtractionContext,
): Result<ts.Node, PropertyError> {
        // Data properties — interface/type-literal member with a type annotation
        if (ts.isPropertySignature(declaration)) {
                // If the type is a function type, it is not a data property.
                if (declaration.type && ts.isFunctionTypeNode(declaration.type)) {
                        return emitCallableMemberError(declaration, context);
                }

                return ok(declaration.type ?? declaration);
        }

        // Data properties — class field with optional type annotation or initializer
        if (ts.isPropertyDeclaration(declaration)) {
                // Arrow-function or function-expression initializer with no type annotation
                // means this is a callable member stored as a class field.
                if (!declaration.type && declaration.initializer) {
                        if (
                                ts.isArrowFunction(declaration.initializer) ||
                                ts.isFunctionExpression(declaration.initializer)
                        ) {
                                return emitCallableMemberError(declaration, context);
                        }
                }

                // Explicit function type annotation on a class field
                if (declaration.type && ts.isFunctionTypeNode(declaration.type)) {
                        return emitCallableMemberError(declaration, context);
                }

                return ok(declaration.type ?? declaration.initializer ?? declaration);
        }

        // Constructor parameter properties: `constructor(public readonly x: T)`
        if (ts.isParameter(declaration)) {
                return ok(declaration.type ?? declaration);
        }

        // Object literal shorthand: `{ key: value }`
        if (ts.isPropertyAssignment(declaration)) {
                return ok(declaration.initializer);
        }

        // Interface / type-literal method shorthand: `greet(): void`
        if (ts.isMethodSignature(declaration)) {
                return emitCallableMemberError(declaration, context);
        }

        // Class method: `greet(): void {}`
        if (ts.isMethodDeclaration(declaration)) {
                return emitCallableMemberError(declaration, context);
        }

        return err({
                type: 'missing-property',
        });
}

function emitCallableMemberError(
        declaration: ts.Declaration,
        context: ExtractionContext,
): Result<never, UnsupportedProperty> {
        const span = context.sourceFile.getSpan(declaration);
        context.diagnostics.add(
                CoreDiagnostics.OBJECT_METHOD_NOT_SUPPORTED.new(span, declaration.kind),
        );

        return err({ type: 'unsupported-property' });
}

function isReadonlyProperty(declaration: ts.Declaration): boolean {
        if (!ts.canHaveModifiers(declaration)) {
                return false;
        }

        const modifiers = ts.getModifiers(declaration);

        if (!modifiers) {
                return false;
        }

        return modifiers.some((mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword);
}

function extractPropertyDocumentation(symbol: ts.Symbol): string | undefined {
        const comments = symbol.getDocumentationComment(undefined);

        if (comments.length === 0) {
                return undefined;
        }

        return comments.map((comment) => comment.text).join('\n');
}

function getTsSourceFile(node: ts.Node): ts.SourceFile | undefined {
        let current: ts.Node | undefined = node;

        while (current) {
                if (ts.isSourceFile(current)) {
                        return current;
                }
                current = current.parent;
        }

        return undefined;
}
