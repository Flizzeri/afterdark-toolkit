// tests/unit/cache/fingerprint.test.ts

import fs from 'node:fs/promises';
import path from 'node:path';

import type { FilePath, CanonicalJson, Fingerprint } from '@afterdarktk/shared';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { computeFingerprint, shortFingerprint } from '../../../src/cache/fingerprint.js';
import { isOk } from '../../../src/shared/result.js';

describe('Fingerprint', () => {
        let tmpDir: string;

        beforeEach(async () => {
                tmpDir = path.join(
                        process.cwd(),
                        'tmp-test-fingerprint',
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

        describe('computeFingerprint', () => {
                it('computes fingerprint from content, tsconfig, and version', async () => {
                        const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
                        await fs.writeFile(tsconfigPath, '{"compilerOptions":{}}');

                        const result = await computeFingerprint(tmpDir, {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value.fingerprint).toMatch(/^[0-9a-f]{64}$/);
                                expect(result.value.parts.content).toMatch(/^[0-9a-f]{64}$/);
                                expect(result.value.parts.tsconfig).toMatch(/^[0-9a-f]{64}$/);
                                expect(result.value.parts.tsVersion).toBe('5.0.0');
                        }
                });

                it('produces deterministic fingerprints', async () => {
                        const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
                        await fs.writeFile(tsconfigPath, '{"compilerOptions":{}}');

                        const input = {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        };

                        const result1 = await computeFingerprint(tmpDir, input);
                        const result2 = await computeFingerprint(tmpDir, input);

                        expect(isOk(result1) && isOk(result2)).toBe(true);
                        if (isOk(result1) && isOk(result2)) {
                                expect(result1.value.fingerprint).toBe(result2.value.fingerprint);
                        }
                });

                it('produces different fingerprints for different content', async () => {
                        const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
                        await fs.writeFile(tsconfigPath, '{"compilerOptions":{}}');

                        const result1 = await computeFingerprint(tmpDir, {
                                content: '{"test":"data1"}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        const result2 = await computeFingerprint(tmpDir, {
                                content: '{"test":"data2"}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        expect(isOk(result1) && isOk(result2)).toBe(true);
                        if (isOk(result1) && isOk(result2)) {
                                expect(result1.value.fingerprint).not.toBe(
                                        result2.value.fingerprint,
                                );
                        }
                });

                it('produces different fingerprints for different tsconfig', async () => {
                        const tsconfig1Path = path.join(tmpDir, 'tsconfig1.json');
                        const tsconfig2Path = path.join(tmpDir, 'tsconfig2.json');

                        await fs.writeFile(tsconfig1Path, '{"compilerOptions":{"strict":true}}');
                        await fs.writeFile(tsconfig2Path, '{"compilerOptions":{"strict":false}}');

                        const result1 = await computeFingerprint(tmpDir, {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: tsconfig1Path as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        const result2 = await computeFingerprint(tmpDir, {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: tsconfig2Path as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        expect(isOk(result1) && isOk(result2)).toBe(true);
                        if (isOk(result1) && isOk(result2)) {
                                expect(result1.value.fingerprint).not.toBe(
                                        result2.value.fingerprint,
                                );
                        }
                });

                it('produces different fingerprints for different TS versions', async () => {
                        const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
                        await fs.writeFile(tsconfigPath, '{"compilerOptions":{}}');

                        const result1 = await computeFingerprint(tmpDir, {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        const result2 = await computeFingerprint(tmpDir, {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.1.0',
                        });

                        expect(isOk(result1) && isOk(result2)).toBe(true);
                        if (isOk(result1) && isOk(result2)) {
                                expect(result1.value.fingerprint).not.toBe(
                                        result2.value.fingerprint,
                                );
                        }
                });

                it('handles missing tsconfig gracefully', async () => {
                        const result = await computeFingerprint(tmpDir, {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: '/nonexistent/tsconfig.json' as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value.fingerprint).toMatch(/^[0-9a-f]{64}$/);
                        }
                });

                it('handles binary content', async () => {
                        const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
                        await fs.writeFile(tsconfigPath, '{"compilerOptions":{}}');

                        const result = await computeFingerprint(tmpDir, {
                                content: new Uint8Array([1, 2, 3, 4, 5]),
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value.fingerprint).toMatch(/^[0-9a-f]{64}$/);
                        }
                });

                it('handles absolute tsconfig paths', async () => {
                        const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
                        await fs.writeFile(tsconfigPath, '{"compilerOptions":{}}');

                        const result = await computeFingerprint(tmpDir, {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        expect(isOk(result)).toBe(true);
                });

                it('handles relative tsconfig paths', async () => {
                        const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
                        await fs.writeFile(tsconfigPath, '{"compilerOptions":{}}');

                        const result = await computeFingerprint(tmpDir, {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: 'tsconfig.json' as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        expect(isOk(result)).toBe(true);
                });

                it('includes all parts in fingerprint', async () => {
                        const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
                        await fs.writeFile(tsconfigPath, '{"compilerOptions":{}}');

                        const result = await computeFingerprint(tmpDir, {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        expect(isOk(result)).toBe(true);
                        if (isOk(result)) {
                                expect(result.value.parts).toHaveProperty('content');
                                expect(result.value.parts).toHaveProperty('tsconfig');
                                expect(result.value.parts).toHaveProperty('tsVersion');
                        }
                });

                it('produces stable fingerprints across runs', async () => {
                        const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
                        const tsconfigContent = JSON.stringify({
                                compilerOptions: { strict: true, target: 'ES2020' },
                        });
                        await fs.writeFile(tsconfigPath, tsconfigContent);

                        const input = {
                                content: '{"kind":"primitive","primitiveKind":"string"}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.3.3',
                        };

                        const result1 = await computeFingerprint(tmpDir, input);
                        await new Promise((resolve) => setTimeout(resolve, 10));
                        const result2 = await computeFingerprint(tmpDir, input);

                        expect(isOk(result1) && isOk(result2)).toBe(true);
                        if (isOk(result1) && isOk(result2)) {
                                expect(result1.value.fingerprint).toBe(result2.value.fingerprint);
                                expect(result1.value.parts.content).toBe(
                                        result2.value.parts.content,
                                );
                                expect(result1.value.parts.tsconfig).toBe(
                                        result2.value.parts.tsconfig,
                                );
                        }
                });
        });

        describe('shortFingerprint', () => {
                const testFingerprint =
                        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Fingerprint;

                it('truncates fingerprint to default length', () => {
                        const short = shortFingerprint(testFingerprint);
                        expect(short).toBe('abcdef123456');
                        expect(short).toHaveLength(12);
                });

                it('truncates fingerprint to specified length', () => {
                        const short = shortFingerprint(testFingerprint, 8);
                        expect(short).toBe('abcdef12');
                        expect(short).toHaveLength(8);
                });

                it('ensures minimum length of 4', () => {
                        const short = shortFingerprint(testFingerprint, 2);
                        expect(short).toHaveLength(4);
                });

                it('handles full length request', () => {
                        const short = shortFingerprint(testFingerprint, 64);
                        expect(short).toBe(testFingerprint);
                });

                it('handles length longer than fingerprint', () => {
                        const short = shortFingerprint(testFingerprint, 100);
                        expect(short).toBe(testFingerprint);
                });
        });

        describe('Fingerprint use cases', () => {
                it('detects when content changes', async () => {
                        const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
                        await fs.writeFile(tsconfigPath, '{"compilerOptions":{}}');

                        const v1 = await computeFingerprint(tmpDir, {
                                content: '{"version":1}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        const v2 = await computeFingerprint(tmpDir, {
                                content: '{"version":2}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        expect(isOk(v1) && isOk(v2)).toBe(true);
                        if (isOk(v1) && isOk(v2)) {
                                expect(v1.value.fingerprint).not.toBe(v2.value.fingerprint);
                                expect(v1.value.parts.content).not.toBe(v2.value.parts.content);
                        }
                });

                it('detects when tsconfig changes', async () => {
                        const tsconfigPath = path.join(tmpDir, 'tsconfig.json');

                        await fs.writeFile(tsconfigPath, '{"compilerOptions":{"strict":true}}');
                        const v1 = await computeFingerprint(tmpDir, {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        await fs.writeFile(tsconfigPath, '{"compilerOptions":{"strict":false}}');
                        const v2 = await computeFingerprint(tmpDir, {
                                content: '{"test":"data"}' as CanonicalJson,
                                tsconfigPath: tsconfigPath as FilePath,
                                typescriptVersion: '5.0.0',
                        });

                        expect(isOk(v1) && isOk(v2)).toBe(true);
                        if (isOk(v1) && isOk(v2)) {
                                expect(v1.value.fingerprint).not.toBe(v2.value.fingerprint);
                                expect(v1.value.parts.tsconfig).not.toBe(v2.value.parts.tsconfig);
                        }
                });
        });
});
