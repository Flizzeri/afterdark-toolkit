// src/types/resolve.ts

import {
        type SymbolId,
        ok,
        err,
        type Result,
        type Diagnostic,
        makeDiagnostic,
} from '@afterdarktk/shared';
import {
        type Type as TsType,
        type Symbol as TsSymbol,
        type PropertySignature,
        SyntaxKind,
        TypeFlags,
        ObjectFlags,
        SymbolFlags,
} from 'ts-morph';

import type {
        ResolvedType,
        ResolvedPrimitive,
        ResolvedLiteral,
        ResolvedObject,
        ResolvedObjectProperty,
        ResolvedRef,
        ResolvedUnsupported,
        LiteralValue,
        DiscriminantHint,
} from './types.js';
import {
        TYPE_UNSUPPORTED,
        TYPE_UNRESOLVED,
        UNION_HETEROGENEOUS,
        INTERSECTION_CONFLICT,
} from '../diagnostics/codes.js';
import { getSymbolId } from '../ts/symbols.js';

interface ResolutionContext {
        readonly visited: Map<TsType, SymbolId | 'pending'>;
        readonly resolved: Map<SymbolId, ResolvedType>;
        readonly diagnostics: Diagnostic[];
}

/**
 * Resolves a TypeScript symbol to a fully normalized ResolvedType.
 * Performs intersection flattening, union validation, and property sorting.
 * Never throws; returns Result with diagnostics on failure.
 */
export function resolveSymbolType(symbol: TsSymbol): Result<ResolvedType> {
        const ctx: ResolutionContext = {
                visited: new Map(),
                resolved: new Map(),
                diagnostics: [],
        };

        try {
                const declaredType = symbol.getDeclaredType();
                if (!declaredType) {
                        return err([
                                makeDiagnostic({
                                        meta: TYPE_UNRESOLVED,
                                        args: [
                                                `Symbol ${getSymbolId(symbol)} has no declared type`,
                                        ],
                                }),
                        ]);
                }

                const symbolId = getSymbolId(symbol);
                const resolved = resolveType(declaredType, symbolId, ctx);

                if (resolved === null) {
                        return err(
                                ctx.diagnostics.length > 0
                                        ? ctx.diagnostics
                                        : [
                                                  makeDiagnostic({
                                                          meta: TYPE_UNRESOLVED,
                                                          args: [
                                                                  `Failed to resolve type for symbol ${symbolId}`,
                                                          ],
                                                  }),
                                          ],
                        );
                }

                return ctx.diagnostics.length > 0 ? err(ctx.diagnostics) : ok(resolved);
        } catch (e) {
                return err([
                        makeDiagnostic({
                                meta: TYPE_UNRESOLVED,
                                args: [`Unexpected error resolving symbol: ${String(e)}`],
                        }),
                ]);
        }
}

function resolveType(
        type: TsType,
        symbolId: SymbolId | undefined,
        ctx: ResolutionContext,
): ResolvedType | null {
        if (ctx.visited.has(type)) {
                const cached = ctx.visited.get(type)!;
                if (cached === 'pending') {
                        if (symbolId) {
                                return makeRef(symbolId);
                        }
                        const typeSymbol = type.getSymbol() || type.getAliasSymbol();
                        if (typeSymbol) {
                                return makeRef(getSymbolId(typeSymbol));
                        }
                        ctx.diagnostics.push(
                                makeDiagnostic({
                                        meta: TYPE_UNRESOLVED,
                                        args: ['Circular type without resolvable symbol'],
                                }),
                        );
                        return null;
                }
                return makeRef(cached);
        }

        if (symbolId) {
                ctx.visited.set(type, 'pending');
        }

        try {
                const resolved = resolveTypeImpl(type, ctx);
                if (symbolId && resolved) {
                        ctx.visited.set(type, symbolId);
                        ctx.resolved.set(symbolId, resolved);
                }
                return resolved;
        } catch (e) {
                ctx.diagnostics.push(
                        makeDiagnostic({
                                meta: TYPE_UNRESOLVED,
                                args: [`Error resolving type: ${String(e)}`],
                        }),
                );
                return null;
        }
}

