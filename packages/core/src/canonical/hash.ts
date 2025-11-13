// core/canonical/hash.ts

import { createHash } from 'crypto';

import { encodeCanonical, type CanonicalEncodeConfig } from '../canonical/encode.js';
import { CANONICAL_UNSUPPORTED_TYPE } from '../diagnostics/codes.js';
import { makeDiagnostic } from '../diagnostics/factory.js';
import type { Hash } from '../shared/primitives';
import { ok, err, isErr, type Result } from '../shared/result.js';

/**
 * Computes a deterministic SHA-256 hash of the canonical JSON representation
 * of a value.  Never throws.
 */
export function computeHash(value: unknown, config?: Partial<CanonicalEncodeConfig>): Result<Hash> {
        const encRes = encodeCanonical(value, config);
        if (isErr(encRes)) return encRes; // propagate encoding diagnostics

        try {
                const hasher = createHash('sha256');
                hasher.update(encRes.value, 'utf8');
                const digest = hasher.digest('hex') as Hash;
                return ok(digest);
        } catch (e) {
                return err([
                        makeDiagnostic({
                                meta: CANONICAL_UNSUPPORTED_TYPE,
                                args: [`Hashing failure: ${String(e)}`],
                        }),
                ]);
        }
}
