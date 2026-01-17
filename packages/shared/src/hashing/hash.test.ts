// packages/shared/src/hashing/hash.test.ts

import { describe, it, expect } from 'vitest';

import {
        createHasher,
        hashString,
        hashBytes,
        hashCanonicalJson,
        hashValue,
        DEFAULT_HASHER_CONFIG,
} from './hash.js';
import type { CanonicalJson } from '../branded';

describe('DEFAULT_HASHER_CONFIG', () => {
        it('has sha256 as default algorithm', () => {
                expect(DEFAULT_HASHER_CONFIG.algorithm).toBe('sha256');
        });

        it('is frozen', () => {
                expect(Object.isFrozen(DEFAULT_HASHER_CONFIG)).toBe(true);
        });
});

describe('createHasher', () => {
        it('creates hasher with default config', () => {
                const hasher = createHasher();
                expect(hasher).toBeDefined();
                expect(hasher.hash).toBeDefined();
        });

        it('creates hasher with custom algorithm', () => {
                const hasher = createHasher({ algorithm: 'sha512' });
                expect(hasher).toBeDefined();
        });

        it('creates hasher with blake3 algorithm', () => {
                const hasher = createHasher({ algorithm: 'blake3' });
                expect(hasher).toBeDefined();
        });
});

describe('Hasher.hash', () => {
        it('hashes string with sha256', () => {
                const hasher = createHasher({ algorithm: 'sha256' });
                const result = hasher.hash('hello');

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe(
                                '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
                        );
                }
        });

        it('hashes string with sha512', () => {
                const hasher = createHasher({ algorithm: 'sha512' });
                const result = hasher.hash('hello');

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe(
                                '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043',
                        );
                }
        });

        it('hashes empty string', () => {
                const hasher = createHasher({ algorithm: 'sha256' });
                const result = hasher.hash('');

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe(
                                'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                        );
                }
        });

        it('hashes Uint8Array', () => {
                const hasher = createHasher({ algorithm: 'sha256' });
                const bytes = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
                const result = hasher.hash(bytes);

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe(
                                '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
                        );
                }
        });

        it('hashes empty Uint8Array', () => {
                const hasher = createHasher({ algorithm: 'sha256' });
                const result = hasher.hash(new Uint8Array([]));

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe(
                                'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                        );
                }
        });

        it('produces different hashes for different inputs', () => {
                const hasher = createHasher({ algorithm: 'sha256' });
                const result1 = hasher.hash('hello');
                const result2 = hasher.hash('world');

                expect(result1.ok).toBe(true);
                expect(result2.ok).toBe(true);
                if (result1.ok && result2.ok) {
                        expect(result1.value).not.toBe(result2.value);
                }
        });

        it('produces same hash for same input', () => {
                const hasher = createHasher({ algorithm: 'sha256' });
                const result1 = hasher.hash('hello');
                const result2 = hasher.hash('hello');

                expect(result1.ok).toBe(true);
                expect(result2.ok).toBe(true);
                if (result1.ok && result2.ok) {
                        expect(result1.value).toBe(result2.value);
                }
        });

        it('handles UTF-8 strings correctly', () => {
                const hasher = createHasher({ algorithm: 'sha256' });
                const result = hasher.hash('Hello 世界 🌍');

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                }
        });
});

describe('hashString', () => {
        it('hashes string with default algorithm', () => {
                const result = hashString('test');

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe(
                                '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
                        );
                }
        });

        it('hashes string with custom algorithm', () => {
                const result = hashString('test', { algorithm: 'sha512' });

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{128}$/);
                }
        });

        it('handles empty string', () => {
                const result = hashString('');

                expect(result.ok).toBe(true);
        });
});

describe('hashBytes', () => {
        it('hashes bytes with default algorithm', () => {
                const bytes = new Uint8Array([116, 101, 115, 116]); // "test"
                const result = hashBytes(bytes);

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toBe(
                                '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
                        );
                }
        });

        it('hashes bytes with custom algorithm', () => {
                const bytes = new Uint8Array([116, 101, 115, 116]); // "test"
                const result = hashBytes(bytes, { algorithm: 'sha512' });

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{128}$/);
                }
        });

        it('handles empty byte array', () => {
                const result = hashBytes(new Uint8Array([]));

                expect(result.ok).toBe(true);
        });

        it('handles binary data', () => {
                const bytes = new Uint8Array([0, 1, 2, 255, 254, 253]);
                const result = hashBytes(bytes);

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                }
        });
});

