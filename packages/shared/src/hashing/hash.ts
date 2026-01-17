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
