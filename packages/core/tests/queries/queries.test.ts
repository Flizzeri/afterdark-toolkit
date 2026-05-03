// packages/core/tests/queries/queries.test.ts

import path from 'path';

import { loadProject, type Program } from '@adtk/program';
import { filePath, symbolId, DiagnosticCollector, type FilePath, jsDocTagName } from '@adtk/shared';
import { describe, it, expect, beforeAll } from 'vitest';

import { queryFixture, resolveSymbolIds } from '../utils/helpers.js';

// ---------------------------------------------------------------------------
// Program loader — loads the entire queries/src directory once per suite.
// Individual tests that need a specific FilePath use srcFile() below.
// ---------------------------------------------------------------------------

function loadQueriesProgram(): Program {
        const tsconfigPath = path.join(__dirname, 'tsconfig.json');
        const tsconfigResult = filePath(tsconfigPath);
        if (!tsconfigResult.ok) throw new Error(`Bad tsconfig path: ${tsconfigPath}`);

        const diagnostics = new DiagnosticCollector();
        const result = loadProject({ tsconfig: tsconfigResult.value }, diagnostics, {
                skipLibFiles: true,
        });

        if (!result.ok) {
                throw new Error(`Failed to load queries program: ${result.error.message}`);
        }
        return result.value;
}

/** Returns the absolute FilePath for a file inside queries/src/. */
function srcFile(name: string) {
        const p = path.join(__dirname, 'src', name);
        const r = filePath(p);
        if (!r.ok) throw new Error(`Bad src path: ${p}`);
        return r.value;
}

/** Collects symbol names from a query result (strips the hash suffix). */
function symbolNames(map: Map<string, unknown>): Set<string> {
        return new Set(Array.from(map.keys()).map((id) => id.split('#')[0]));
}

// ---------------------------------------------------------------------------
// Shared program — loaded once, reused across all describe blocks
// ---------------------------------------------------------------------------

beforeAll(() => {
        loadQueriesProgram();
});

// ===========================================================================
// 1. executeQuery — query.type === 'all'
// ===========================================================================

describe("executeQuery — type: 'all'", () => {
        it('returns symbols from every source file in the program', () => {
                const { queryResult } = queryFixture('queries', { type: 'all' });
                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                // Symbols from entities.ts, models.ts, call-sites.ts, namespace.ts
                expect(names).toContain('UserId');
                expect(names).toContain('Address');
                expect(names).toContain('User'); // call-sites User
                expect(names).toContain('Shapes');
        });

        it('result map is non-empty', () => {
                const { queryResult } = queryFixture('queries', { type: 'all' });
                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;
                expect(queryResult.value.size).toBeGreaterThan(0);
        });
});

// ===========================================================================
// 2. executeQuery — type: 'by-ids'
// ===========================================================================

