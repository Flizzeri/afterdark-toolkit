// packages/shared/src/branded/utils.test.ts

import * as path from 'node:path';

import { describe, it, expect } from 'vitest';

import { filePath, semVer, entityName, symbolId, typeId, nodeId, jsDocTagName } from './utils.js';
import { isOk, isErr } from '../result/utils.js';

describe('branded/utils', () => {
        describe('filePath', () => {
                it('creates FilePath from absolute path', () => {
                        const result = filePath('/absolute/path/to/file.ts');

                        expect(isOk(result)).toBe(true);
                        if (!isOk(result)) return;

                        expect(result.value).toBe('/absolute/path/to/file.ts');
                });

                it('resolves relative paths to absolute', () => {
                        const result = filePath('./types.ts');

                        expect(isOk(result)).toBe(true);
                        if (!isOk(result)) return;

                        expect(path.isAbsolute(result.value)).toBe(true);
                        expect(result.value).toContain('/types.ts');
                });

                it('normalizes to forward slashes', () => {
                        const result = filePath(__dirname);

                        expect(isOk(result)).toBe(true);
                        if (!isOk(result)) return;

                        expect(result.value).not.toContain('\\');
                });

                it('returns error for empty path', () => {
                        const result = filePath('');

                        expect(isErr(result)).toBe(true);
                        if (!isErr(result)) return;

                        expect(result.error).toBe('File path cannot be empty');
                });

                it('returns error for whitespace-only path', () => {
                        const result = filePath('   ');

                        expect(isErr(result)).toBe(true);
                });
        });

        describe('semVer', () => {
                it('accepts valid semantic versions', () => {
                        const versions = ['1.2.3', '0.0.1', '10.20.30'];

                        for (const v of versions) {
                                const result = semVer(v);
                                expect(isOk(result)).toBe(true);
                                if (isOk(result)) {
                                        expect(result.value).toBe(v);
                                }
                        }
                });

                it('accepts prerelease versions', () => {
                        const versions = [
                                '1.0.0-alpha',
                                '1.0.0-alpha.1',
                                '1.0.0-0.3.7',
                                '1.0.0-x.7.z.92',
                        ];

                        for (const v of versions) {
                                const result = semVer(v);
                                expect(isOk(result)).toBe(true);
                        }
                });

                it('accepts build metadata', () => {
                        const versions = [
                                '1.0.0+build',
                                '1.0.0+build.123',
                                '1.0.0-alpha+build',
                                '1.0.0-alpha.1+build.456',
                        ];

                        for (const v of versions) {
                                const result = semVer(v);
                                expect(isOk(result)).toBe(true);
                        }
                });

                it('returns error for malformed versions', () => {
                        const invalid = [
                                '1.2', // Missing patch
                                '1', // Missing minor and patch
                                'v1.2.3', // Leading 'v'
                                '1.2.x', // Non-numeric component
                                '01.2.3', // Leading zero
                                '1.02.3', // Leading zero
                                '1.2.03', // Leading zero
                                '1.2.3-', // Trailing dash
                                '1.2.3+', // Trailing plus
                                '1.2.3.4', // Too many components
                        ];

                        for (const v of invalid) {
                                const result = semVer(v);
                                expect(isErr(result)).toBe(true);
                                if (isErr(result)) {
                                        expect(result.error).toContain('Invalid semantic version');
                                }
                        }
                });

                it('returns error for empty version', () => {
                        const result = semVer('');

                        expect(isErr(result)).toBe(true);
                        if (!isErr(result)) return;

                        expect(result.error).toBe('Version cannot be empty');
                });

                it('returns error for whitespace-only version', () => {
                        const result = semVer('   ');

                        expect(isErr(result)).toBe(true);
                        if (!isErr(result)) return;

                        expect(result.error).toBe('Version cannot be empty');
                });

                it('trims whitespace from version', () => {
                        const result = semVer('  1.2.3  ');

                        expect(isOk(result)).toBe(true);
                        if (!isOk(result)) return;

                        expect(result.value).toBe('1.2.3');
                });
        });

        describe('entityName', () => {
                it('creates EntityName from string', () => {
                        const name = entityName('User');
                        expect(name).toBe('User');
                });

                it('accepts any string', () => {
                        const names = ['User', 'user', 'user_entity', '123', ''];
                        for (const n of names) {
                                expect(entityName(n)).toBe(n);
                        }
                });
        });

        describe('symbolId', () => {
                it('creates SymbolId from string', () => {
                        const id = symbolId('User#src/types.ts#a1b2c3');
                        expect(id).toBe('User#src/types.ts#a1b2c3');
                });
        });

        describe('typeId', () => {
                it('creates TypeId from string', () => {
                        const id = typeId('type_123');
                        expect(id).toBe('type_123');
                });
        });

        describe('nodeId', () => {
                it('creates NodeId from string', () => {
                        const id = nodeId('node_456');
                        expect(id).toBe('node_456');
                });
        });

        describe('jsDocTagName', () => {
                it('creates JsDocTagName from string', () => {
                        const tag = jsDocTagName('validate');
                        expect(tag).toBe('validate');
                });

                it('accepts common JSDoc tags', () => {
                        const tags = ['validate', 'email', 'min', 'max', 'entity'];
                        for (const t of tags) {
                                expect(jsDocTagName(t)).toBe(t);
                        }
                });
        });
});
