// packages/shared/src/encoding/types.ts

export type SpecialNumberPolicy = 'error' | 'string' | 'null';

export type BigIntPolicy = 'error' | 'string' | 'number';

export type DatePolicy = 'error' | 'iso' | 'epoch-ms';

export type MapPolicy = 'error' | 'entries';

export type SetPolicy = 'error' | 'array-sorted';

export type BinaryPolicy = 'error' | 'base64' | 'array';

export type UndefinedPolicy = 'omit' | 'null' | 'error';

/**
 * Configuration for canonical JSON encoding behavior.
 *
 * @remarks
 * These policies control how the encoder handles edge cases and special types
 * that don't have direct JSON representations. Choose policies based on your
 * use case:
 *
 * - For strict validation: Use 'error' policies to reject problematic values
 * - For serialization: Use conversion policies ('string', 'iso', 'base64', etc.)
 * - For hashing: Use deterministic policies (defaults are optimized for this)
 *
 * @example
 * Strict validation (reject all special types):
 * ```typescript
 * const strictConfig: CanonicalEncodeConfig = {
 *   specialNumberPolicy: 'error',
 *   bigintPolicy: 'error',
 *   datePolicy: 'error',
 *   mapPolicy: 'error',
 *   setPolicy: 'error',
 *   binaryPolicy: 'error',
 *   undefinedPolicy: 'error',
 *   coerceNegativeZeroToZero: true,
 *   preserveArrayOrder: true
 * };
 * ```
 *
 * @example
 * Permissive serialization (convert everything):
 * ```typescript
 * const permissiveConfig: Partial<CanonicalEncodeConfig> = {
 *   specialNumberPolicy: 'string',  // NaN → "NaN"
 *   bigintPolicy: 'string',         // 42n → "42"
 *   datePolicy: 'iso',              // Date → ISO string
 *   binaryPolicy: 'base64',         // Uint8Array → base64
 *   undefinedPolicy: 'null'         // undefined → null
 * };
 * ```
 */
export interface CanonicalEncodeConfig {
        /**
         * How to handle non-finite numbers (NaN, Infinity, -Infinity).
         *
         * - `'error'` - Return an error (default, strict)
         * - `'string'` - Encode as string: "NaN", "Infinity", "-Infinity"
         * - `'null'` - Convert to null
         */
        readonly specialNumberPolicy: SpecialNumberPolicy;

        /**
         * How to handle BigInt values.
         *
         * - `'error'` - Return an error (rejects BigInt)
         * - `'string'` - Encode as string: 42n → "42" (default, safe)
         * - `'number'` - Convert to number if safe, error if outside safe integer range
         */
        readonly bigintPolicy: BigIntPolicy;

        /**
         * How to handle Date objects.
         *
         * - `'error'` - Return an error (rejects Date)
         * - `'iso'` - Encode as ISO 8601 string (default)
         * - `'epoch-ms'` - Encode as milliseconds since epoch
         */
        readonly datePolicy: DatePolicy;

        /**
         * How to handle Map objects.
         *
         * - `'error'` - Return an error (rejects Map)
         * - `'entries'` - Encode as sorted array of [key, value] pairs (default)
         */
        readonly mapPolicy: MapPolicy;

        /**
         * How to handle Set objects.
         *
         * - `'error'` - Return an error (rejects Set)
         * - `'array-sorted'` - Encode as sorted array of elements (default)
         */
        readonly setPolicy: SetPolicy;

        /**
         * How to handle binary data (Uint8Array, Buffer, etc.).
         *
         * - `'error'` - Return an error (rejects binary)
         * - `'base64'` - Encode as base64 string (default, compact)
         * - `'array'` - Encode as array of numbers
         */
        readonly binaryPolicy: BinaryPolicy;

        /**
         * How to handle undefined values.
         *
         * - `'omit'` - Omit from objects, convert to null in arrays (default)
         * - `'null'` - Convert to null everywhere
         * - `'error'` - Return an error (strict)
         */
        readonly undefinedPolicy: UndefinedPolicy;

        /**
         * Whether to coerce -0 to 0 for consistency.
         *
         * @remarks
         * JavaScript distinguishes between +0 and -0, but they're semantically equal
         * in most contexts. For deterministic hashing, it's usually better to coerce
         * -0 to 0.
         *
         * @defaultValue true
         */
        readonly coerceNegativeZeroToZero: boolean;

        /**
         * Whether to preserve array element order (currently always true).
         *
         * @remarks
         * This exists for potential future array sorting features, but currently
         * arrays are always encoded in their natural order.
         *
         * @defaultValue true
         */
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
