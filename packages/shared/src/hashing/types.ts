// packages/shared/src/hashing/types.ts

import type { Hash } from '../branded';
import type { Result } from '../result';

export type HashAlgorithm = 'sha256' | 'sha512' | 'blake3';

export interface HasherConfig {
        readonly algorithm: HashAlgorithm;
}

export interface Hasher {
        hash(data: string | Uint8Array): Result<Hash, string>;
}
