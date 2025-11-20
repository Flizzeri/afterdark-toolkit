// packages/core/tests/unit/cache/layout.test.ts

import fs from 'node:fs/promises';
import path from 'node:path';

import { isOk, isErr } from '@afterdarktk/shared';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
        resolveCacheRoot,
        resolveCacheDir,
        ensureCacheLayout,
        atomicWriteFile,
        writeJsonEnvelope,
        readJsonEnvelope,
        cacheFileFor,
        type CachePath,
} from '../../../src/cache/layout.js';

describe('Cache Layout', () => {
        let tmpDir: string;

        beforeEach(async () => {
                tmpDir = path.join(
                        process.cwd(),
                        'tmp-test-cache',
                        `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                );
                await fs.mkdir(tmpDir, { recursive: true });
        });

        afterEach(async () => {
                try {
                        await fs.rm(tmpDir, { recursive: true, force: true });
                } catch {
                        // Ignore cleanup errors
                }
        });

        describe('resolveCacheRoot', () => {
                it('resolves cache root path', () => {
                        const root = resolveCacheRoot(tmpDir);
                        expect(root).toContain('.afterdarktk');
                        expect(root).toContain('cache');
                });

                it('produces absolute paths', () => {
                        const root = resolveCacheRoot(tmpDir);
                        expect(path.isAbsolute(root)).toBe(true);
                });
        });

        describe('resolveCacheDir', () => {
                it('resolves ir directory', () => {
                        const root = resolveCacheRoot(tmpDir);
                        const dir = resolveCacheDir(root, 'ir');
                        expect(dir).toContain('ir');
                });

                it('resolves symbols directory', () => {
                        const root = resolveCacheRoot(tmpDir);
                        const dir = resolveCacheDir(root, 'symbols');
                        expect(dir).toContain('symbols');
                });

                it('resolves indexes directory', () => {
                        const root = resolveCacheRoot(tmpDir);
                        const dir = resolveCacheDir(root, 'indexes');
                        expect(dir).toContain('indexes');
                });
        });

        describe('ensureCacheLayout', () => {
                it('creates cache directory structure', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        const result = await ensureCacheLayout(root);

                        expect(isOk(result)).toBe(true);

                        const rootExists = await fs
                                .access(root)
                                .then(() => true)
                                .catch(() => false);
                        expect(rootExists).toBe(true);
                });

                it('creates all subdirectories', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);

                        const irDir = resolveCacheDir(root, 'ir');
                        const symbolsDir = resolveCacheDir(root, 'symbols');
                        const indexesDir = resolveCacheDir(root, 'indexes');

                        const irExists = await fs
                                .access(irDir)
                                .then(() => true)
                                .catch(() => false);
                        const symbolsExists = await fs
                                .access(symbolsDir)
                                .then(() => true)
                                .catch(() => false);
                        const indexesExists = await fs
                                .access(indexesDir)
                                .then(() => true)
                                .catch(() => false);

                        expect(irExists).toBe(true);
                        expect(symbolsExists).toBe(true);
                        expect(indexesExists).toBe(true);
                });

                it('is idempotent', async () => {
                        const root = resolveCacheRoot(tmpDir);

                        const result1 = await ensureCacheLayout(root);
                        const result2 = await ensureCacheLayout(root);

                        expect(isOk(result1)).toBe(true);
                        expect(isOk(result2)).toBe(true);
                });
        });

        describe('atomicWriteFile', () => {
                it('writes file atomically', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);

                        const filePath = cacheFileFor(root, 'ir', 'test-fingerprint');
                        const result = await atomicWriteFile(filePath, 'test content');

                        expect(isOk(result)).toBe(true);

                        const content = await fs.readFile(filePath, 'utf8');
                        expect(content).toBe('test content');
                });

                it('creates parent directories', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        const filePath = path.join(
                                root,
                                'new-dir',
                                'nested',
                                'file.json',
                        ) as CachePath;

                        const result = await atomicWriteFile(filePath, 'content');
                        expect(isOk(result)).toBe(true);

                        const content = await fs.readFile(filePath, 'utf8');
                        expect(content).toBe('content');
                });

                it('overwrites existing files', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);
                        const filePath = cacheFileFor(root, 'ir', 'test');

                        await atomicWriteFile(filePath, 'first');
                        await atomicWriteFile(filePath, 'second');

                        const content = await fs.readFile(filePath, 'utf8');
                        expect(content).toBe('second');
                });

                it('writes binary data', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);
                        const filePath = cacheFileFor(root, 'ir', 'binary');

                        const data = new Uint8Array([1, 2, 3, 4, 5]);
                        const result = await atomicWriteFile(filePath, data);

                        expect(isOk(result)).toBe(true);

                        const content = await fs.readFile(filePath);
                        expect(content).toEqual(Buffer.from(data));
                });
        });

        describe('writeJsonEnvelope', () => {
                it('writes JSON with checksum', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);
                        const filePath = cacheFileFor(root, 'ir', 'test');

                        const payload = { data: 'test', value: 42 };
                        const result = await writeJsonEnvelope(filePath, payload);

                        expect(isOk(result)).toBe(true);

                        const raw = await fs.readFile(filePath, 'utf8');
                        const parsed = JSON.parse(raw);

                        expect(parsed.v).toBe(1);
                        expect(parsed.algo).toBe('sha256');
                        expect(parsed.checksum).toMatch(/^[0-9a-f]{64}$/);
                        expect(parsed.payload).toEqual(payload);
                });

                it('produces deterministic output', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);

                        const payload = { z: 3, a: 1, m: 2 };

                        const path1 = cacheFileFor(root, 'ir', 'test1');
                        const path2 = cacheFileFor(root, 'ir', 'test2');

                        await writeJsonEnvelope(path1, payload);
                        await writeJsonEnvelope(path2, payload);

                        const content1 = await fs.readFile(path1, 'utf8');
                        const content2 = await fs.readFile(path2, 'utf8');

                        expect(content1).toBe(content2);
                });
        });

        describe('readJsonEnvelope', () => {
                it('reads and validates JSON envelope', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);
                        const filePath = cacheFileFor(root, 'ir', 'test');

                        const payload = { data: 'test', value: 42 };
                        await writeJsonEnvelope(filePath, payload);

                        const result = await readJsonEnvelope<typeof payload>(filePath);

                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toEqual(payload);
                        }
                });

                it('detects corrupted checksums', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);
                        const filePath = cacheFileFor(root, 'ir', 'test');

                        const envelope = {
                                v: 1,
                                algo: 'sha256',
                                checksum: '0'.repeat(64),
                                payload: { data: 'test' },
                        };

                        await fs.writeFile(filePath, JSON.stringify(envelope));

                        const result = await readJsonEnvelope(filePath);
                        expect(isErr(result)).toBe(true);
                        if (isErr(result)) {
                                expect(result.diagnostics[0].code).toBe('ADTK-IR-9101');
                        }
                });

                it('rejects invalid version', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);
                        const filePath = cacheFileFor(root, 'ir', 'test');

                        const envelope = {
                                v: 999,
                                algo: 'sha256',
                                checksum: '0'.repeat(64),
                                payload: { data: 'test' },
                        };

                        await fs.writeFile(filePath, JSON.stringify(envelope));

                        const result = await readJsonEnvelope(filePath);
                        expect(isErr(result)).toBe(true);
                });

                it('rejects invalid algorithm', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);
                        const filePath = cacheFileFor(root, 'ir', 'test');

                        const envelope = {
                                v: 1,
                                algo: 'md5',
                                checksum: '0'.repeat(64),
                                payload: { data: 'test' },
                        };

                        await fs.writeFile(filePath, JSON.stringify(envelope));

                        const result = await readJsonEnvelope(filePath);
                        expect(isErr(result)).toBe(true);
                });

                it('returns error for non-existent file', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        const filePath = cacheFileFor(root, 'ir', 'nonexistent');

                        const result = await readJsonEnvelope(filePath);
                        expect(isErr(result)).toBe(true);
                        if (isErr(result)) {
                                expect(result.diagnostics[0].code).toBe('ADTK-IR-9102');
                        }
                });
        });

        describe('cacheFileFor', () => {
                it('generates cache file paths', () => {
                        const root = resolveCacheRoot(tmpDir);
                        const filePath = cacheFileFor(root, 'ir', 'abc123');

                        expect(filePath).toContain('ir');
                        expect(filePath).toContain('abc123');
                        expect(filePath).toMatch(/\.json$/);
                });

                it('supports different extensions', () => {
                        const root = resolveCacheRoot(tmpDir);
                        const jsonPath = cacheFileFor(root, 'ir', 'test', '.json');
                        const binPath = cacheFileFor(root, 'ir', 'test', '.bin');

                        expect(jsonPath).toMatch(/\.json$/);
                        expect(binPath).toMatch(/\.bin$/);
                });

                it('uses json extension by default', () => {
                        const root = resolveCacheRoot(tmpDir);
                        const filePath = cacheFileFor(root, 'ir', 'test');

                        expect(filePath).toMatch(/\.json$/);
                });
        });

        describe('Round-trip integrity', () => {
                it('preserves complex data structures', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);
                        const filePath = cacheFileFor(root, 'ir', 'complex');

                        const payload = {
                                kind: 'object',
                                properties: [
                                        {
                                                name: 'id',
                                                type: {
                                                        kind: 'primitive',
                                                        primitiveKind: 'string',
                                                },
                                                optional: false,
                                        },
                                ],
                                nested: {
                                        array: [1, 2, 3],
                                        map: { a: 1, b: 2 },
                                },
                        };

                        await writeJsonEnvelope(filePath, payload);
                        const result = await readJsonEnvelope<typeof payload>(filePath);

                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toEqual(payload);
                        }
                });

                it('preserves null and false values', async () => {
                        const root = resolveCacheRoot(tmpDir);
                        await ensureCacheLayout(root);
                        const filePath = cacheFileFor(root, 'ir', 'nulls');

                        const payload = {
                                nullValue: null,
                                falseValue: false,
                                zeroValue: 0,
                                emptyString: '',
                        };

                        await writeJsonEnvelope(filePath, payload);
                        const result = await readJsonEnvelope<typeof payload>(filePath);

                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value).toEqual(payload);
                                expect(result.value.nullValue).toBe(null);
                                expect(result.value.falseValue).toBe(false);
                                expect(result.value.zeroValue).toBe(0);
                                expect(result.value.emptyString).toBe('');
                        }
                });
        });
});
