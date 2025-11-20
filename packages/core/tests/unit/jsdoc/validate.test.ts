// packages/core/tests/unit/jsdoc/validate.test.ts

import { describe, it, expect } from 'vitest';

import type { ParsedAnnotation } from '../../../src/jsdoc/annotations.js';
import { validateAnnotations } from '../../../src/jsdoc/validate.js';
import type { ResolvedType } from '../../../src/types/types.js';

describe('validateAnnotations', () => {
        describe('entity annotation', () => {
                it('accepts entity on any type', () => {
                        const primitiveType: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };
                        const objectType: ResolvedType = {
                                kind: 'object',
                                properties: [],
                        };
                        const annotations: ParsedAnnotation[] = [{ tag: 'entity' }];

                        expect(validateAnnotations(primitiveType, annotations).ok).toBe(true);
                        expect(validateAnnotations(objectType, annotations).ok).toBe(true);
                });
        });

        describe('primary key annotation', () => {
                it('accepts pk on primitive type', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'number',
                        };
                        const annotations: ParsedAnnotation[] = [{ tag: 'pk' }];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('accepts pk on literal type', () => {
                        const type: ResolvedType = {
                                kind: 'literal',
                                literalKind: 'string',
                                value: 'uuid',
                        };
                        const annotations: ParsedAnnotation[] = [{ tag: 'pk' }];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('rejects pk on object type', () => {
                        const type: ResolvedType = {
                                kind: 'object',
                                properties: [],
                        };
                        const annotations: ParsedAnnotation[] = [{ tag: 'pk' }];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(false);
                        if (!result.ok) {
                                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3005');
                        }
                });
        });

        describe('index annotation', () => {
                it('accepts index on object with existing fields', () => {
                        const type: ResolvedType = {
                                kind: 'object',
                                properties: [
                                        {
                                                name: 'name',
                                                type: {
                                                        kind: 'primitive',
                                                        primitiveKind: 'string',
                                                },
                                                optional: false,
                                                readonly: false,
                                        },
                                        {
                                                name: 'email',
                                                type: {
                                                        kind: 'primitive',
                                                        primitiveKind: 'string',
                                                },
                                                optional: false,
                                                readonly: false,
                                        },
                                ],
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'index', fields: ['name', 'email'], unique: false },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('rejects index with non-existent field', () => {
                        const type: ResolvedType = {
                                kind: 'object',
                                properties: [
                                        {
                                                name: 'name',
                                                type: {
                                                        kind: 'primitive',
                                                        primitiveKind: 'string',
                                                },
                                                optional: false,
                                                readonly: false,
                                        },
                                ],
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'index', fields: ['name', 'nonexistent'], unique: false },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(false);
                        if (!result.ok) {
                                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3006');
                        }
                });

                it('rejects index on non-object type', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'index', fields: ['name'], unique: false },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(false);
                        if (!result.ok) {
                                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3005');
                        }
                });
        });

        describe('foreign key annotation', () => {
                it('accepts fk on primitive type', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'number',
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'fk', target: 'User', field: 'id' },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('rejects fk on object type', () => {
                        const type: ResolvedType = {
                                kind: 'object',
                                properties: [],
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'fk', target: 'User', field: 'id' },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(false);
                        if (!result.ok) {
                                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3005');
                        }
                });
        });

        describe('numeric constraints', () => {
                it('accepts min/max on number primitive', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'number',
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'min', value: 0 },
                                { tag: 'max', value: 100 },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('accepts int on number primitive', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'number',
                        };
                        const annotations: ParsedAnnotation[] = [{ tag: 'int' }];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('rejects min on string type', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };
                        const annotations: ParsedAnnotation[] = [{ tag: 'min', value: 0 }];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(false);
                        if (!result.ok) {
                                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3005');
                        }
                });
        });

        describe('string constraints', () => {
                it('accepts minLength/maxLength on string primitive', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'minLength', value: 1 },
                                { tag: 'maxLength', value: 100 },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('accepts pattern on string primitive', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'pattern', pattern: '^[a-z]+$' },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('accepts format on string primitive', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'format', format: 'email' },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('accepts email/uuid/url on string primitive', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'email' },
                                { tag: 'uuid' },
                                { tag: 'url' },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('accepts minLength on array type', () => {
                        const type: ResolvedType = {
                                kind: 'array',
                                element: { kind: 'primitive', primitiveKind: 'string' },
                        };
                        const annotations: ParsedAnnotation[] = [{ tag: 'minLength', value: 1 }];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('rejects pattern on number type', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'number',
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'pattern', pattern: '^[0-9]+$' },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(false);
                        if (!result.ok) {
                                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3005');
                        }
                });
        });

        describe('metadata annotations', () => {
                it('accepts description on any type', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'description', text: 'User email address' },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(true);
                });

                it('rejects validator (not yet supported)', () => {
                        const type: ResolvedType = {
                                kind: 'object',
                                properties: [],
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'validator', name: 'customValidator' },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(false);
                        if (!result.ok) {
                                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3005');
                        }
                });

                it('rejects transform (not yet supported)', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'transform', name: 'lowercase' },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(false);
                        if (!result.ok) {
                                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3005');
                        }
                });
        });

        describe('multiple annotation errors', () => {
                it('collects all validation errors', () => {
                        const type: ResolvedType = {
                                kind: 'primitive',
                                primitiveKind: 'string',
                        };
                        const annotations: ParsedAnnotation[] = [
                                { tag: 'min', value: 0 },
                                { tag: 'max', value: 100 },
                                { tag: 'int' },
                        ];

                        const result = validateAnnotations(type, annotations);

                        expect(result.ok).toBe(false);
                        if (!result.ok) {
                                expect(result.diagnostics).toHaveLength(3);
                        }
                });
        });
});
