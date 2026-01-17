// packages/shared/src/encoding/types.ts

export type SpecialNumberPolicy = 'error' | 'string' | 'null';

export type BigIntPolicy = 'error' | 'string' | 'number';

export type DatePolicy = 'error' | 'iso' | 'epoch-ms';

export type MapPolicy = 'error' | 'entries';

export type SetPolicy = 'error' | 'array-sorted';

export type BinaryPolicy = 'error' | 'base64' | 'array';

export type UndefinedPolicy = 'omit' | 'null' | 'error';

export interface CanonicalEncodeConfig {
        readonly specialNumberPolicy: SpecialNumberPolicy;
        readonly bigintPolicy: BigIntPolicy;
        readonly datePolicy: DatePolicy;
        readonly mapPolicy: MapPolicy;
        readonly setPolicy: SetPolicy;
        readonly binaryPolicy: BinaryPolicy;
        readonly undefinedPolicy: UndefinedPolicy;
        readonly coerceNegativeZeroToZero: boolean;
        readonly preserveArrayOrder: boolean;
}

export type CanonicalEncodeErrorReason =
        | 'non-finite-number'
        | 'unsafe-bigint'
        | 'unsupported-type'
        | 'circular-reference'
        | 'invalid-date'
        | 'unsupported-binary'
        | 'unsupported-map-key'
        | 'bigint-disallowed'
        | 'date-disallowed'
        | 'map-disallowed'
        | 'set-disallowed'
        | 'binary-disallowed'
        | 'undefined-disallowed';

export interface CanonicalEncodeError {
        readonly reason: CanonicalEncodeErrorReason;
        readonly path: string;
        readonly message: string;
        readonly value?: string;
}

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [k: string]: JsonValue };
