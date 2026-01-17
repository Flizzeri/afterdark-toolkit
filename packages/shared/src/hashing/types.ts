// packages/shared/src/hashing/types.ts

import type { Hash } from '../branded';
import type { Result } from '../result';

/**
 * Supported cryptographic hash algorithms.
 *
 * @remarks
 * - `'sha256'` - 256-bit SHA-2 hash (recommended default)
 * - `'sha512'` - 512-bit SHA-2 hash (more secure, larger output)
 * - `'blake3'` - **Not yet implemented** (reserved for future use)
 *
 * SHA-256 is recommended for most use cases as it provides strong collision
 * resistance with reasonable output size.
 */
export type HashAlgorithm = 'sha256' | 'sha512' | 'blake3';

export interface HasherConfig {
        readonly algorithm: HashAlgorithm;
}

export interface Hasher {
        hash(data: string | Uint8Array): Result<Hash, string>;
}