function resolveTypeImpl(type: TsType, ctx: ResolutionContext): ResolvedType | null {
        const flags = type.getFlags();

        // Check for function types first (before any other checks)
        const callSigs = type.getCallSignatures();
        const constructSigs = type.getConstructSignatures();
        if (callSigs.length > 0 || constructSigs.length > 0) {
                ctx.diagnostics.push(
                        makeDiagnostic({
                                meta: TYPE_UNSUPPORTED,
                                args: ['Function types are not supported'],
                        }),
                );
                return null;
        }

        // Primitives
        if (flags & TypeFlags.String) return makePrimitive('string');
        if (flags & TypeFlags.Number) return makePrimitive('number');
        if (flags & TypeFlags.Boolean) return makePrimitive('boolean');
        if (flags & TypeFlags.BigInt) return makePrimitive('bigint');
        if (flags & TypeFlags.Null) return makePrimitive('null');
        if (flags & TypeFlags.Undefined) return makePrimitive('undefined');
        if (flags & TypeFlags.Void) {
                return makeUnsupported('void type not supported; use undefined');
        }

        // Literals
        if (flags & TypeFlags.StringLiteral) {
                const value = type.getLiteralValue();
                if (typeof value === 'string') {
                        return makeLiteral('string', value);
                }
        }
        if (flags & TypeFlags.NumberLiteral) {
                const value = type.getLiteralValue();
                if (typeof value === 'number') {
                        return makeLiteral('number', value);
                }
        }
        if (flags & TypeFlags.BooleanLiteral) {
                // TypeScript represents true/false as intrinsic types, not always as BooleanLiteral
                // Try getText() as fallback since getLiteralValue() may not work
                const text = type.getText();
                if (text === 'true') return makeLiteral('boolean', true);
                if (text === 'false') return makeLiteral('boolean', false);

                // Try getLiteralValue as backup
                const value = type.getLiteralValue();
                if (typeof value === 'boolean') {
                        return makeLiteral('boolean', value);
                }
        }
        if (flags & TypeFlags.BigIntLiteral) {
                const value = type.getLiteralValue();
                // BigInt literals come as PseudoBigInt objects with negative/base10Value properties
                if (value && typeof value === 'object' && 'base10Value' in value) {
                        const bigintValue = BigInt(value.base10Value);
                        return makeLiteral('bigint', bigintValue);
                }
        }

        // Any / Unknown / Never
        if (flags & TypeFlags.Any) {
                return makeUnsupported('any type violates deterministic extraction');
        }
        if (flags & TypeFlags.Unknown) {
                return makeUnsupported('unknown type is too broad for structural extraction');
        }
        if (flags & TypeFlags.Never) {
                return makeUnsupported('never type cannot be represented in structural schema');
        }

        // Enum member
        if (flags & TypeFlags.EnumLiteral) {
                const value = type.getLiteralValue();
                if (typeof value === 'string') return makeLiteral('string', value);
                if (typeof value === 'number') return makeLiteral('number', value);
                return makeUnsupported('unsupported enum literal value type');
        }

        // Union
        if (type.isUnion()) {
                return resolveUnion(type, ctx);
        }

        // Intersection
        if (type.isIntersection()) {
                return resolveIntersection(type, ctx);
        }

        // Array
        if (type.isArray()) {
                const elementType = type.getArrayElementType();
                if (!elementType) {
                        ctx.diagnostics.push(
                                makeDiagnostic({
                                        meta: TYPE_UNRESOLVED,
                                        args: ['Array type has no element type'],
                                }),
                        );
                        return null;
                }

                const element = resolveType(elementType, undefined, ctx);
                if (element === null) return null;

                return { kind: 'array', element };
        }

        // Tuple
        if (type.isTuple()) {
                const elementTypes = type.getTupleElements();
                const elements: ResolvedType[] = [];

                for (const elemType of elementTypes) {
                        const resolved = resolveType(elemType, undefined, ctx);
                        if (resolved === null) return null;
                        elements.push(resolved);
                }

                return { kind: 'tuple', elements };
        }

        // Object
        if (type.isObject()) {
                // Check for function/callable types first
                const callSignatures = type.getCallSignatures();
                if (callSignatures.length > 0) {
                        ctx.diagnostics.push(
                                makeDiagnostic({
                                        meta: TYPE_UNSUPPORTED,
                                        args: ['Function types are not supported'],
                                }),
                        );
                        return null;
                }

                // Check if this is a Record<K, V> or similar by looking at index signatures
                const stringIndexType = type.getStringIndexType();
                const numberIndexType = type.getNumberIndexType();
                const properties = type.getProperties();

                // Record<K, V> pattern: has index signature but no properties
                if ((stringIndexType || numberIndexType) && properties.length === 0) {
                        let indexSignature: ResolvedObject['indexSignature'] | undefined;

                        if (stringIndexType) {
                                const resolved = resolveType(stringIndexType, undefined, ctx);
                                if (resolved === null) return null;
                                indexSignature = { keyType: 'string', valueType: resolved };
                        } else if (numberIndexType) {
                                const resolved = resolveType(numberIndexType, undefined, ctx);
                                if (resolved === null) return null;
                                indexSignature = { keyType: 'number', valueType: resolved };
                        }

                        return {
                                kind: 'object',
                                properties: [],
                                ...(indexSignature && { indexSignature }),
                        };
                }

                // Regular object or complex mapped type
                return resolveObject(type, ctx);
        }

        // Template literal
        if (flags & TypeFlags.TemplateLiteral) {
                return makePrimitive('string');
        }

        // Type reference - create ref if named, otherwise resolve
        const symbol = type.getSymbol() || type.getAliasSymbol();
        if (symbol) {
                const symbolId = getSymbolId(symbol);

                // Check if already resolved
                if (ctx.resolved.has(symbolId)) {
                        return makeRef(symbolId);
                }

                // For type aliases, try to resolve the target first
                const aliasedType = type.getAliasSymbol()
                        ? type.getAliasSymbol()?.getDeclaredType()
                        : null;
                if (aliasedType && aliasedType !== type) {
                        return resolveType(aliasedType, symbolId, ctx);
                }

                return makeRef(symbolId);
        }

        // Unsupported
        ctx.diagnostics.push(
                makeDiagnostic({
                        meta: TYPE_UNSUPPORTED,
                        args: [`Unsupported TypeScript construct: ${describeType(type)}`],
                }),
        );
        return null;
}

