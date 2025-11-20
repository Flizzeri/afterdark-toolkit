// packages/core/tests/unit/types/supportMatrix.test.ts

import { describe, it, expect } from 'vitest';

import {
        SUPPORT_MATRIX,
        getSupportStatus,
        isSupported,
        isPartiallySupported,
        isUnsupported,
} from '../../../src/types/supportMatrix.js';

describe('Support Matrix', () => {
        describe('SUPPORT_MATRIX', () => {
                it('defines status for all construct types', () => {
                        expect(SUPPORT_MATRIX.primitive.status).toBe('supported');
                        expect(SUPPORT_MATRIX.literal.status).toBe('supported');
                        expect(SUPPORT_MATRIX.literalUnion.status).toBe('supported');
                        expect(SUPPORT_MATRIX.enum.status).toBe('supported');
                        expect(SUPPORT_MATRIX.array.status).toBe('supported');
                        expect(SUPPORT_MATRIX.tuple.status).toBe('supported');
                        expect(SUPPORT_MATRIX.object.status).toBe('supported');
                        expect(SUPPORT_MATRIX.union.status).toBe('supported');
                        expect(SUPPORT_MATRIX.intersection.status).toBe('supported');
                        expect(SUPPORT_MATRIX.generic.status).toBe('partial');
                        expect(SUPPORT_MATRIX.conditional.status).toBe('partial');
                        expect(SUPPORT_MATRIX.mapped.status).toBe('partial');
                        expect(SUPPORT_MATRIX.templateLiteral.status).toBe('partial');
                        expect(SUPPORT_MATRIX.recursive.status).toBe('supported');
                        expect(SUPPORT_MATRIX.indexSignature.status).toBe('supported');
                        expect(SUPPORT_MATRIX.function.status).toBe('unsupported');
                        expect(SUPPORT_MATRIX.callSignature.status).toBe('unsupported');
                        expect(SUPPORT_MATRIX.constructor.status).toBe('unsupported');
                        expect(SUPPORT_MATRIX.indexedAccess.status).toBe('unsupported');
                        expect(SUPPORT_MATRIX.infer.status).toBe('unsupported');
                        expect(SUPPORT_MATRIX.this.status).toBe('unsupported');
                        expect(SUPPORT_MATRIX.symbol.status).toBe('unsupported');
                        expect(SUPPORT_MATRIX.never.status).toBe('unsupported');
                        expect(SUPPORT_MATRIX.void.status).toBe('unsupported');
                        expect(SUPPORT_MATRIX.any.status).toBe('unsupported');
                        expect(SUPPORT_MATRIX.unknown.status).toBe('unsupported');
                });

                it('includes notes for important constructs', () => {
                        expect(SUPPORT_MATRIX.enum.notes).toContain('literal union');
                        expect(SUPPORT_MATRIX.intersection.notes).toContain('Flattened');
                        expect(SUPPORT_MATRIX.union.notes).toContain('homogeneous');
                        expect(SUPPORT_MATRIX.mapped.notes).toBeDefined();
                });
        });

        describe('getSupportStatus', () => {
                it('returns correct support info', () => {
                        const primitiveSupport = getSupportStatus('primitive');
                        expect(primitiveSupport.status).toBe('supported');

                        const genericSupport = getSupportStatus('generic');
                        expect(genericSupport.status).toBe('partial');
                        expect(genericSupport.notes).toBeDefined();

                        const functionSupport = getSupportStatus('function');
                        expect(functionSupport.status).toBe('unsupported');
                });
        });

        describe('isSupported', () => {
                it('returns true for supported constructs', () => {
                        expect(isSupported('primitive')).toBe(true);
                        expect(isSupported('array')).toBe(true);
                        expect(isSupported('object')).toBe(true);
                        expect(isSupported('intersection')).toBe(true);
                });

                it('returns false for non-supported constructs', () => {
                        expect(isSupported('function')).toBe(false);
                        expect(isSupported('generic')).toBe(false);
                });
        });

        describe('isPartiallySupported', () => {
                it('returns true for partially supported constructs', () => {
                        expect(isPartiallySupported('generic')).toBe(true);
                        expect(isPartiallySupported('conditional')).toBe(true);
                        expect(isPartiallySupported('mapped')).toBe(true);
                        expect(isPartiallySupported('templateLiteral')).toBe(true);
                });

                it('returns false for fully supported or unsupported constructs', () => {
                        expect(isPartiallySupported('primitive')).toBe(false);
                        expect(isPartiallySupported('function')).toBe(false);
                });
        });

        describe('isUnsupported', () => {
                it('returns true for unsupported constructs', () => {
                        expect(isUnsupported('function')).toBe(true);
                        expect(isUnsupported('any')).toBe(true);
                        expect(isUnsupported('unknown')).toBe(true);
                        expect(isUnsupported('never')).toBe(true);
                        expect(isUnsupported('void')).toBe(true);
                });

                it('returns false for supported constructs', () => {
                        expect(isUnsupported('primitive')).toBe(false);
                        expect(isUnsupported('generic')).toBe(false);
                });
        });
});
