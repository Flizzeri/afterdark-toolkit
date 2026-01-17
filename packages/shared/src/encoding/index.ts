// packages/shared/src/encoding/index.ts

export type {
        CanonicalEncodeConfig,
        CanonicalEncodeError,
        CanonicalEncodeErrorReason,
        SpecialNumberPolicy,
        BigIntPolicy,
        DatePolicy,
        MapPolicy,
        SetPolicy,
        BinaryPolicy,
        UndefinedPolicy,
        JsonValue,
        JsonPrimitive,
} from './types.js';

export { encodeCanonical } from './canonical.js';
export { DEFAULT_CANONICAL_CONFIG } from './utils.js';