function resolveUnion(type: TsType, ctx: ResolutionContext): ResolvedType | null {
        const members = type.getUnionTypes();
        const resolvedMembers: ResolvedType[] = [];

        for (const member of members) {
                const resolved = resolveType(member, undefined, ctx);
                if (resolved === null) return null;
                resolvedMembers.push(resolved);
        }

        // Check if all members are literals -> literal union
        if (resolvedMembers.every((m) => m.kind === 'literal')) {
                const literals = resolvedMembers as ResolvedLiteral[];
                const sorted = sortLiterals(literals);
                return { kind: 'literalUnion', members: sorted };
        }

        // Check homogeneity for object unions
        const objectMembers = resolvedMembers.filter(
                (m) => m.kind === 'object' || m.kind === 'ref',
        );
        const otherMembers = resolvedMembers.filter(
                (m) =>
                        !(
                                m.kind === 'object' ||
                                m.kind === 'ref' ||
                                (m.kind === 'primitive' && m.primitiveKind === 'null')
                        ),
        );

        // Allow object | null unions (nullable types), but reject other mixed unions
        if (objectMembers.length > 0 && otherMembers.length > 0) {
                ctx.diagnostics.push(
                        makeDiagnostic({
                                meta: UNION_HETEROGENEOUS,
                                args: ['Union mixes object and non-object types'],
                        }),
                );
                return null;
        }

        // Detect discriminant for object unions
        const discriminant = detectDiscriminant(resolvedMembers);

        // Sort union members for determinism
        const sorted = sortUnionMembers(resolvedMembers);

        return {
                kind: 'union',
                members: sorted,
                ...(discriminant && { discriminant }),
        };
}

function resolveIntersection(type: TsType, ctx: ResolutionContext): ResolvedType | null {
        const members = type.getIntersectionTypes();
        const resolvedMembers: ResolvedType[] = [];

        for (const member of members) {
                const resolved = resolveType(member, undefined, ctx);
                if (resolved === null) return null;
                resolvedMembers.push(resolved);
        }

        // Flatten intersection to object
        return flattenIntersection(resolvedMembers, ctx);
}

