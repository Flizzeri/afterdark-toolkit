// tests/unit/ts/symbols.test.ts

import { describe, it, expect, beforeAll } from 'vitest';

import { normalizePath } from '../../../src/ts/fs.js';
import { createProgram, type ProgramWrapper } from '../../../src/ts/program.js';
import {
        getSymbolId,
        getTypeId,
        resolveSymbolType,
        getSymbolDeclarations,
        extractJsDocTags,
        getNodeSpan,
        findExportedSymbol,
        isInterfaceDeclaration,
        isTypeAliasDeclaration,
        getInterfacesWithTag,
} from '../../../src/ts/symbols.js';

describe('symbols', () => {
        let wrapper: ProgramWrapper;

        beforeAll(async () => {
                const tsconfigPath = normalizePath('./tests/fixtures/ts/tsconfig.json');
                const result = await createProgram({ tsconfigPath });

                if (!result.ok) {
                        throw new Error('Failed to create program for tests');
                }

                wrapper = result.value;
        });

        describe('getSymbolId', () => {
                it('should return stable symbol ID', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const id1 = getSymbolId(result.value);
                                const id2 = getSymbolId(result.value);

                                expect(id1).toBe(id2);
                                expect(typeof id1).toBe('string');
                                expect(id1.length).toBeGreaterThan(0);
                        }
                });
        });

        describe('getTypeId', () => {
                it('should return stable type ID', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const typeResult = resolveSymbolType(result.value);
                                expect(typeResult.ok).toBe(true);

                                if (typeResult.ok) {
                                        const id1 = getTypeId(typeResult.value);
                                        const id2 = getTypeId(typeResult.value);

                                        expect(id1).toBe(id2);
                                        expect(typeof id1).toBe('string');
                                }
                        }
                });
        });

        describe('resolveSymbolType', () => {
                it('should resolve interface type', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const typeResult = resolveSymbolType(result.value);
                                expect(typeResult.ok).toBe(true);

                                if (typeResult.ok) {
                                        expect(typeResult.value).toBeDefined();
                                        expect(typeResult.value.getText()).toContain('User');
                                }
                        }
                });

                it('should resolve type alias to its target', async () => {
                        const result = findExportedSymbol(wrapper, 'UserId');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const typeResult = resolveSymbolType(result.value);
                                expect(typeResult.ok).toBe(true);

                                if (typeResult.ok) {
                                        const typeText = typeResult.value.getText();
                                        expect(typeText).toBe('string');
                                }
                        }
                });

                it('should resolve union type', async () => {
                        const result = findExportedSymbol(wrapper, 'UserStatus');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const typeResult = resolveSymbolType(result.value);
                                expect(typeResult.ok).toBe(true);

                                if (typeResult.ok) {
                                        expect(typeResult.value.isUnion()).toBe(true);
                                }
                        }
                });
        });

        describe('getSymbolDeclarations', () => {
                it('should return declarations for a symbol', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const decls = getSymbolDeclarations(result.value);
                                expect(decls.length).toBeGreaterThan(0);
                        }
                });
        });

        describe('extractJsDocTags', () => {
                it('should extract JSDoc tags from interface', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const decls = getSymbolDeclarations(result.value);
                                expect(decls.length).toBeGreaterThan(0);

                                const tags = extractJsDocTags(decls[0]!);
                                expect(tags.length).toBeGreaterThan(0);
                                expect(tags.some((tag) => tag.name === 'entity')).toBe(true);
                        }
                });

                it('should normalize JSDoc text', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const decls = getSymbolDeclarations(result.value);
                                const tags = extractJsDocTags(decls[0]!);

                                // Tags should have normalized text (trimmed, collapsed whitespace)
                                tags.forEach((tag) => {
                                        expect(tag.text).not.toMatch(/\s{2,}/); // No multiple spaces
                                        expect(tag.text).not.toMatch(/^\s/); // No leading whitespace
                                        expect(tag.text).not.toMatch(/\s$/); // No trailing whitespace
                                });
                        }
                });

                it('should sort tags deterministically', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const decls = getSymbolDeclarations(result.value);
                                const tags1 = extractJsDocTags(decls[0]!);
                                const tags2 = extractJsDocTags(decls[0]!);

                                // Tags should be in same order
                                expect(tags1).toEqual(tags2);
                        }
                });
        });

        describe('getNodeSpan', () => {
                it('should return source span for node', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const decls = getSymbolDeclarations(result.value);
                                const span = getNodeSpan(decls[0]!);

                                expect(span).toBeDefined();
                                if (span) {
                                        expect(span.filePath).toContain('basic.ts');
                                        expect(span.startLine).toBeGreaterThan(0);
                                        expect(span.startColumn).toBeGreaterThan(0);
                                        expect(span.endLine).toBeGreaterThanOrEqual(span.startLine);
                                }
                        }
                });

                it('should return normalized file path in span', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const decls = getSymbolDeclarations(result.value);
                                const span = getNodeSpan(decls[0]!);

                                expect(span).toBeDefined();
                                if (span) {
                                        // Path should be POSIX-normalized (no backslashes)
                                        expect(span.filePath).not.toContain('\\');
                                }
                        }
                });
        });

        describe('findExportedSymbol', () => {
                it('should find exported interface', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                expect(result.value).toBeDefined();
                        }
                });

                it('should find exported type alias', async () => {
                        const result = findExportedSymbol(wrapper, 'UserId');
                        expect(result.ok).toBe(true);
                });

                it('should return error for non-existent symbol', async () => {
                        const result = findExportedSymbol(wrapper, 'NonExistent');
                        expect(result.ok).toBe(false);

                        if (!result.ok) {
                                expect(result.diagnostics).toHaveLength(1);
                                expect(result.diagnostics[0]?.message).toContain('not found');
                        }
                });
        });

        describe('isInterfaceDeclaration', () => {
                it('should identify interface declarations', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const decls = getSymbolDeclarations(result.value);
                                expect(isInterfaceDeclaration(decls[0]!)).toBe(true);
                        }
                });

                it('should return false for type aliases', async () => {
                        const result = findExportedSymbol(wrapper, 'UserId');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const decls = getSymbolDeclarations(result.value);
                                expect(isInterfaceDeclaration(decls[0]!)).toBe(false);
                        }
                });
        });

        describe('isTypeAliasDeclaration', () => {
                it('should identify type alias declarations', async () => {
                        const result = findExportedSymbol(wrapper, 'UserId');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const decls = getSymbolDeclarations(result.value);
                                expect(isTypeAliasDeclaration(decls[0]!)).toBe(true);
                        }
                });

                it('should return false for interfaces', async () => {
                        const result = findExportedSymbol(wrapper, 'User');
                        expect(result.ok).toBe(true);

                        if (result.ok) {
                                const decls = getSymbolDeclarations(result.value);
                                expect(isTypeAliasDeclaration(decls[0]!)).toBe(false);
                        }
                });
        });

        describe('getInterfacesWithTag', () => {
                it('should find interfaces with @entity tag', () => {
                        const interfaces = getInterfacesWithTag(wrapper, 'entity');
                        expect(interfaces.length).toBeGreaterThan(0);

                        const userInterface = interfaces.find(
                                (iface) => iface.getName() === 'User',
                        );
                        expect(userInterface).toBeDefined();
                });

                it('should return empty array for non-existent tag', () => {
                        const interfaces = getInterfacesWithTag(wrapper, 'nonexistent');
                        expect(interfaces.length).toBe(0);
                });

                it('should be stable across multiple calls', () => {
                        const interfaces1 = getInterfacesWithTag(wrapper, 'entity');
                        const interfaces2 = getInterfacesWithTag(wrapper, 'entity');

                        expect(interfaces1.length).toBe(interfaces2.length);
                        expect(interfaces1.map((i) => i.getName())).toEqual(
                                interfaces2.map((i) => i.getName()),
                        );
                });
        });
});