describe('hashCanonicalJson', () => {
        it('hashes canonical JSON string', () => {
                const json = '{"a":1,"b":2}' as CanonicalJson;
                const result = hashCanonicalJson(json);

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                }
        });

        it('produces same hash for same JSON', () => {
                const json = '{"a":1,"b":2}' as CanonicalJson;
                const result1 = hashCanonicalJson(json);
                const result2 = hashCanonicalJson(json);

                expect(result1.ok).toBe(true);
                expect(result2.ok).toBe(true);
                if (result1.ok && result2.ok) {
                        expect(result1.value).toBe(result2.value);
                }
        });

        it('produces different hash for different JSON', () => {
                const json1 = '{"a":1}' as CanonicalJson;
                const json2 = '{"a":2}' as CanonicalJson;
                const result1 = hashCanonicalJson(json1);
                const result2 = hashCanonicalJson(json2);

                expect(result1.ok).toBe(true);
                expect(result2.ok).toBe(true);
                if (result1.ok && result2.ok) {
                        expect(result1.value).not.toBe(result2.value);
                }
        });

        it('works with custom algorithm', () => {
                const json = '{"test":true}' as CanonicalJson;
                const result = hashCanonicalJson(json, { algorithm: 'sha512' });

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{128}$/);
                }
        });
});

describe('hashValue', () => {
        it('encodes and hashes a simple object', () => {
                const result = hashValue({ a: 1, b: 2 });

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                }
        });

        it('produces same hash for equivalent objects with different key order', () => {
                const result1 = hashValue({ z: 3, a: 1, m: 2 });
                const result2 = hashValue({ a: 1, m: 2, z: 3 });

                expect(result1.ok).toBe(true);
                expect(result2.ok).toBe(true);
                if (result1.ok && result2.ok) {
                        expect(result1.value).toBe(result2.value);
                }
        });

        it('hashes primitives', () => {
                const result1 = hashValue(42);
                const result2 = hashValue('hello');
                const result3 = hashValue(true);
                const result4 = hashValue(null);

                expect(result1.ok).toBe(true);
                expect(result2.ok).toBe(true);
                expect(result3.ok).toBe(true);
                expect(result4.ok).toBe(true);
        });

        it('hashes arrays', () => {
                const result = hashValue([1, 2, 3]);

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                }
        });

        it('hashes nested structures', () => {
                const result = hashValue({
                        user: {
                                name: 'Alice',
                                tags: ['developer', 'typescript'],
                        },
                });

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                }
        });

        it('returns error when encoding fails', () => {
                const result = hashValue(NaN);

                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error).toContain('Failed to encode value for hashing');
                }
        });

        it('uses custom hasher config', () => {
                const result = hashValue({ a: 1 }, { hasher: { algorithm: 'sha512' } });

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{128}$/);
                }
        });

        it('uses custom encoder config', () => {
                const result = hashValue(42n, {
                        encoder: { bigintPolicy: 'string' },
                });

                expect(result.ok).toBe(true);
        });

        it('propagates encoding errors', () => {
                const result = hashValue(42n, {
                        encoder: { bigintPolicy: 'error' },
                });

                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.error).toContain('BigInt');
                }
        });

        it('handles Date objects', () => {
                const date = new Date('2024-01-15T12:00:00.000Z');
                const result = hashValue(date);

                expect(result.ok).toBe(true);
        });

        it('handles Maps', () => {
                const map = new Map([
                        ['a', 1],
                        ['b', 2],
                ]);
                const result = hashValue(map);

                expect(result.ok).toBe(true);
        });

        it('handles Sets', () => {
                const set = new Set([3, 1, 2]);
                const result = hashValue(set);

                expect(result.ok).toBe(true);
        });

        it('handles binary data', () => {
                const bytes = new Uint8Array([1, 2, 3]);
                const result = hashValue(bytes);

                expect(result.ok).toBe(true);
        });

        it('produces deterministic hashes', () => {
                const obj = {
                        nums: [3, 1, 2],
                        str: 'test',
                        nested: { a: 1, b: 2 },
                };

                const result1 = hashValue(obj);
                const result2 = hashValue(obj);

                expect(result1.ok).toBe(true);
                expect(result2.ok).toBe(true);
                if (result1.ok && result2.ok) {
                        expect(result1.value).toBe(result2.value);
                }
        });
});

describe('hash algorithms', () => {
        it('sha256 produces 64 character hex string', () => {
                const result = hashString('test', { algorithm: 'sha256' });

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{64}$/);
                        expect(result.value.length).toBe(64);
                }
        });

        it('sha512 produces 128 character hex string', () => {
                const result = hashString('test', { algorithm: 'sha512' });

                expect(result.ok).toBe(true);
                if (result.ok) {
                        expect(result.value).toMatch(/^[0-9a-f]{128}$/);
                        expect(result.value.length).toBe(128);
                }
        });

        it('different algorithms produce different hashes', () => {
                const input = 'test';
                const sha256Result = hashString(input, { algorithm: 'sha256' });
                const sha512Result = hashString(input, { algorithm: 'sha512' });

                expect(sha256Result.ok).toBe(true);
                expect(sha512Result.ok).toBe(true);
                if (sha256Result.ok && sha512Result.ok) {
                        expect(sha256Result.value).not.toBe(sha512Result.value);
                }
        });
});
