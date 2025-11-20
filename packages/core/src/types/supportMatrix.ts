// packages/core/src/types/supportMatrix.ts

export type SupportStatus = 'supported' | 'partial' | 'unsupported';

export interface ConstructSupport {
        readonly status: SupportStatus;
        readonly notes?: string;
}

export const SUPPORT_MATRIX = {
        primitive: {
                status: 'supported',
        } as ConstructSupport,
        literal: {
                status: 'supported',
        } as ConstructSupport,
        literalUnion: {
                status: 'supported',
                notes: 'String, number, boolean, bigint literals only',
        } as ConstructSupport,
        enum: {
                status: 'supported',
                notes: 'Lowered to literal unions at resolution time',
        } as ConstructSupport,
        array: {
                status: 'supported',
        } as ConstructSupport,
        tuple: {
                status: 'supported',
        } as ConstructSupport,
        object: {
                status: 'supported',
                notes: 'Interfaces and type literals',
        } as ConstructSupport,
        union: {
                status: 'supported',
                notes: 'Must be homogeneous: all objects with discriminants OR all literals',
        } as ConstructSupport,
        intersection: {
                status: 'supported',
                notes: 'Flattened to objects at resolution time; conflicts rejected',
        } as ConstructSupport,
        generic: {
                status: 'partial',
                notes: 'Only when fully instantiated with concrete types',
        } as ConstructSupport,
        conditional: {
                status: 'partial',
                notes: 'Only if compiler has already resolved to concrete form',
        } as ConstructSupport,
        mapped: {
                status: 'partial',
                notes: 'Resolved to concrete object shape or Record pattern',
        } as ConstructSupport,
        templateLiteral: {
                status: 'partial',
                notes: 'Resolved to string primitive; complex patterns rejected',
        } as ConstructSupport,
        recursive: {
                status: 'supported',
                notes: 'Via ref nodes with cycle detection',
        } as ConstructSupport,
        indexSignature: {
                status: 'supported',
                notes: 'String and number index signatures preserved',
        } as ConstructSupport,
        function: {
                status: 'unsupported',
        } as ConstructSupport,
        callSignature: {
                status: 'unsupported',
        } as ConstructSupport,
        constructor: {
                status: 'unsupported',
        } as ConstructSupport,
        indexedAccess: {
                status: 'unsupported',
                notes: 'Must be resolved by compiler first',
        } as ConstructSupport,
        infer: {
                status: 'unsupported',
        } as ConstructSupport,
        this: {
                status: 'unsupported',
        } as ConstructSupport,
        symbol: {
                status: 'unsupported',
        } as ConstructSupport,
        never: {
                status: 'unsupported',
                notes: 'Cannot be represented in structural schema',
        } as ConstructSupport,
        void: {
                status: 'unsupported',
                notes: 'Use undefined instead',
        } as ConstructSupport,
        any: {
                status: 'unsupported',
                notes: 'Violates deterministic extraction',
        } as ConstructSupport,
        unknown: {
                status: 'unsupported',
                notes: 'Too broad for structural extraction',
        } as ConstructSupport,
} as const;

export function getSupportStatus(construct: keyof typeof SUPPORT_MATRIX): ConstructSupport {
        return SUPPORT_MATRIX[construct];
}

export function isSupported(construct: keyof typeof SUPPORT_MATRIX): boolean {
        return SUPPORT_MATRIX[construct].status === 'supported';
}

export function isPartiallySupported(construct: keyof typeof SUPPORT_MATRIX): boolean {
        return SUPPORT_MATRIX[construct].status === 'partial';
}

export function isUnsupported(construct: keyof typeof SUPPORT_MATRIX): boolean {
        return SUPPORT_MATRIX[construct].status === 'unsupported';
}
