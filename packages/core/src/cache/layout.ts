// src/cache/layout.ts

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import {
        type Result,
        type FilePath,
        type HASH_ALGORITHM,
        type Hash,
        ok,
        err,
        isErr,
        CACHE_ROOT,
} from '@afterdarktk/shared';

import { encodeCanonical } from '../canonical/encode.js';
import { computeHash } from '../canonical/hash.js';
import { CACHE_IO_ERROR, CACHE_CORRUPTED } from '../diagnostics/codes.js';
import { makeDiagnostic } from '../diagnostics/factory.js';
import type { Diagnostic } from '../shared/diagnostics.js';

export type CacheKind = 'ir' | 'symbols' | 'indexes';

export type CacheRoot = typeof CACHE_ROOT & FilePath;
export type CachePath = `${CacheRoot}/${CacheKind}`;

export interface CacheEntryEnvelope<T> {
        readonly v: 1; // schema version for cache envelopes
        readonly algo: typeof HASH_ALGORITHM;
        readonly checksum: Hash; // hex
        readonly payload: T;
}

/**
 * Resolve the canonical cache root: <repo>/.afterdarktk/cache
 */
export function resolveCacheRoot(cwd: string): CacheRoot {
        return path.resolve(cwd, CACHE_ROOT) as CacheRoot;
}

export function resolveCacheDir(root: CacheRoot, kind: CacheKind): CachePath {
        return path.join(root, kind) as CachePath;
}

export async function ensureCacheLayout(root: CacheRoot): Promise<Result<void>> {
        try {
                await fs.mkdir(root, { recursive: true });
                await Promise.all([
                        fs.mkdir(resolveCacheDir(root, 'ir'), { recursive: true }),
                        fs.mkdir(resolveCacheDir(root, 'symbols'), { recursive: true }),
                        fs.mkdir(resolveCacheDir(root, 'indexes'), { recursive: true }),
                ]);
                return ok<void>(undefined);
        } catch {
                const d: Diagnostic = makeDiagnostic({ meta: CACHE_IO_ERROR, args: [root] });
                return err([d]);
        }
}

/** Atomic write via temp + rename (POSIX-safe). */
export async function atomicWriteFile(
        filePath: CachePath,
        data: string | Uint8Array,
): Promise<Result<void>> {
        const dir = path.dirname(filePath);
        const base = path.basename(filePath);
        const tmpName = `${base}.${process.pid}.${Date.now()}.${Math.random()
                .toString(36)
                .slice(2)}.tmp`;
        const tmpPath = path.join(dir, tmpName) as CachePath;

        try {
                await fs.mkdir(dir, { recursive: true });

                // Write to temp file first
                await fs.writeFile(tmpPath, data);

                // fsync the directory on rename safety is platform-dependent; we at least ensure rename is used
                await fs.rename(tmpPath, filePath);

                return ok<void>(undefined);
        } catch {
                // Best-effort cleanup
                try {
                        await fs.rm(tmpPath, { force: true });
                } catch {
                        // Ignore error
                }

                const d: Diagnostic = makeDiagnostic({
                        meta: CACHE_IO_ERROR,
                        args: [filePath],
                });
                return err([d]);
        }
}

export async function writeJsonEnvelope<T>(filePath: CachePath, value: T): Promise<Result<void>> {
        const payload = value as T;
        const hashRes = computeHash(payload);
        if (isErr(hashRes)) return hashRes;
        const checksum = hashRes.value;
        const envelope: CacheEntryEnvelope<T> = {
                v: 1,
                algo: 'sha256',
                checksum,
                payload,
        };
        const encRes = encodeCanonical(envelope);
        if (isErr(encRes)) return encRes;
        return atomicWriteFile(filePath, encRes.value);
}

export async function readJsonEnvelope<T>(filePath: CachePath): Promise<Result<T>> {
        try {
                const raw = await fs.readFile(filePath, 'utf8');
                const parsed = JSON.parse(raw) as CacheEntryEnvelope<T>;

                if (!parsed || parsed.v !== 1 || parsed.algo !== 'sha256') {
                        const d: Diagnostic = makeDiagnostic({
                                meta: CACHE_CORRUPTED,
                                args: [filePath],
                        });
                        return err<T>([d]);
                }

                const expected = computeHash(parsed.payload);
                if (isErr(expected)) return expected;
                if (expected.value !== parsed.checksum) {
                        const d: Diagnostic = makeDiagnostic({
                                meta: CACHE_CORRUPTED,
                                args: [filePath],
                        });
                        return err<T>([d]);
                }

                return ok<T>(parsed.payload);
        } catch {
                const d: Diagnostic = makeDiagnostic({ meta: CACHE_IO_ERROR, args: [filePath] });
                return err<T>([d]);
        }
}

export function cacheFileFor(
        root: CacheRoot,
        kind: CacheKind,
        fingerprint: string,
        extension: '.json' | '.bin' = '.json',
): CachePath {
        const dir = resolveCacheDir(root, kind);
        const name = `${fingerprint}${extension}`;
        return path.join(dir, name) as CachePath;
}