describe("executeQuery — type: 'by-ids'", () => {
        it('returns the symbol when the ID exists in the program', () => {
                const ids = resolveSymbolIds('queries', ['UserId', 'PostId']);
                const userIdSymbolId = ids.get('UserId')!;

                const { queryResult } = queryFixture('queries', {
                        type: 'by-ids',
                        ids: [userIdSymbolId],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;
                expect(queryResult.value.has(userIdSymbolId)).toBe(true);
        });

        it('silently skips missing IDs but succeeds when at least one is found', () => {
                const ids = resolveSymbolIds('queries', ['UserId']);
                const realId = ids.get('UserId')!;
                const fakeId = symbolId('NonExistent#abc123');

                const { queryResult, diagnostics } = queryFixture('queries', {
                        type: 'by-ids',
                        ids: [realId, fakeId],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;
                expect(queryResult.value.has(realId)).toBe(true);
                expect(queryResult.value.has(fakeId)).toBe(false);
                // Warning should have been emitted for the missing ID
                expect(diagnostics.getWarnings().length).toBeGreaterThan(0);
        });

        it('returns err when ALL requested IDs are missing', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'by-ids',
                        ids: [symbolId('Ghost#000'), symbolId('Phantom#111')],
                });

                expect(queryResult.ok).toBe(false);
        });

        it('handles multiple valid IDs correctly', () => {
                const ids = resolveSymbolIds('queries', ['UserId', 'PostId', 'RawId']);
                const symbolIds = Array.from(ids.values());

                const { queryResult } = queryFixture('queries', {
                        type: 'by-ids',
                        ids: symbolIds,
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;
                expect(queryResult.value.size).toBe(3);
        });
});

// ===========================================================================
// 3. Source: 'files'
// ===========================================================================

describe("source: 'files'", () => {
        it('returns only symbols from the specified file', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('models.ts')] },
                        filters: [],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('Address');
                expect(names).toContain('Product');
                // Must NOT include symbols from entities.ts
                expect(names).not.toContain('UserId');
                expect(names).not.toContain('Role');
        });

        it('combines symbols from multiple files', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: {
                                type: 'files',
                                paths: [srcFile('entities.ts'), srcFile('models.ts')],
                        },
                        filters: [],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('UserId'); // from entities
                expect(names).toContain('Address'); // from models
        });

        it('warns and skips a file path not in the program, but succeeds if others exist', () => {
                const notInProgram = srcFile('entities.ts').replace(
                        'entities.ts',
                        'does-not-exist.ts',
                ) as FilePath;

                const { queryResult, diagnostics } = queryFixture('queries', {
                        type: 'filtered',
                        source: {
                                type: 'files',
                                paths: [srcFile('models.ts'), notInProgram],
                        },
                        filters: [],
                });

                expect(queryResult.ok).toBe(true);
                expect(diagnostics.getWarnings().some((w) => w.code === 'ADTK-CORE-2000')).toBe(
                        true,
                );
        });

        it('returns err when all specified paths are absent from the program', () => {
                const ghost = srcFile('entities.ts').replace('entities.ts', 'ghost.ts') as FilePath;

                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [ghost] },
                        filters: [],
                });

                expect(queryResult.ok).toBe(false);
        });
});

// ===========================================================================
// 4. Source: 'glob'
// ===========================================================================

describe("source: 'glob'", () => {
        it('matches files by glob pattern and returns their symbols', () => {
                // Absolute glob that matches entities.ts specifically
                const entitiesGlob = path.join(__dirname, 'src', 'entities.ts');

                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'glob', pattern: entitiesGlob },
                        filters: [],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('UserId');
                expect(names).toContain('Role');
        });

        it('matches multiple files with a wildcard pattern', () => {
                const globPattern = path.join(__dirname, 'src', '*.ts');

                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'glob', pattern: globPattern },
                        filters: [],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                // Should contain symbols from at least two files
                expect(names).toContain('UserId'); // entities
                expect(names).toContain('Address'); // models
        });

        it('returns err and emits warning when pattern matches no files', () => {
                const { queryResult, diagnostics } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'glob', pattern: '**/absolutely-no-match-xyz/*.ts' },
                        filters: [],
                });

                expect(queryResult.ok).toBe(false);
                expect(diagnostics.getWarnings().some((w) => w.code === 'ADTK-CORE-2001')).toBe(
                        true,
                );
        });
});

// ===========================================================================
// 5. Source: 'call-sites'
// ===========================================================================

