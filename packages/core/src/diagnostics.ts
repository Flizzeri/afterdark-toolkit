// packages/core/src/diagnostics.ts

// Single source of truth for every diagnostic @adtk/core can emit.
// Each entry owns its code, category, static text, and a `new()` factory
// that accepts only the call-site-specific values (spans + interpolations)
// and returns a ready-to-emit Diagnostic object.

// Range allocation:
//   0001-0999   Fatal infrastructure failures
//   1000–1099   Symbol extraction
//   1110–1199   Primitive extractor
//   1200–1299   Array extractor
//   1300-1399   Object extractors
//   1400–1499   Tuple extractor
//   1500–1599   Union extractor
//   1600–1699   Intersection extractor
//   1700–1799   Template literal extractor
//   1800–1899   Literal extractor
//   1900–1999   Unsupported type extractors
//   2000–2099   Resolution layer
//   3000–3099   Annotation parser
//   4000–4099   Querying sources
//   4100–4199   Querying executor / filters

import type { Diagnostic, SourceSpan } from '@adtk/shared';

// 0001–0009  Symbol extraction

export const CoreDiagnostics = {
        RESOLUTION_INVALID_FILE_PATH: {
                code: 'ADTK-CORE-0001' as const,
                category: 'fatal' as const,
                new(symbolName: string, fileName: string, errorDetail: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Invalid source file path',
                                        description: `Cannot create FilePath from source file: ${errorDetail}`,
                                        notes: [
                                                `Symbol: ${symbolName}`,
                                                `File: ${fileName}`,
                                                'This is likely an issue with the file path normalization',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        ANNOTATION_INVALID_FILE_PATH: {
                code: 'ADTK-CORE-0002' as const,
                category: 'fatal' as const,
                new(fileName: string, errorDetail: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Invalid source file path for annotation',
                                        description: `Cannot create FilePath for annotation on symbol '${fileName}': ${errorDetail}`,
                                },
                                spans: [],
                        };
                },
        },

        SYNTHETIC_SYMBOL_ID_HASH_FAILED: {
                code: 'ADTK-CORE-0003' as const,
                category: 'fatal' as const,
                new(category: string, errorDetail: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Failed to generate synthetic symbol ID',
                                        description: `Cannot hash synthetic symbol ID for '${category}': ${errorDetail}`,
                                },
                                spans: [],
                        };
                },
        },

        // 1000-1099 Symbol extraction

        SYMBOL_NO_DECLARATION: {
                code: 'ADTK-CORE-1000' as const,
                category: 'error' as const,
                new(symbolName: string, symbolFlags: number): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Symbol has no declaration',
                                        description: `Symbol '${symbolName}' exists but has no source declaration.`,
                                        notes: [
                                                'This can happen with ambient declarations or compiler-generated symbols',
                                                `Symbol name: ${symbolName}`,
                                                `Symbol flags: ${symbolFlags}`,
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        // 1100–1199  Primitive extractor

        PRIMITIVE_UNKNOWN_KIND: {
                code: 'ADTK-CORE-1100' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Unknown primitive type',
                                        description: `The type '${typeText}' has primitive type flags but doesn't match any known primitive kind.`,
                                        notes: [
                                                'This is likely an internal error in the type extraction logic',
                                                'Primitive types should be one of: string, number, boolean, bigint, symbol, null, undefined, void, never, any, unknown',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Cannot determine primitive kind for type '${typeText}'`,
                                                help: 'This type appears to be a primitive but its specific kind could not be determined',
                                        },
                                ],
                        };
                },
        },

        // 1200–1299  Array / Object extractors

        ARRAY_NO_TYPE_ARGUMENT: {
                code: 'ADTK-CORE-1200' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Array type missing element type argument',
                                        description:
                                                'Arrays must specify their element type. Generic Array without type arguments is not supported.',
                                        notes: [
                                                'Valid examples: string[], Array<number>, Array<User>',
                                                'Invalid: Array (without type argument)',
                                                `Found type: ${typeText}`,
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Array type '${typeText}' has no type arguments`,
                                                issue: 'Array types must have exactly one type argument specifying the element type',
                                                help: 'Use Array<T> or T[] syntax with a specific element type',
                                        },
                                ],
                        };
                },
        },

        ARRAY_MULTIPLE_TYPE_ARGUMENTS: {
                code: 'ADTK-CORE-1201' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string, argCount: number): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Array type has multiple type arguments',
                                        description: `Array type has ${argCount} type arguments, expected exactly 1.`,
                                        notes: [
                                                'Arrays hold elements of a single type',
                                                'For multiple types, use a union: Array<T | U>',
                                                'For fixed-length heterogeneous arrays, use tuples: [string, number]',
                                                `Found type: ${typeText}`,
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Array type '${typeText}' has ${argCount} type arguments`,
                                                issue: 'Array types must have exactly one type argument',
                                                help: 'Arrays are homogeneous — use a union for multiple element types: Array<string | number>',
                                        },
                                ],
                        };
                },
        },

        // 1300-1399 Object extraction

        OBJECT_PROPERTY_NO_DECLARATION: {
                code: 'ADTK-CORE-1300' as const,
                category: 'error' as const,
                new(span: SourceSpan, propertyName: string, parentTypeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Property has no declaration',
                                        description: `The property '${propertyName}' exists in the type but has no declaration node in the source code.`,
                                        notes: [
                                                'This can happen with computed or synthetic properties',
                                                'The property may be inherited or injected by a type operation',
                                                `Parent type: ${parentTypeText}`,
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Property '${propertyName}' has no source declaration`,
                                                issue: 'Cannot extract property metadata without a declaration',
                                        },
                                ],
                        };
                },
        },

        OBJECT_PROPERTY_NO_TYPE_NODE: {
                code: 'ADTK-CORE-1301' as const,
                category: 'error' as const,
                new(span: SourceSpan, propertyName: string, declarationKind: number): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Cannot find property type node',
                                        description: `The property '${propertyName}' has a declaration but no associated type node could be found.`,
                                        notes: [
                                                'This is likely an internal error in property extraction',
                                                `Declaration kind: ${declarationKind}`,
                                                'The property may have an implicit type that needs inference',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Cannot locate type node for property '${propertyName}'`,
                                                issue: 'Property declaration exists but type node is missing',
                                        },
                                ],
                        };
                },
        },

        OBJECT_DUAL_INDEX_SIGNATURES: {
                code: 'ADTK-CORE-1303' as const,
                category: 'error' as const,
                new(
                        span: SourceSpan,
                        typeText: string,
                        stringIndexText: string,
                        numberIndexText: string,
                ): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Object has both string and number index signatures',
                                        description:
                                                'The IR representation supports only a single index signature per object type.',
                                        notes: [
                                                'TypeScript allows both string and number index signatures',
                                                'The IR simplifies this to a single index signature',
                                                `String index type: ${stringIndexText}`,
                                                `Number index type: ${numberIndexText}`,
                                                'Consider using named properties for number-indexed values',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Type '${typeText}' has both [key: string] and [key: number] index signatures`,
                                                issue: 'Objects can have only one index signature in the IR',
                                                help: 'Use separate properties or a union type for the value',
                                        },
                                ],
                        };
                },
        },

        OBJECT_METHOD_NOT_SUPPORTED: {
                code: 'ADTK-CORE-1304' as const,
                category: 'error' as const,
                new(span: SourceSpan, declarationKind: number): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Callable members are not supported',
                                        description: 'The IR represents data shapes, not behavior.',
                                        notes: [
                                                'Affected kinds: method signatures, method declarations, function-type properties',
                                                `Declaration kind: ${declarationKind}`,
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: 'Methods and function-type properties cannot be represented in the IR',
                                                issue: 'Callable members are not data types and cannot be validated or migrated',
                                                help: 'Remove the method or exclude this type from extraction',
                                        },
                                ],
                        };
                },
        },

        // 1400–1499  Tuple extractor

        TUPLE_MISSING_ELEMENT_FLAGS: {
                code: 'ADTK-CORE-1400' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Tuple type missing element flags',
                                        description:
                                                'Tuple type has unexpected internal structure — element flags are missing.',
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                                'Element flags indicate which elements are required, optional, or rest',
                                                `Found type: ${typeText}`,
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Tuple type '${typeText}' has no element flags`,
                                                issue: 'Cannot determine which elements are optional or rest elements',
                                        },
                                ],
                        };
                },
        },

        TUPLE_VARIADIC_NOT_SUPPORTED: {
                code: 'ADTK-CORE-1401' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string, index: number): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Variadic tuple elements are not supported',
                                        description: `The tuple type '${typeText}' contains a variadic element at position ${index}.`,
                                        notes: [
                                                'Variadic elements are advanced TypeScript features for type-level operations',
                                                'The IR supports rest elements but not variadic elements',
                                                'Example of rest element: [string, ...number[]]',
                                                'Example of variadic (not supported): [...T, ...U]',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Tuple element at index ${index} is variadic`,
                                                issue: 'Variadic tuple elements cannot be represented in the IR',
                                                help: 'Use a rest element instead: [...T[]]',
                                        },
                                ],
                        };
                },
        },

        TUPLE_ELEMENT_AFTER_REST: {
                code: 'ADTK-CORE-1402' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Tuple has elements after rest element',
                                        description: `The tuple type '${typeText}' has non-rest elements following a rest element.`,
                                        notes: [
                                                'Rest elements must be the last element in a tuple',
                                                'Valid: [string, number, ...boolean[]]',
                                                'Invalid: [string, ...boolean[], number]',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: 'Tuple element appears after rest element',
                                                issue: 'Rest elements must be the final element in a tuple',
                                                help: 'Move the rest element to the end of the tuple',
                                        },
                                ],
                        };
                },
        },

        // 1500–1599  Union extractor

        UNION_NO_MEMBERS: {
                code: 'ADTK-CORE-1500' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Union type has no members',
                                        description:
                                                'A union type with no members cannot be represented.',
                                        notes: [
                                                'This is likely an internal error in TypeScript type construction',
                                                'Union types are created with syntax: T | U | V',
                                                `Found type: ${typeText}`,
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Union type '${typeText}' contains no members`,
                                                issue: 'Union types must have at least one member',
                                        },
                                ],
                        };
                },
        },

        UNION_SINGLE_MEMBER: {
                code: 'ADTK-CORE-1501' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string, memberTypeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Union type has only one member',
                                        description:
                                                'A union with a single member is equivalent to that member type.',
                                        notes: [
                                                'Single-member unions may indicate a type simplification opportunity',
                                                'The IR will still represent this as a union for accuracy',
                                                `Member type: ${memberTypeText}`,
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Union type '${typeText}' contains only one member`,
                                                issue: 'Single-member unions are redundant',
                                                help: 'Remove the union and use the member type directly',
                                        },
                                ],
                        };
                },
        },

        // 1600–1699  Intersection extractor

        INTERSECTION_NO_MEMBERS: {
                code: 'ADTK-CORE-1600' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Intersection type has no members',
                                        description:
                                                'An intersection type with no members cannot be represented.',
                                        notes: [
                                                'This is likely an internal error in TypeScript type construction',
                                                'Intersection types are created with syntax: T & U & V',
                                                `Found type: ${typeText}`,
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Intersection type '${typeText}' contains no members`,
                                                issue: 'Intersection types must have at least one member',
                                        },
                                ],
                        };
                },
        },

        INTERSECTION_SINGLE_MEMBER: {
                code: 'ADTK-CORE-1601' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string, memberTypeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Intersection type has only one member',
                                        description:
                                                'An intersection with a single member is equivalent to that member type.',
                                        notes: [
                                                'Single-member intersections may indicate a type simplification opportunity',
                                                'The IR will still represent this as an intersection for accuracy',
                                                `Member type: ${memberTypeText}`,
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Intersection type '${typeText}' contains only one member`,
                                                issue: 'Single-member intersections are redundant',
                                                help: 'Remove the intersection and use the member type directly',
                                        },
                                ],
                        };
                },
        },

        // 1700–1799  Template literal extractor

        TEMPLATE_MISSING_TEXTS: {
                code: 'ADTK-CORE-1700' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Template literal type missing texts array',
                                        description:
                                                'Template literal type has unexpected internal structure — texts array is missing.',
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                                'Template literal types should have texts and types arrays',
                                                `Found type: ${typeText}`,
                                                'Expected structure: { texts: string[], types: Type[] }',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Template literal type '${typeText}' has no texts property`,
                                                issue: 'Cannot extract template literal parts without texts array',
                                        },
                                ],
                        };
                },
        },

        TEMPLATE_MISSING_TYPES: {
                code: 'ADTK-CORE-1701' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Template literal type missing types array',
                                        description:
                                                'Template literal type has unexpected internal structure — types array is missing.',
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                                'Template literal types should have texts and types arrays',
                                                `Found type: ${typeText}`,
                                                'Expected structure: { texts: string[], types: Type[] }',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Template literal type '${typeText}' has no types property`,
                                                issue: 'Cannot extract template literal parts without types array',
                                        },
                                ],
                        };
                },
        },

        TEMPLATE_MISMATCHED_PARTS: {
                code: 'ADTK-CORE-1702' as const,
                category: 'error' as const,
                new(
                        span: SourceSpan,
                        typeText: string,
                        textCount: number,
                        typeCount: number,
                ): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Template literal has mismatched texts and types counts',
                                        description: `Template literal structure is invalid: ${textCount} texts, ${typeCount} types.`,
                                        notes: [
                                                'Template literals alternate between text and type parts',
                                                'They always start and end with text (even if empty string)',
                                                'Example: `hello ${string} world` → ["hello ", ""] with [string]',
                                                'Example: `${number}` → ["", ""] with [number]',
                                                'This mismatch indicates an internal TypeScript error',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Template literal '${typeText}' has ${textCount} text parts but ${typeCount} type parts`,
                                                issue: 'Text parts should always be one more than type parts',
                                                help: 'Template literals follow pattern: text₀ type₀ text₁ type₁ ... typeₙ textₙ₊₁',
                                        },
                                ],
                        };
                },
        },

        TEMPLATE_EMPTY: {
                code: 'ADTK-CORE-1703' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Template literal has no parts',
                                        description:
                                                'A template literal with no parts is semantically equivalent to an empty string literal.',
                                        notes: [
                                                'This can happen with: type T = ``',
                                                'Consider using: type T = ""',
                                                'The IR will represent this as an empty template literal for accuracy',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Template literal type '${typeText}' has no text or type parts`,
                                                issue: 'Empty template literals are equivalent to empty string literal',
                                                help: 'Use the literal type "" instead',
                                        },
                                ],
                        };
                },
        },

        // 1800–1899  Literal extractor

        LITERAL_UNKNOWN_KIND: {
                code: 'ADTK-CORE-1800' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string, typeFlags: number): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Unknown literal type',
                                        description: `The type '${typeText}' has literal type flags but doesn't match any known literal kind.`,
                                        notes: [
                                                'This is likely an internal error in the type extraction logic',
                                                `Type flags: ${typeFlags}`,
                                                'Supported literals: string, number, boolean, bigint, null',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Type '${typeText}' has literal flags but unknown literal kind`,
                                                help: 'Literal types should be string, number, boolean, bigint, or null',
                                        },
                                ],
                        };
                },
        },

        LITERAL_BOOLEAN_INDETERMINATE: {
                code: 'ADTK-CORE-1801' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeString: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Cannot determine boolean literal value',
                                        description:
                                                'Could not determine if boolean literal is true or false.',
                                        notes: [
                                                `Type string representation: "${typeString}"`,
                                                'This is likely a TypeScript compiler version incompatibility',
                                                'Please report this issue with your TypeScript version',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Boolean literal type '${typeString}' has unexpected string representation`,
                                                help: 'Expected "true" or "false"',
                                        },
                                ],
                        };
                },
        },

        LITERAL_STRING_NO_VALUE: {
                code: 'ADTK-CORE-1810' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'String literal type missing value property',
                                        description:
                                                'String literal type has unexpected internal structure.',
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                                'Expected ts.StringLiteralType with value property',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `String literal type '${typeText}' does not have a value property`,
                                        },
                                ],
                        };
                },
        },

        LITERAL_STRING_WRONG_TYPE: {
                code: 'ADTK-CORE-1811' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string, valueType: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'String literal value is not a string',
                                        description: `Expected string value, got ${valueType}.`,
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `String literal type '${typeText}' has non-string value: ${valueType}`,
                                        },
                                ],
                        };
                },
        },

        LITERAL_NUMBER_NO_VALUE: {
                code: 'ADTK-CORE-1820' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Number literal type missing value property',
                                        description:
                                                'Number literal type has unexpected internal structure.',
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                                'Expected ts.NumberLiteralType with value property',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Number literal type '${typeText}' does not have a value property`,
                                        },
                                ],
                        };
                },
        },

        LITERAL_NUMBER_WRONG_TYPE: {
                code: 'ADTK-CORE-1821' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string, valueType: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Number literal value is not a number',
                                        description: `Expected number value, got ${valueType}.`,
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Number literal type '${typeText}' has non-number value: ${valueType}`,
                                        },
                                ],
                        };
                },
        },

        LITERAL_BIGINT_UNEXPECTED_FORMAT: {
                code: 'ADTK-CORE-1830' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string, raw: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Unexpected BigInt literal format',
                                        description: `The BigInt literal type '${typeText}' has an unexpected internal representation.`,
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                                'Please report this issue with your TypeScript version',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: 'BigInt literal has unexpected internal format',
                                                issue: `Expected {negative: boolean, base10Value: string}, got: ${raw}`,
                                        },
                                ],
                        };
                },
        },

        LITERAL_BIGINT_NO_VALUE: {
                code: 'ADTK-CORE-1831' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'BigInt literal type missing value property',
                                        description:
                                                'BigInt literal type has unexpected internal structure.',
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                                'Expected ts.BigIntLiteralType with value property',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `BigInt literal type '${typeText}' does not have a value property`,
                                        },
                                ],
                        };
                },
        },

        LITERAL_BIGINT_NEGATIVE_NOT_BOOLEAN: {
                code: 'ADTK-CORE-1832' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string, negativeType: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'BigInt literal negative flag is not boolean',
                                        description: `BigInt literal type '${typeText}' has unexpected internal format.`,
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `BigInt literal negative property is ${negativeType}, expected boolean`,
                                        },
                                ],
                        };
                },
        },

        LITERAL_BIGINT_BASE10_NOT_STRING: {
                code: 'ADTK-CORE-1833' as const,
                category: 'error' as const,
                new(span: SourceSpan, typeText: string, base10Type: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'BigInt literal base10Value is not string',
                                        description: `BigInt literal type '${typeText}' has unexpected internal format.`,
                                        notes: [
                                                'This is likely a TypeScript compiler version incompatibility',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `BigInt literal base10Value is ${base10Type}, expected string`,
                                        },
                                ],
                        };
                },
        },

        LITERAL_BIGINT_PARSE_FAILED: {
                code: 'ADTK-CORE-1834' as const,
                category: 'error' as const,
                new(span: SourceSpan, stringValue: string, errorMessage: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Invalid BigInt literal',
                                        description: `The BigInt literal '${stringValue}' could not be parsed.`,
                                        notes: [
                                                `Error: ${errorMessage}`,
                                                'BigInt literals are created with the "n" suffix: 123n',
                                                'The value must be a valid integer',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Cannot parse BigInt literal: ${stringValue}`,
                                                help: 'BigInt literals must be valid integer values',
                                        },
                                ],
                        };
                },
        },

        // 1900–1999  Unsupported type extractors

        UNSUPPORTED_TYPE_PARAMETER: {
                code: 'ADTK-CORE-1900' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Unresolved type parameter',
                                        description: `The type parameter '${typeText}' has no concrete value at extraction time.`,
                                        notes: [
                                                'Type parameters are only supported when fully instantiated',
                                                'Consider using a concrete type instead of a generic parameter',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Type parameter '${typeText}' is not instantiated`,
                                                issue: 'Type parameters cannot be represented in the IR without a concrete argument',
                                                help: 'Ensure the type is used with a concrete type argument, or restrict this type to non-generic definitions',
                                        },
                                ],
                        };
                },
        },

        UNSUPPORTED_CONDITIONAL: {
                code: 'ADTK-CORE-1901' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Conditional type not supported',
                                        description: `The conditional type '${typeText}' cannot be evaluated at extraction time.`,
                                        notes: [
                                                'Conditional types (T extends U ? X : Y) are not representable in the IR',
                                                'Consider pre-resolving the condition into an explicit union type',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Conditional type '${typeText}' cannot be statically resolved`,
                                                issue: 'Conditional types require runtime information to evaluate',
                                                help: 'Replace with a concrete union or a specific type',
                                        },
                                ],
                        };
                },
        },

        UNSUPPORTED_KEYOF: {
                code: 'ADTK-CORE-1902' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'keyof type not supported',
                                        description: `The index type '${typeText}' (keyof) cannot be extracted to IR.`,
                                        notes: [
                                                'keyof types are only supported when they resolve to a known string literal union',
                                                'For example, keyof { id: number; name: string } resolves and is supported',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `'${typeText}' is a keyof type that cannot be statically resolved`,
                                                issue: 'keyof requires a concrete type argument to enumerate its keys',
                                                help: 'Provide a concrete type argument or use an explicit string literal union',
                                        },
                                ],
                        };
                },
        },

        UNSUPPORTED_INDEXED_ACCESS: {
                code: 'ADTK-CORE-1903' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Indexed access type not supported',
                                        description: `The indexed access type '${typeText}' cannot be extracted to IR.`,
                                        notes: [
                                                'Indexed access types (T[K]) are only supported when both T and K are concrete',
                                                'For example, User["id"] resolves and is supported; T["id"] is not',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `'${typeText}' is an indexed access type that cannot be statically resolved`,
                                                issue: 'The object or key type contains an unresolved type parameter',
                                                help: 'Use a concrete type or resolve the indexed access to a specific type',
                                        },
                                ],
                        };
                },
        },

        UNSUPPORTED_SUBSTITUTION: {
                code: 'ADTK-CORE-1904' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Substitution type not supported',
                                        description: `The substitution type '${typeText}' is an internal TypeScript construct.`,
                                        notes: [
                                                'Substitution types arise from infer clauses and type narrowing inside conditionals',
                                                'They are not representable in the IR',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `'${typeText}' is an internal substitution type`,
                                                issue: 'Substitution types are intermediate representations used during type inference',
                                                help: 'This type typically appears inside conditional types; simplify the surrounding type',
                                        },
                                ],
                        };
                },
        },

        UNSUPPORTED_CALLABLE: {
                code: 'ADTK-CORE-1905' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Callable type not supported',
                                        description: `The callable type '${typeText}' has call signatures and cannot be extracted to IR.`,
                                        notes: [
                                                'Function types are not representable as IR nodes',
                                                'If this is a method on an interface, consider converting to a property with a function type',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `'${typeText}' is a function type`,
                                                issue: 'Function types cannot be represented as data schemas',
                                                help: 'Remove the function type or wrap it in an object property if the signature is needed as metadata',
                                        },
                                ],
                        };
                },
        },

        UNSUPPORTED_CONSTRUCTABLE: {
                code: 'ADTK-CORE-1906' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Constructor type not supported',
                                        description: `The constructor type '${typeText}' has construct signatures and cannot be extracted to IR.`,
                                        notes: [
                                                'Constructor types (new (...) => T) are not representable as IR nodes',
                                                'Extract the instance type T instead',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `'${typeText}' is a constructor type`,
                                                issue: 'Constructor types cannot be represented as data schemas',
                                                help: 'Use the instance type instead of the constructor type',
                                        },
                                ],
                        };
                },
        },

        UNSUPPORTED_ABSTRACT_MAPPED: {
                code: 'ADTK-CORE-1907' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Abstract mapped type not supported',
                                        description: `The mapped type '${typeText}' has no resolvable properties at extraction time.`,
                                        notes: [
                                                'Mapped types like Partial<T> are only supported when T is a concrete type',
                                                'For example, Partial<{ x: number }> is supported; Partial<T> is not',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `'${typeText}' is a mapped type with unresolved type parameters`,
                                                issue: 'The mapped type cannot be evaluated without a concrete type argument',
                                                help: 'Provide a concrete type argument to instantiate the mapped type',
                                        },
                                ],
                        };
                },
        },

        UNSUPPORTED_GENERIC_OBJECT: {
                code: 'ADTK-CORE-1908' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string, freeProps: string[]): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Generic object type not supported',
                                        description: `The object type '${typeText}' contains properties whose types are unresolved type parameters.`,
                                        notes: [
                                                `Properties with free type parameters: ${freeProps.join(', ')}`,
                                                'Generic objects are only supported when fully instantiated with concrete types',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `'${typeText}' has properties with unresolved type parameters: ${freeProps.join(', ')}`,
                                                issue: 'Object types with free type parameters cannot be fully extracted',
                                                help: 'Provide concrete type arguments or restrict this type to non-generic definitions',
                                        },
                                ],
                        };
                },
        },

        UNSUPPORTED_UNKNOWN_TYPE: {
                code: 'ADTK-CORE-1909' as const,
                category: 'warning' as const,
                new(span: SourceSpan, typeText: string, typeFlags: number): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Unknown type encountered',
                                        description: `The type '${typeText}' has an unrecognised structure (flags: ${typeFlags}).`,
                                        notes: [
                                                `TypeScript type flags: ${typeFlags}`,
                                                'This may indicate a new TypeScript type construct not yet handled by the extractor',
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `The type '${typeText}' could not be classified`,
                                                issue: 'No extraction path exists for this type',
                                                help: 'Report this as a bug if you believe this type should be supported',
                                        },
                                ],
                        };
                },
        },

        // 2000–2099  Resolution layer

        RESOLUTION_NO_QUERIES: {
                code: 'ADTK-CORE-2000' as const,
                category: 'warning' as const,
                new(): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'No queries provided',
                                        description:
                                                'extractSymbols() was called with an empty query list.',
                                        notes: [
                                                'No symbols will be extracted',
                                                'If you want to extract all symbols, use: { type: "all" }',
                                                'If you want specific symbols, provide query objects',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        RESOLUTION_QUERY_FAILED: {
                code: 'ADTK-CORE-2001' as const,
                category: 'error' as const,
                new(queryType: string, errorDetail: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Query execution failed',
                                        description: `Failed to execute query: ${errorDetail}`,
                                        notes: [
                                                `Query type: ${queryType}`,
                                                'The query may be malformed or reference non-existent files',
                                                'Extraction will continue with remaining queries',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        RESOLUTION_NO_SYMBOLS_MATCHED: {
                code: 'ADTK-CORE-2002' as const,
                category: 'warning' as const,
                new(queryCount: number): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'No symbols matched queries',
                                        description: `Executed ${queryCount} ${queryCount === 1 ? 'query' : 'queries'} but found no matching symbols.`,
                                        notes: [
                                                'Check that your queries are correctly formed',
                                                'Verify that the source files contain the expected types',
                                                'For annotation-based queries, ensure annotations are spelled correctly',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        RESOLUTION_SYMBOL_NO_DECLARATIONS: {
                code: 'ADTK-CORE-2003' as const,
                category: 'error' as const,
                new(symbolName: string, symbolId: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Symbol has no declarations',
                                        description: `Symbol '${symbolName}' (${symbolId}) has no source declarations.`,
                                        notes: [
                                                'This can happen with ambient declarations or compiler-generated symbols',
                                                'The symbol exists in the type system but has no user-written source code',
                                                'Extraction will skip this symbol and continue with others',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        RESOLUTION_FILE_NOT_IN_PROGRAM: {
                code: 'ADTK-CORE-2004' as const,
                category: 'error' as const,
                new(symbolName: string, filePath: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Source file not found in program',
                                        description: `Source file ${filePath} is not part of the loaded program.`,
                                        notes: [
                                                `Symbol: ${symbolName}`,
                                                'The file may have been excluded by tsconfig or skipLibFiles option',
                                                'Check that the file is included in the compilation',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        RESOLUTION_SYMBOL_EXTRACTION_FAILED: {
                code: 'ADTK-CORE-2005' as const,
                category: 'error' as const,
                new(symbolName: string, symbolId: string, errorType: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Symbol extraction failed',
                                        description: `Failed to extract IR for symbol '${symbolName}': ${errorType}`,
                                        notes: [
                                                `Symbol ID: ${symbolId}`,
                                                `Error type: ${errorType}`,
                                                'Extraction will skip this symbol and continue with others',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        RESOLUTION_ALL_EXTRACTIONS_FAILED: {
                code: 'ADTK-CORE-2006' as const,
                category: 'error' as const,
                new(attempted: number, failed: number): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'All symbol extractions failed',
                                        description: `Found ${attempted} symbols but failed to extract all of them.`,
                                        notes: [
                                                `Attempted extractions: ${attempted}`,
                                                `Failed extractions: ${failed}`,
                                                'Check previous diagnostics for specific extraction errors',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        RESOLUTION_SOME_EXTRACTIONS_FAILED: {
                code: 'ADTK-CORE-2007' as const,
                category: 'warning' as const,
                new(succeeded: number, total: number, failed: number): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Some symbols failed to extract',
                                        description: `Successfully extracted ${succeeded} symbols, but ${failed} failed.`,
                                        notes: [
                                                `Success rate: ${Math.round((succeeded / total) * 100)}%`,
                                                'Check previous diagnostics for specific extraction errors',
                                                'Failed symbols will be missing from the results',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        // 3000–3099  Annotation parser

        ANNOTATION_TAG_LOCATION_UNKNOWN: {
                code: 'ADTK-CORE-3000' as const,
                category: 'warning' as const,
                new(tagName: string, symbolName: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Cannot locate JSDoc tag in source',
                                        description: `The annotation @${tagName} exists on symbol '${symbolName}' but its source location could not be determined.`,
                                        notes: [
                                                'The annotation will still be processed',
                                                'Source span will point to the symbol declaration instead',
                                                'This is likely an internal issue with JSDoc AST traversal',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        ANNOTATION_UNPARSEABLE_ARGUMENT: {
                code: 'ADTK-CORE-3001' as const,
                category: 'warning' as const,
                new(span: SourceSpan, tagName: string, rawArgument: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Cannot parse annotation argument',
                                        description: `The arguments to @${tagName} could not be parsed as structured data.`,
                                        notes: [
                                                'The raw text will be used as a string value instead',
                                                'Valid formats:',
                                                '  - Numbers: @min(18)',
                                                '  - Strings: @pattern("^[A-Z]")',
                                                '  - Booleans: @required(true)',
                                                '  - Objects: @range({ min: 0, max: 100 })',
                                                '  - Arrays: @enum([1, 2, 3])',
                                                `Found: ${rawArgument}`,
                                        ],
                                },
                                spans: [
                                        {
                                                span,
                                                message: `Annotation @${tagName}(${rawArgument}) has unparseable arguments`,
                                                issue: 'Arguments should be valid JSON or literal values',
                                                help: 'Use JSON syntax: @tag(42), @tag("text"), @tag({ key: "value" })',
                                        },
                                ],
                        };
                },
        },

        // 4000–4099  Querying sources

        QUERY_FILE_NOT_IN_PROGRAM: {
                code: 'ADTK-CORE-4000' as const,
                category: 'warning' as const,
                new(filePath: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Source file not found in program',
                                        description: `File ${filePath} is not part of the loaded TypeScript program.`,
                                        notes: [
                                                'The file may not be included in tsconfig.json',
                                                'The file may have been excluded by skipLibFiles option',
                                                'Check that the file path is correct and the file exists',
                                                'This file will be skipped in the query results',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        QUERY_GLOB_NO_MATCH: {
                code: 'ADTK-CORE-4001' as const,
                category: 'warning' as const,
                new(pattern: string, programFileCount: number): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Glob pattern matched no files',
                                        description: `The glob pattern "${pattern}" did not match any files in the program.`,
                                        notes: [
                                                `Total files in program: ${programFileCount}`,
                                                'Check that the glob pattern is correct',
                                                'Glob syntax: ** for directories, * for files, {a,b} for alternatives',
                                                'Example patterns: "src/**/*.ts", "models/*.ts", "**/*.{ts,tsx}"',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        QUERY_GLOB_INVALID_FILE_PATH: {
                code: 'ADTK-CORE-4002' as const,
                category: 'warning' as const,
                new(errorDetail: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Invalid file path from glob',
                                        description: `Failed to create FilePath: ${errorDetail}`,
                                        notes: ['This file will be skipped in the query results'],
                                },
                                spans: [],
                        };
                },
        },

        QUERY_NO_CALL_SITES: {
                code: 'ADTK-CORE-4003' as const,
                category: 'warning' as const,
                new(functionName: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'No call sites found',
                                        description: `No calls to function "${functionName}" with type arguments were found in the program.`,
                                        notes: [
                                                `Searched for: ${functionName}<T>(...)`,
                                                'Call sites must have explicit type arguments to be detected',
                                                'Example: validate<User>(data) ✓',
                                                'Example: validate(data) ✗ (no type argument)',
                                                'Check that the function name is spelled correctly',
                                                'Check that calls use explicit type parameters',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        // 4100–4199  Querying executor / filters

        QUERY_FILTER_ELIMINATED_ALL: {
                code: 'ADTK-CORE-4100' as const,
                category: 'info' as const,
                new(filterType: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Filter eliminated all symbols',
                                        description: `After applying filter of type "${filterType}", no symbols remain.`,
                                        notes: [
                                                'This may indicate the filter is too restrictive',
                                                'Check that the filter criteria match your expectations',
                                                'Remaining filters will not be applied as there are no symbols left',
                                        ],
                                },
                                spans: [],
                        };
                },
        },

        QUERY_SYMBOL_ID_NOT_FOUND: {
                code: 'ADTK-CORE-4101' as const,
                category: 'warning' as const,
                new(symbolId: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Symbol ID not found',
                                        description: `Symbol with ID "${symbolId}" was not found in the program.`,
                                        notes: [
                                                'The symbol may have been removed or renamed',
                                                'The symbol ID may be from a different compilation',
                                                'Check that the symbol ID is correct',
                                                'This symbol will be skipped in the results',
                                        ],
                                },
                                spans: [],
                        };
                },
        },
} as const;

export type CoreDiagnosticCode = (typeof CoreDiagnostics)[keyof typeof CoreDiagnostics]['code'];