function flattenIntersection(
        members: readonly ResolvedType[],
        ctx: ResolutionContext,
): ResolvedObject | null {
        const properties = new Map<string, ResolvedObjectProperty>();
        let indexSignature: ResolvedObject['indexSignature'] | undefined;

        for (const member of members) {
                if (member.kind === 'object') {
                        // Merge properties
                        for (const prop of member.properties) {
                                const existing = properties.get(prop.name);
                                if (existing) {
                                        // Check for conflicts
                                        if (!typesEqual(existing.type, prop.type)) {
                                                ctx.diagnostics.push(
                                                        makeDiagnostic({
                                                                meta: INTERSECTION_CONFLICT,
                                                                args: [
                                                                        `Property ${prop.name} has conflicting types in intersection`,
                                                                ],
                                                        }),
                                                );
                                                return null;
                                        }
                                        // Keep the more restrictive optionality
                                        if (!existing.optional && prop.optional) {
                                                continue;
                                        }
                                }
                                properties.set(prop.name, prop);
                        }

                        // Merge index signature
                        if (member.indexSignature) {
                                if (indexSignature) {
                                        ctx.diagnostics.push(
                                                makeDiagnostic({
                                                        meta: INTERSECTION_CONFLICT,
                                                        args: [
                                                                'Multiple index signatures in intersection',
                                                        ],
                                                }),
                                        );
                                        return null;
                                }
                                indexSignature = member.indexSignature;
                        }
                } else if (member.kind === 'ref') {
                        // Cannot flatten refs without resolving them
                        ctx.diagnostics.push(
                                makeDiagnostic({
                                        meta: TYPE_UNSUPPORTED,
                                        args: ['Intersection with unresolved type reference'],
                                }),
                        );
                        return null;
                } else {
                        ctx.diagnostics.push(
                                makeDiagnostic({
                                        meta: TYPE_UNSUPPORTED,
                                        args: [
                                                `Cannot flatten intersection with ${member.kind} type`,
                                        ],
                                }),
                        );
                        return null;
                }
        }

        // Sort properties by name for determinism
        const sortedProps = Array.from(properties.values()).sort((a, b) =>
                a.name.localeCompare(b.name),
        );

        return {
                kind: 'object',
                properties: sortedProps,
                ...(indexSignature && { indexSignature }),
        };
}

function resolveObject(type: TsType, ctx: ResolutionContext): ResolvedType | null {
        const objectFlags = type.getObjectFlags();

        // Check for mapped type
        if (objectFlags & ObjectFlags.Mapped) {
                return resolveMappedType(type, ctx);
        }

        // Regular object with properties
        const properties = type.getProperties();
        const resolvedProps: ResolvedObjectProperty[] = [];

        for (const prop of properties) {
                const propName = prop.getName();

                // Get property type
                const valueDecl = prop.getValueDeclaration();
                const propType = prop.getTypeAtLocation(valueDecl ?? prop.getDeclarations()[0]!);

                const resolved = resolveType(propType, undefined, ctx);
                if (resolved === null) return null;

                // Detect optionality properly
                const optional = !!(prop.getFlags() & SymbolFlags.Optional);

                // Detect readonly properly
                const readonly = isPropertyReadonly(prop);

                resolvedProps.push({
                        name: propName,
                        type: resolved,
                        optional,
                        readonly,
                });
        }

        // Sort properties by name for determinism
        const sortedProps = resolvedProps.sort((a, b) => a.name.localeCompare(b.name));

        // Check for index signature
        const stringIndexType = type.getStringIndexType();
        const numberIndexType = type.getNumberIndexType();

        let indexSignature: ResolvedObject['indexSignature'] | undefined;
        if (stringIndexType) {
                const resolved = resolveType(stringIndexType, undefined, ctx);
                if (resolved === null) return null;
                indexSignature = { keyType: 'string', valueType: resolved };
        } else if (numberIndexType) {
                const resolved = resolveType(numberIndexType, undefined, ctx);
                if (resolved === null) return null;
                indexSignature = { keyType: 'number', valueType: resolved };
        }

        return {
                kind: 'object',
                properties: sortedProps,
                ...(indexSignature && { indexSignature }),
        };
}

function resolveMappedType(type: TsType, ctx: ResolutionContext): ResolvedType | null {
        // Check if this is Record<K, V> by symbol name
        const symbol = type.getSymbol() || type.getAliasSymbol();
        const symbolName = symbol?.getName();

        // Try to resolve as Record<K, V>
        const typeArgs = type.getTypeArguments();
        if (typeArgs.length === 2 && (symbolName === 'Record' || symbolName === '__type')) {
                const [keyType, valueType] = typeArgs;

                const keyFlags = keyType!.getFlags();
                let keyKind: 'string' | 'number' | null = null;

                if (keyFlags & TypeFlags.String) keyKind = 'string';
                else if (keyFlags & TypeFlags.Number) keyKind = 'number';

                if (keyKind) {
                        const resolved = resolveType(valueType!, undefined, ctx);
                        if (resolved === null) return null;

                        return {
                                kind: 'object',
                                properties: [],
                                indexSignature: { keyType: keyKind, valueType: resolved },
                        };
                }
        }

        // Try to resolve to concrete object shape
        const properties = type.getProperties();
        if (properties.length > 0) {
                return resolveObject(type, ctx);
        }

        ctx.diagnostics.push(
                makeDiagnostic({
                        meta: TYPE_UNSUPPORTED,
                        args: ['Mapped type cannot be resolved to concrete form'],
                }),
        );
        return null;
}