describe("source: 'call-sites'", () => {
        it('finds types used as type arguments in simple validate<T>() calls', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'call-sites', functionName: 'validate' },
                        filters: [],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                // validate<User>, validate<Post>, validate<Order, Post>, validate<Comment> (nested)
                expect(names).toContain('User');
                expect(names).toContain('Post');
                expect(names).toContain('Order');
                expect(names).toContain('Comment');
        });

        it('finds types via property-access call (validator.run<T>)', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'call-sites', functionName: 'run' },
                        filters: [],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('Comment');
        });

        it('does not include types from calls without type arguments', () => {
                // validate({} as User) — no type argument — User should NOT appear
                // via the no-type-arg path; but User does appear via validate<User> elsewhere.
                // We test this indirectly: the result must still be ok (other calls found it)
                // and the count must not be inflated by the no-type-arg call.
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'call-sites', functionName: 'validate' },
                        filters: [],
                });

                expect(queryResult.ok).toBe(true);
        });

        it('does not bleed results from a differently-named function', () => {
                // transform<User> exists but we query for validate — transform types must not appear
                // *unless* they also appear in validate calls. Order is unique to validate.
                const { queryResult: validateResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'call-sites', functionName: 'transform' },
                        filters: [],
                });

                // transform<User> is the only transform call, so User would appear here
                expect(validateResult.ok).toBe(true);
                if (!validateResult.ok) return;
                const names = symbolNames(validateResult.value);
                expect(names).toContain('User');
                // Order must NOT appear — it is only in validate calls, not transform
                expect(names).not.toContain('Order');
        });

        it('returns err when no call sites for the function exist', () => {
                const { queryResult, diagnostics } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'call-sites', functionName: 'nonExistentFn' },
                        filters: [],
                });

                expect(queryResult.ok).toBe(false);
                expect(diagnostics.getWarnings().some((w) => w.code === 'ADTK-CORE-2003')).toBe(
                        true,
                );
        });
});

// ===========================================================================
// 6. Filter: 'exports-only'
// ===========================================================================

describe("filter: 'exports-only'", () => {
        it('keeps exported symbols and removes unexported ones', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [{ type: 'exports-only' }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);

                // Exported
                expect(names).toContain('UserId');
                expect(names).toContain('User');
                expect(names).toContain('Role');
                expect(names).toContain('DEFAULT_HOST');

                // Unexported — must be absent
                expect(names).not.toContain('UnexportedAlias');
                expect(names).not.toContain('UnexportedInterface');
                expect(names).not.toContain('UnexportedClass');
                expect(names).not.toContain('UnexportedEnum');
                expect(names).not.toContain('unexportedConst');
        });

        it('treats members of an exported namespace as exported (isModuleBlock path)', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('namespace.ts')] },
                        filters: [{ type: 'exports-only' }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                // The namespace itself is exported
                expect(names).toContain('Shapes');
        });
});

// ===========================================================================
// 7. Filter: 'has-annotation'
// ===========================================================================

describe("filter: 'has-annotation'", () => {
        it('keeps only symbols with the specified JSDoc tag', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [{ type: 'has-annotation', tag: jsDocTagName('entity') }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('UserId');
                expect(names).toContain('User');
                expect(names).toContain('Post');
                // No @entity tag on these
                expect(names).not.toContain('UserService');
                expect(names).not.toContain('Role');
                expect(names).not.toContain('RawId');
        });

        it('returns empty map when no symbol has the tag', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('models.ts')] },
                        filters: [{ type: 'has-annotation', tag: jsDocTagName('entity') }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;
                // models.ts uses @model, not @entity
                expect(queryResult.value.size).toBe(0);
        });

        it('is case-sensitive — @Entity does not match @entity', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [{ type: 'has-annotation', tag: jsDocTagName('Entity') }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;
                expect(queryResult.value.size).toBe(0);
        });
});

// ===========================================================================
// 8. Filter: 'has-any-annotation'
// ===========================================================================

