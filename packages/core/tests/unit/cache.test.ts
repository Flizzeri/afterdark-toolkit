// tests/cache.test.ts
import { promises as fs } from 'node:fs';
import { tmpdir as osTmp } from 'node:os';
import path from 'node:path';

import { describe, it, expect, beforeAll } from 'vitest';

import { computeFingerprint } from '../../src/cache/fingerprint.js';
import {
        resolveCacheRoot,
        ensureCacheLayout,
        cacheFileFor,
        writeJsonEnvelope,
        readJsonEnvelope,
        type CachePath,
} from '../../src/cache/layout.js';
import type { CanonicalJson, FilePath } from '../../src/shared/primitives.js';

export async function simulatePartialWrite(
        target: CachePath,
        partialContent: string,
): Promise<void> {
        const dir = path.dirname(target);
        await fs.mkdir(dir, { recursive: true });
        // Write directly to the final path, intentionally violating atomic protocol
        await fs.writeFile(target, partialContent);
}

const cwd = path.join(osTmp(), `adtk-test-${Date.now()}`);

beforeAll(async () => {
        await fs.mkdir(cwd, { recursive: true });
});

describe('cache layout + atomicity', () => {
        it('creates the cache tree and performs atomic write/read with checksum', async () => {
                const root = resolveCacheRoot(cwd);
                const ensured = await ensureCacheLayout(root);
                expect(ensured.ok).toBe(true);

                const fp = 'deadbeefcafebabe000000000000000000000000000000000000000000000000';
                const file = cacheFileFor(root, 'ir', fp);

                const value = { foo: 'bar', n: 42 };
                const wrote = await writeJsonEnvelope(file, value);
                expect(wrote.ok).toBe(true);

                const read = await readJsonEnvelope<typeof value>(file);
                expect(read.ok).toBe(true);
                if (read.ok) expect(read.value).toEqual(value);
        });

        it('detects corruption via checksum mismatch', async () => {
                const root = resolveCacheRoot(cwd);
                const fp = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
                const file = cacheFileFor(root, 'symbols', fp);

                // simulate a non-envelope or truncated file
                await simulatePartialWrite(file, '{"payload": {"x": 1}, "checksum": "oops"');

                const out = await readJsonEnvelope<{ x: number }>(file);
                expect(out.ok).toBe(false);
        });
});

describe('fingerprint', () => {
        it('fingerprints by content + tsconfig + TS version', async () => {
                const tsconfigPath = path.join(cwd, 'tsconfig.json');
                await fs.writeFile(
                        tsconfigPath,
                        JSON.stringify({ compilerOptions: { strict: true } }),
                );

                const res = await computeFingerprint(cwd, {
                        content: 'some-canonical-content' as CanonicalJson,
                        tsconfigPath: tsconfigPath as FilePath,
                        typescriptVersion: '5.5.0',
                });

                expect(res.ok).toBe(true);

                if (res.ok) {
                        const value = res.value;
                        expect(value.parts.tsVersion).toBe('5.5.0');
                        expect(value.parts.content).toMatch(/^[a-f0-9]{64}$/);
                        expect(value.parts.tsconfig).toMatch(/^[a-f0-9]{64}$/);
                        expect(value.fingerprint).toMatch(/^[a-f0-9]{64}$/);
                }
        });
});