function isPropertyReadonly(prop: TsSymbol): boolean {
        const declarations = prop.getDeclarations();
        for (const decl of declarations) {
                if (decl.getKind() === SyntaxKind.PropertySignature) {
                        const propSig = decl as PropertySignature;
                        return propSig.isReadonly();
                }
        }
        return false;
}

function detectDiscriminant(members: readonly ResolvedType[]): DiscriminantHint | undefined {
        if (members.length < 2) return undefined;

        // Only works for object unions
        const objects = members.filter((m) => m.kind === 'object') as ResolvedObject[];
        if (objects.length !== members.length) return undefined;

        // Find common property names
        const propSets = objects.map((obj) => new Set(obj.properties.map((p) => p.name)));
        const commonProps = propSets[0]!;

        for (let i = 1; i < propSets.length; i++) {
                for (const prop of commonProps) {
                        if (!propSets[i]!.has(prop)) {
                                commonProps.delete(prop);
                        }
                }
        }

        // Check each common property for literal discriminant
        for (const propName of commonProps) {
                const values: LiteralValue[] = [];
                let isDiscriminant = true;

                for (const obj of objects) {
                        const prop = obj.properties.find((p) => p.name === propName);
                        if (!prop || prop.type.kind !== 'literal') {
                                isDiscriminant = false;
                                break;
                        }
                        values.push((prop.type as ResolvedLiteral).value);
                }

                if (isDiscriminant && values.length === objects.length) {
                        const uniqueValues = Array.from(new Set(values.map((v) => String(v))));
                        if (uniqueValues.length === values.length) {
                                return { propertyName: propName, values };
                        }
                }
        }

        return undefined;
}

function sortLiterals(literals: readonly ResolvedLiteral[]): readonly ResolvedLiteral[] {
        return [...literals].sort((a, b) => {
                const aStr = String(a.value);
                const bStr = String(b.value);
                return aStr.localeCompare(bStr);
        });
}

function sortUnionMembers(members: readonly ResolvedType[]): readonly ResolvedType[] {
        return [...members].sort((a, b) => {
                if (a.kind !== b.kind) {
                        return a.kind.localeCompare(b.kind);
                }
                if (a.kind === 'literal' && b.kind === 'literal') {
                        return String(a.value).localeCompare(String(b.value));
                }
                if (a.kind === 'ref' && b.kind === 'ref') {
                        return a.target.localeCompare(b.target);
                }
                return 0;
        });
}

function typesEqual(a: ResolvedType, b: ResolvedType): boolean {
        if (a.kind !== b.kind) return false;

        switch (a.kind) {
                case 'primitive':
                        return b.kind === 'primitive' && a.primitiveKind === b.primitiveKind;
                case 'literal':
                        return b.kind === 'literal' && a.value === b.value;
                case 'ref':
                        return b.kind === 'ref' && a.target === b.target;
                default:
                        return false;
        }
}

function describeType(type: TsType): string {
        const flags = type.getFlags();

        if (flags & TypeFlags.Object) {
                const symbol = type.getSymbol();
                if (symbol) return `type ${symbol.getName()}`;
                return 'anonymous object type';
        }

        return 'unknown type';
}

// Factory helpers
function makePrimitive(kind: ResolvedPrimitive['primitiveKind']): ResolvedPrimitive {
        return { kind: 'primitive', primitiveKind: kind };
}

function makeLiteral(
        literalKind: ResolvedLiteral['literalKind'],
        value: LiteralValue,
): ResolvedLiteral {
        return { kind: 'literal', literalKind, value };
}

function makeRef(target: SymbolId): ResolvedRef {
        return { kind: 'ref', target };
}

function makeUnsupported(reason: string): ResolvedUnsupported {
        return { kind: 'unsupported', reason };
}