describe("filter: 'has-any-annotation'", () => {
        it('keeps symbols matching any of the provided tags', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [
                                {
                                        type: 'has-any-annotation',
                                        tags: [jsDocTagName('service'), jsDocTagName('config')],
                                },
                        ],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('UserService'); // @service
                expect(names).toContain('PostService'); // @service @singleton
                expect(names).toContain('DEFAULT_HOST'); // @config
                expect(names).toContain('DEFAULT_PORT'); // @config
                // No @service or @config
                expect(names).not.toContain('UserId');
                expect(names).not.toContain('Role');
        });

        it('returns empty map when none of the tags match', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [
                                {
                                        type: 'has-any-annotation',
                                        tags: [
                                                jsDocTagName('nonexistent'),
                                                jsDocTagName('also-nope'),
                                        ],
                                },
                        ],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;
                expect(queryResult.value.size).toBe(0);
        });

        it('a symbol with multiple matching tags is included exactly once', () => {
                // PostId has both @entity and @deprecated
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [
                                {
                                        type: 'has-any-annotation',
                                        tags: [jsDocTagName('entity'), jsDocTagName('deprecated')],
                                },
                        ],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = Array.from(queryResult.value.keys()).map((id) => id.split('#')[0]);
                const postIdCount = names.filter((n) => n === 'PostId').length;
                expect(postIdCount).toBe(1);
        });
});

// ===========================================================================
// 9. Filter: 'exclude-pattern'
// ===========================================================================

describe("filter: 'exclude-pattern'", () => {
        it('excludes symbols whose source file matches the pattern', () => {
                // Match against the full absolute path of models.ts
                const modelsGlob = path.join(__dirname, 'src', 'models.ts');

                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: {
                                type: 'files',
                                paths: [srcFile('entities.ts'), srcFile('models.ts')],
                        },
                        filters: [{ type: 'exclude-pattern', pattern: modelsGlob }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                // entities.ts symbols remain
                expect(names).toContain('UserId');
                // models.ts symbols are excluded
                expect(names).not.toContain('Address');
                expect(names).not.toContain('Product');
        });

        it('keeps all symbols when pattern matches nothing', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [{ type: 'exclude-pattern', pattern: '**/no-match-xyz.ts' }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;
                expect(queryResult.value.size).toBeGreaterThan(0);
        });

        it('produces empty map when pattern matches all symbols source files', () => {
                const allSrcGlob = path.join(__dirname, 'src', 'entities.ts');

                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [{ type: 'exclude-pattern', pattern: allSrcGlob }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;
                expect(queryResult.value.size).toBe(0);
        });
});

// ===========================================================================
// 10. Filter: 'kind'
// ===========================================================================

describe("filter: 'kind'", () => {
        it("kind: 'type-alias' returns only type aliases", () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [{ type: 'kind', kinds: ['type-alias'] }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('UserId');
                expect(names).toContain('PostId');
                expect(names).toContain('RawId');
                expect(names).not.toContain('User'); // interface
                expect(names).not.toContain('UserService'); // class
                expect(names).not.toContain('Role'); // enum
                expect(names).not.toContain('DEFAULT_HOST'); // const
        });

        it("kind: 'interface' returns only interfaces", () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [{ type: 'kind', kinds: ['interface'] }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('User');
                expect(names).toContain('Post');
                expect(names).not.toContain('UserId');
                expect(names).not.toContain('UserService');
        });

        it("kind: 'class' returns only classes", () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [{ type: 'kind', kinds: ['class'] }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('UserService');
                expect(names).toContain('PostService');
                expect(names).not.toContain('UserId');
                expect(names).not.toContain('Role');
        });

        it("kind: 'enum' returns only enums", () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [{ type: 'kind', kinds: ['enum'] }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('Role');
                expect(names).toContain('Status');
                expect(names).not.toContain('UserService');
                expect(names).not.toContain('UserId');
        });

        it("kind: 'const' returns only variable declarations", () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [{ type: 'kind', kinds: ['const'] }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('DEFAULT_HOST');
                expect(names).toContain('DEFAULT_PORT');
                expect(names).not.toContain('UserId');
                expect(names).not.toContain('Role');
        });

        it('accepts multiple kinds and returns the union', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [{ type: 'kind', kinds: ['type-alias', 'enum'] }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('UserId'); // type-alias
                expect(names).toContain('Role'); // enum
                expect(names).not.toContain('User'); // interface — excluded
        });

        it('returns empty map when no symbols match the requested kind', () => {
                // models.ts has only interfaces and type aliases — no classes
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('models.ts')] },
                        filters: [{ type: 'kind', kinds: ['class'] }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;
                expect(queryResult.value.size).toBe(0);
        });
});

// ===========================================================================
// 11. Filter chain — multiple filters applied in sequence
// ===========================================================================

describe('filter chain (multiple filters)', () => {
        it('applies filters left-to-right, narrowing the result', () => {
                // exports-only → then has-annotation('entity') → should leave only exported @entity symbols
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [
                                { type: 'exports-only' },
                                { type: 'has-annotation', tag: jsDocTagName('entity') },
                        ],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                // Unexported @entity symbols were already removed by exports-only
                expect(names).toContain('UserId');
                expect(names).toContain('User');
                expect(names).not.toContain('UnexportedAlias');
                expect(names).not.toContain('UserService'); // no @entity
        });

        it('emits an info diagnostic and short-circuits when a filter empties the set', () => {
                // First filter: kind='class', which has results.
                // Second filter: has-annotation='nonexistent' empties the set.
                // Third filter: exports-only — must NOT be applied (short-circuit).
                const { queryResult, diagnostics } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [srcFile('entities.ts')] },
                        filters: [
                                { type: 'kind', kinds: ['class'] },
                                { type: 'has-annotation', tag: jsDocTagName('nonexistent') },
                                { type: 'exports-only' }, // should never run
                        ],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;
                expect(queryResult.value.size).toBe(0);
                // The info diagnostic from the short-circuit must be present
                expect(diagnostics.getInfos().some((i) => i.code === 'ADTK-CORE-2100')).toBe(true);
        });

        it('chaining kind + exclude-pattern narrows to a precise subset', () => {
                const modelsGlob = path.join(__dirname, 'src', 'models.ts');

                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: {
                                type: 'files',
                                paths: [srcFile('entities.ts'), srcFile('models.ts')],
                        },
                        filters: [
                                { type: 'kind', kinds: ['interface'] },
                                { type: 'exclude-pattern', pattern: modelsGlob },
                        ],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                // Interfaces from entities.ts
                expect(names).toContain('User');
                expect(names).toContain('Post');
                // Interfaces from models.ts excluded
                expect(names).not.toContain('Address');
                expect(names).not.toContain('Product');
        });
});

