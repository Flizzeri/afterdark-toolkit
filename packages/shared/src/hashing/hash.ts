// packages/shared/src/hashing/hash.ts

import { createHash } from 'node:crypto';

import type { Hash, CanonicalJson } from '../branded';
import { encodeCanonical, type CanonicalEncodeConfig } from '../encoding';
import { ok, err, type Result } from '../result';
import type { HasherConfig, Hasher } from './types.js';

export const DEFAULT_HASHER_CONFIG: HasherConfig = Object.freeze({
        algorithm: 'sha256',
});

class NodeHasher implements Hasher {
        public constructor(private readonly config: HasherConfig) {
                this.config = config;
        }

        public hash(data: string | Uint8Array): Result<Hash, string> {
                try {
                        const hashImpl = createHash(this.config.algorithm);

                        if (typeof data === 'string') {
                                hashImpl.update(data, 'utf8');
                        } else {
                                hashImpl.update(data);
                        }

                        const digest = hashImpl.digest('hex');
                        return ok(digest as Hash);
                } catch (error) {
                        return err(
                                `Failed to hash with ${this.config.algorithm}: ${error instanceof Error ? error.message : String(error)}`,
                        );
                }
        }
}

/**
 * Creates a hasher with the specified algorithm configuration.
 *
 * @remarks
 * The hasher provides a consistent interface for cryptographic hashing
 * regardless of the underlying algorithm. All hashers return branded `Hash`
 * types and use `Result` for error handling.
 *
 * **Supported algorithms:**
 * - `'sha256'` - SHA-256 (default, recommended for most use cases)
 * - `'sha512'` - SHA-512 (more secure but larger output)
 * - `'blake3'` - **Not yet implemented** (will be added in future release)
 *
 * SHA-256 provides a good balance of performance and collision resistance
 * for content-addressable caching.
 *
 * @example
 * ```typescript
 * const hasher = createHasher({ algorithm: 'sha256' });
 *
 * const result1 = hasher.hash('hello');
 * const result2 = hasher.hash(new Uint8Array([104, 101, 108, 108, 111]));
 *
 * if (result1.ok && result2.ok) {
 *   console.log(result1.value === result2.value); // true
 * }
 * ```
 */
export function createHasher(config: Partial<HasherConfig> = {}): Hasher {
        const cfg: HasherConfig = { ...DEFAULT_HASHER_CONFIG, ...config };
        return new NodeHasher(cfg);
}

export function hashString(data: string, config: Partial<HasherConfig> = {}): Result<Hash, string> {
        const hasher = createHasher(config);
        return hasher.hash(data);
}

export function hashBytes(
        data: Uint8Array,
        config: Partial<HasherConfig> = {},
): Result<Hash, string> {
        const hasher = createHasher(config);
        return hasher.hash(data);
}

export function hashCanonicalJson(
        json: CanonicalJson,
        config: Partial<HasherConfig> = {},
): Result<Hash, string> {
        return hashString(json, config);
}

/**
 * Hashes an arbitrary (structured) value using canonical encoding.
 *
 * @remarks
 * This is the recommended way to hash structured data (objects, arrays, IR nodes).
 * It combines canonical encoding with cryptographic hashing to produce a stable
 * content hash.
 *
 * If encoding fails (e.g., circular reference, unsupported type), an error
 * is returned with a descriptive message.
 */
export function hashValue(
        value: unknown,
        options: {
                hasher?: Partial<HasherConfig>;
                encoder?: Partial<CanonicalEncodeConfig>;
        } = {},
): Result<Hash, string> {
        const encodeResult = encodeCanonical(value, options.encoder);

        if (!encodeResult.ok) {
                return err(
                        `Failed to encode value for hashing: ${encodeResult.error.message} at ${encodeResult.error.path}`,
                );
        }

        return hashCanonicalJson(encodeResult.value, options.hasher);
}
