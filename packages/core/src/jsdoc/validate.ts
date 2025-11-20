// packages/core/src/jsdoc/validate.ts

import { ok, err, type Result, type Diagnostic, makeDiagnostic } from '@afterdarktk/shared';

import type { ParsedAnnotation } from './annotations.js';
import { TAG_INCOMPATIBLE_TYPE, TAG_FIELD_NOT_FOUND, TAG_MALFORMED } from '../diagnostics/codes.js';
import type { ResolvedType } from '../types/types.js';

export interface ValidatedAnnotations {
        readonly annotations: readonly ParsedAnnotation[];
}

export function validateAnnotations(
        resolvedType: ResolvedType,
        annotations: readonly ParsedAnnotation[],
): Result<ValidatedAnnotations> {
        const diagnostics: Diagnostic[] = [];

        for (const annotation of annotations) {
                const result = validateAnnotation(resolvedType, annotation);
                if (!result.ok) {
                        diagnostics.push(...result.diagnostics);
                }
        }

        if (diagnostics.length > 0) {
                return err(diagnostics);
        }

        return ok({ annotations });
}

function validateAnnotation(
        resolvedType: ResolvedType,
        annotation: ParsedAnnotation,
): Result<void> {
        switch (annotation.tag) {
                case 'entity':
                        // Entity can be applied to any type - just marks "create IR for this"
                        return ok(undefined);

                case 'pk':
                case 'unique':
                case 'default':
                case 'sqlType':
                case 'decimal':
                        return validateFieldAnnotation(resolvedType, annotation.tag);

                case 'index':
                        return validateIndexAnnotation(resolvedType, annotation);

                case 'fk':
                        return validateForeignKeyAnnotation(resolvedType);

                case 'min':
                case 'max':
                case 'int':
                        return validateNumericAnnotation(resolvedType, annotation.tag);

                case 'minLength':
                case 'maxLength':
                case 'pattern':
                case 'format':
                case 'email':
                case 'uuid':
                case 'url':
                        return validateStringAnnotation(resolvedType, annotation.tag);

                case 'renameFrom':
                case 'check':
                case 'version':
                case 'description':
                        return ok(undefined);

                case 'validator':
                case 'transform':
                        // TODO: Custom validators and transformers require registry validation
                        // Need to check if validator/transformer exists and is compatible with type
                        // This is complex for Records, unions, etc. - defer to future implementation
                        return err([
                                makeDiagnostic({
                                        meta: TAG_INCOMPATIBLE_TYPE,
                                        args: [
                                                `@${annotation.tag}`,
                                                'custom validators/transformers not yet supported',
                                        ],
                                }),
                        ]);

                default:
                        return err([
                                makeDiagnostic({
                                        meta: TAG_MALFORMED,
                                        args: [(annotation as ParsedAnnotation).tag],
                                }),
                        ]);
        }
}

function validateFieldAnnotation(resolvedType: ResolvedType, tag: string): Result<void> {
        const isPrimitive =
                resolvedType.kind === 'primitive' ||
                resolvedType.kind === 'literal' ||
                resolvedType.kind === 'literalUnion';

        if (!isPrimitive) {
                return err([
                        makeDiagnostic({
                                meta: TAG_INCOMPATIBLE_TYPE,
                                args: [`@${tag}`, resolvedType.kind],
                        }),
                ]);
        }

        return ok(undefined);
}

function validateIndexAnnotation(
        resolvedType: ResolvedType,
        annotation: ParsedAnnotation & { tag: 'index' },
): Result<void> {
        if (resolvedType.kind !== 'object') {
                return err([
                        makeDiagnostic({
                                meta: TAG_INCOMPATIBLE_TYPE,
                                args: ['@index', resolvedType.kind],
                        }),
                ]);
        }

        const propertyNames = new Set(resolvedType.properties.map((p) => p.name));

        for (const field of annotation.fields) {
                if (!propertyNames.has(field)) {
                        return err([
                                makeDiagnostic({
                                        meta: TAG_FIELD_NOT_FOUND,
                                        args: [field, '@index'],
                                }),
                        ]);
                }
        }

        return ok(undefined);
}

function validateForeignKeyAnnotation(resolvedType: ResolvedType): Result<void> {
        const isPrimitive =
                resolvedType.kind === 'primitive' ||
                resolvedType.kind === 'literal' ||
                resolvedType.kind === 'literalUnion';

        if (!isPrimitive) {
                return err([
                        makeDiagnostic({
                                meta: TAG_INCOMPATIBLE_TYPE,
                                args: ['@fk', resolvedType.kind],
                        }),
                ]);
        }

        return ok(undefined);
}

function validateNumericAnnotation(resolvedType: ResolvedType, tag: string): Result<void> {
        const isNumeric =
                (resolvedType.kind === 'primitive' &&
                        (resolvedType.primitiveKind === 'number' ||
                                resolvedType.primitiveKind === 'bigint')) ||
                (resolvedType.kind === 'literal' &&
                        (resolvedType.literalKind === 'number' ||
                                resolvedType.literalKind === 'bigint'));

        if (!isNumeric) {
                return err([
                        makeDiagnostic({
                                meta: TAG_INCOMPATIBLE_TYPE,
                                args: [`@${tag}`, resolvedType.kind],
                        }),
                ]);
        }

        return ok(undefined);
}

function validateStringAnnotation(resolvedType: ResolvedType, tag: string): Result<void> {
        const isString =
                (resolvedType.kind === 'primitive' && resolvedType.primitiveKind === 'string') ||
                (resolvedType.kind === 'literal' && resolvedType.literalKind === 'string') ||
                (resolvedType.kind === 'literalUnion' &&
                        resolvedType.members.every((m) => m.literalKind === 'string')) ||
                resolvedType.kind === 'array';

        if (!isString) {
                return err([
                        makeDiagnostic({
                                meta: TAG_INCOMPATIBLE_TYPE,
                                args: [`@${tag}`, resolvedType.kind],
                        }),
                ]);
        }

        return ok(undefined);
}

Object.freeze(validateAnnotations);