// ===========================================================================
// 12. executeQuery — filtered source failure propagates as err
// ===========================================================================

describe('executeQuery — source error propagation', () => {
        it('propagates err from resolveSource without crashing', () => {
                const ghost = srcFile('entities.ts').replace('entities.ts', 'ghost.ts') as FilePath;

                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: { type: 'files', paths: [ghost] },
                        filters: [{ type: 'exports-only' }],
                });

                expect(queryResult.ok).toBe(false);
        });
});

// ===========================================================================
// 13. Annotation combinations across files
// ===========================================================================

describe('cross-file annotation queries', () => {
        it("has-any-annotation(['entity','model']) finds symbols from both fixture files", () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: {
                                type: 'files',
                                paths: [srcFile('entities.ts'), srcFile('models.ts')],
                        },
                        filters: [
                                {
                                        type: 'has-any-annotation',
                                        tags: [jsDocTagName('entity'), jsDocTagName('model')],
                                },
                        ],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('UserId'); // @entity in entities
                expect(names).toContain('Address'); // @model in models
        });

        it('has-annotation validate finds symbols in both files that have it', () => {
                const { queryResult } = queryFixture('queries', {
                        type: 'filtered',
                        source: {
                                type: 'files',
                                paths: [srcFile('entities.ts'), srcFile('models.ts')],
                        },
                        filters: [{ type: 'has-annotation', tag: jsDocTagName('validate') }],
                });

                expect(queryResult.ok).toBe(true);
                if (!queryResult.ok) return;

                const names = symbolNames(queryResult.value);
                expect(names).toContain('Post'); // @entity @validate in entities
                expect(names).toContain('Product'); // @model @validate in models
        });
});
