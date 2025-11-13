// src/cache/fingerprint.ts

import { promises as fs2 } from 'node:fs';
import * as path2 from 'node:path';

import { encodeCanonical } from '../canonical/encode.js';
import { computeHash } from '../canonical/hash.js';
import { CACHE_IO_ERROR } from '../diagnostics/codes.js';
import { makeDiagnostic } from '../diagnostics/factory.js';
import type { Fingerprint, Hash, FilePath, CanonicalJson } from '../shared/primitives.js';
import { ok, err, isErr, type Result } from '../shared/result.js';

export interface FingerprintInput {
        readonly content: CanonicalJson | Uint8Array; // canonical IR or source summary
        readonly tsconfigPath: FilePath; // absolute or relative to cwd
        readonly typescriptVersion: string; // e.g. from require('typescript').version
}

export interface FingerprintParts {
        readonly content: Hash; // computeHash56 hex of content
        readonly tsconfig: Hash; // computeHash56 hex of the file contents (or "<missing>")
        readonly tsVersion: string;
}

export async function computeFingerprint(
        cwd: string,
        input: FingerprintInput,
): Promise<Result<{ readonly fingerprint: Fingerprint; readonly parts: FingerprintParts }>> {
        try {
                const hashRes = computeHash(
                        typeof input.content === 'string'
                                ? input.content
                                : Buffer.from(input.content),
                );

                // isErr(hashRes) ? const contentHash = hashRes.value:
                if (isErr(hashRes)) return hashRes;
                const contentHash = hashRes.value;

                let tsconfigRaw = '';
                try {
                        const p = path2.isAbsolute(input.tsconfigPath)
                                ? input.tsconfigPath
                                : path2.join(cwd, input.tsconfigPath);
                        tsconfigRaw = await fs2.readFile(p, 'utf8');
                } catch {
                        tsconfigRaw = '<missing>';
                }
                const tsConfigHash = computeHash(tsconfigRaw);
                if (isErr(tsConfigHash)) return tsConfigHash;

                const parts: FingerprintParts = {
                        content: contentHash,
                        tsconfig: tsConfigHash.value,
                        tsVersion: input.typescriptVersion,
                };

                const envelope = {
                        v: 1,
                        ...parts,
                } as const;

                const fp = computeHash(encodeCanonical(envelope)) as Result<Fingerprint>;
                return isErr(fp) ? fp : ok({ fingerprint: fp.value, parts });
        } catch {
                const d = makeDiagnostic({ meta: CACHE_IO_ERROR, args: ['fingerprint'] });
                return err([d]);
        }
}

export function shortFingerprint(fp: Fingerprint, len = 12): string {
        return String(fp).slice(0, Math.max(4, len));
}
